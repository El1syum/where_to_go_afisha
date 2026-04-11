import https from "https";
import { SocksProxyAgent } from "socks-proxy-agent";
import { prisma } from "@/lib/db";

const SETTING_KEY = "telegram_proxy";

/**
 * Parse "host:port:user:password" → socks5h://user:password@host:port
 * socks5h forces remote DNS resolution (critical when local DNS returns
 * a blocked IP, as with api.telegram.org in some RU datacenters).
 */
function toSocksUrl(value: string): string | null {
  const parts = value.trim().split(":");
  if (parts.length < 2) return null;
  const [host, port, user, pass] = parts;
  if (!host || !port) return null;
  if (user && pass) return `socks5h://${user}:${pass}@${host}:${port}`;
  return `socks5h://${host}:${port}`;
}

/**
 * Send a request to Telegram Bot API, routing through SOCKS5 proxy if configured.
 * Drop-in replacement for fetch("https://api.telegram.org/bot.../method", opts).
 */
export async function telegramFetch(url: string, init: RequestInit): Promise<Response> {
  const proxySetting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  const proxyValue = proxySetting?.value?.trim();

  // No proxy — use direct fetch
  if (!proxyValue) {
    return fetch(url, init);
  }

  const socksUrl = toSocksUrl(proxyValue);
  if (!socksUrl) {
    return fetch(url, init);
  }

  const agent = new SocksProxyAgent(socksUrl);

  // Use Node.js https module with the SOCKS agent
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isMultipart = init.body instanceof FormData;

    // For multipart (FormData), we need to serialize it manually
    // Since we can't easily pipe FormData through https.request,
    // use a two-step: serialize body first, then send
    let bodyBuffer: Buffer | string | undefined;
    let contentType = (init.headers as Record<string, string>)?.["Content-Type"];

    if (isMultipart) {
      // Fallback: try direct fetch (it might work for some proxies)
      // For SOCKS proxy with FormData, use the agent with node-fetch style
      const boundary = "----TgProxy" + Math.random().toString(36).slice(2);
      contentType = `multipart/form-data; boundary=${boundary}`;
      const parts: Buffer[] = [];
      const fd = init.body as FormData;
      const entries = Array.from(fd.entries());

      const buildMultipart = async () => {
        for (const [key, value] of entries) {
          parts.push(Buffer.from(`--${boundary}\r\n`));
          if (typeof value === "string") {
            parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
          } else {
            const blob = value as Blob;
            const arrayBuf = await blob.arrayBuffer();
            const filename = (value as File).name || "file";
            parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="${filename}"\r\nContent-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`));
            parts.push(Buffer.from(arrayBuf));
            parts.push(Buffer.from("\r\n"));
          }
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        return Buffer.concat(parts);
      };

      buildMultipart().then((multipartBody) => {
        doRequest(parsedUrl, agent, init.method || "POST", contentType!, multipartBody, resolve, reject);
      }).catch(reject);
      return;
    }

    bodyBuffer = typeof init.body === "string" ? init.body : undefined;
    doRequest(parsedUrl, agent, init.method || "POST", contentType || "application/json", bodyBuffer, resolve, reject);
  });
}

function doRequest(
  url: URL,
  agent: SocksProxyAgent,
  method: string,
  contentType: string,
  body: Buffer | string | undefined,
  resolve: (r: Response) => void,
  reject: (e: Error) => void,
) {
  const req = https.request(
    {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      agent,
      headers: {
        "Content-Type": contentType,
        ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
      },
    },
    (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString();
        resolve(
          new Response(responseBody, {
            status: res.statusCode || 200,
            headers: res.headers as Record<string, string>,
          })
        );
      });
    }
  );

  req.on("error", reject);
  req.setTimeout(30000, () => {
    req.destroy();
    reject(new Error("Telegram API request timeout"));
  });

  if (body) req.write(body);
  req.end();
}
