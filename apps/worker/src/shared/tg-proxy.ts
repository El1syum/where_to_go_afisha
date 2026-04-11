import http from "http";
import https from "https";
import { SocksProxyAgent } from "socks-proxy-agent";
import { prisma } from "./db.js";
import { logger } from "./logger.js";

let proxyServer: http.Server | null = null;
let currentApiRoot: string | null = null;
let cachedProxyValue: string | null = null;

const SETTING_KEY = "telegram_proxy";
const DEFAULT_PROXY = "95.81.97.97:1081:lse:181125nov";

/**
 * Parse "host:port:user:password" → socks5://user:password@host:port
 */
function toSocksUrl(value: string): string | null {
  const parts = value.trim().split(":");
  if (parts.length < 2) return null;
  const [host, port, user, pass] = parts;
  if (!host || !port) return null;
  if (user && pass) return `socks5://${user}:${pass}@${host}:${port}`;
  return `socks5://${host}:${port}`;
}

/**
 * Read current proxy setting from DB. Seeds default if missing.
 */
async function readProxySetting(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (setting) return setting.value;

  // Seed default
  await prisma.setting.create({
    data: { key: SETTING_KEY, value: DEFAULT_PROXY, description: "SOCKS5 прокси для Telegram API (host:port:user:password)" },
  });
  return DEFAULT_PROXY;
}

/**
 * Start (or restart) the local HTTP→SOCKS→api.telegram.org proxy.
 * Returns the apiRoot URL (e.g. "http://127.0.0.1:54321") for grammy.
 * If proxy is empty/disabled, returns null (use direct connection).
 */
export async function ensureTelegramProxy(): Promise<string | null> {
  const value = await readProxySetting();

  // If proxy cleared — disable
  if (!value.trim()) {
    stopProxy();
    return null;
  }

  // If same config — reuse
  if (value === cachedProxyValue && proxyServer?.listening && currentApiRoot) {
    return currentApiRoot;
  }

  // Stop old server
  stopProxy();

  const socksUrl = toSocksUrl(value);
  if (!socksUrl) {
    logger.warn(`Invalid telegram_proxy format: "${value}". Expected host:port:user:password`);
    return null;
  }

  try {
    const agent = new SocksProxyAgent(socksUrl);

    // Quick connectivity check
    await testSocksConnection(agent);

    const server = http.createServer((req, res) => {
      const url = `https://api.telegram.org${req.url}`;

      const proxyReq = https.request(
        url,
        {
          method: req.method,
          headers: { ...req.headers, host: "api.telegram.org" },
          agent,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on("error", (err) => {
        logger.error({ err: err.message }, "Telegram proxy request error");
        if (!res.headersSent) {
          res.writeHead(502);
          res.end(JSON.stringify({ ok: false, description: `Proxy error: ${err.message}` }));
        }
      });

      req.pipe(proxyReq);
    });

    const apiRoot = await new Promise<string>((resolve, reject) => {
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as { port: number };
        resolve(`http://127.0.0.1:${addr.port}`);
      });
    });

    proxyServer = server;
    currentApiRoot = apiRoot;
    cachedProxyValue = value;

    logger.info({ apiRoot, proxy: value.replace(/:[^:]+$/, ":***") }, "Telegram SOCKS proxy started");
    return apiRoot;
  } catch (err) {
    logger.error(err, "Failed to start Telegram SOCKS proxy, using direct connection");
    return null;
  }
}

function testSocksConnection(agent: SocksProxyAgent): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://api.telegram.org/",
      { agent, timeout: 10000 },
      (res) => {
        res.resume();
        resolve();
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("SOCKS proxy connection timeout"));
    });
    req.end();
  });
}

function stopProxy() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
    currentApiRoot = null;
    cachedProxyValue = null;
  }
}
