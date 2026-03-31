/**
 * Маппинг русских названий городов → slug.
 * Используется для фидов AdvCake (поле region) и Admitad (поле city).
 */
const CITY_NAME_TO_SLUG: Record<string, string> = {
  "Москва": "moscow",
  "Санкт-Петербург": "saint-petersburg",
  "Казань": "kazan",
  "Новосибирск": "novosibirsk",
  "Екатеринбург": "ekaterinburg",
  "Нижний Новгород": "nizhny-novgorod",
  "Красноярск": "krasnoyarsk",
  "Челябинск": "chelyabinsk",
  "Самара": "samara",
  "Уфа": "ufa",
  "Ростов-на-Дону": "rostov-na-donu",
  "Краснодар": "krasnodar",
  "Омск": "omsk",
  "Воронеж": "voronezh",
  "Пермь": "perm",
  "Волгоград": "volgograd",
  "Саратов": "saratov",
  "Тюмень": "tyumen",
  "Тольятти": "tolyatti",
  "Ижевск": "izhevsk",
  "Барнаул": "barnaul",
  "Иркутск": "irkutsk",
  "Ульяновск": "ulyanovsk",
  "Хабаровск": "khabarovsk",
  "Владивосток": "vladivostok",
  "Ярославль": "yaroslavl",
  "Махачкала": "makhachkala",
  "Томск": "tomsk",
  "Оренбург": "orenburg",
  "Кемерово": "kemerovo",
  "Рязань": "ryazan",
  "Астрахань": "astrakhan",
  "Набережные Челны": "naberezhnye-chelny",
  "Пенза": "penza",
  "Липецк": "lipetsk",
  "Тула": "tula",
  "Киров": "kirov",
  "Чебоксары": "cheboksary",
  "Калининград": "kaliningrad",
  "Курск": "kursk",
  "Брянск": "bryansk",
  "Иваново": "ivanovo",
  "Тверь": "tver",
  "Белгород": "belgorod",
  "Сочи": "sochi",
  "Архангельск": "arkhangelsk",
  "Владимир": "vladimir",
  "Смоленск": "smolensk",
  "Калуга": "kaluga",
  "Орёл": "orel",
  "Орел": "orel",
  "Вологда": "vologda",
  "Мурманск": "murmansk",
  "Саранск": "saransk",
  "Тамбов": "tambov",
  "Йошкар-Ола": "yoshkar-ola",
  "Кострома": "kostroma",
  "Великий Новгород": "velikiy-novgorod",
  "Сургут": "surgut",
  "Нижневартовск": "nizhnevartovsk",
  "Псков": "pskov",
  "Новороссийск": "novorossiysk",
  "Петрозаводск": "petrozavodsk",
  "Сыктывкар": "syktyvkar",
  "Якутск": "yakutsk",
  "Абакан": "abakan",
  "Волжский": "volzhsky",
  "Подольск": "podolsk",
  "Балашиха": "balashikha",
  "Таганрог": "taganrog",
  "Новокузнецк": "novokuznetsk",
  "Череповец": "cherepovets",
  "Курган": "kurgan",
  "Благовещенск": "blagoveshchensk",
  "Стерлитамак": "sterlitamak",
  "Дзержинск": "dzerzhinsk",
  "Нижний Тагил": "nizhniy-tagil",
  "Армавир": "armavir",
  "Ангарск": "angarsk",
  "Старый Оскол": "stary-oskol",
  "Химки": "khimki",
  "Мытищи": "mytishchi",
  "Люберцы": "lyubertsy",
  "Одинцово": "odintsovo",
  "Красногорск": "krasnogorsk",
  "Королёв": "korolyov",
  "Домодедово": "domodedovo",
  "Анапа": "anapa",
  "Геленджик": "gelendzhik",
  "Кисловодск": "kislovodsk",
  "Пятигорск": "pyatigorsk",
  "Ставрополь": "stavropol",
  "Улан-Удэ": "ulan-ude",
  "Чита": "chita",
  "Тихвин": "tikhvin",
  "Выборг": "vyborg",
  "Гатчина": "gatchina",
  "Петергоф": "petergof",
  "Пушкин": "pushkin",
  "Кронштадт": "kronshtadt",
  "Зеленоград": "zelenograd",
  "Троицк": "troitsk",
  "Владикавказ": "vladikavkaz",
  "Грозный": "grozny",
  "Нальчик": "nalchik",
};

/**
 * Транслитерация для неизвестных городов.
 */
function transliterateCity(name: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return name
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Конвертирует русское название города в slug.
 * Если город не в маппинге, транслитерирует автоматически.
 */
export function cityNameToSlug(cityName: string): string {
  const trimmed = cityName.trim();
  const mapped = CITY_NAME_TO_SLUG[trimmed];
  if (mapped) return mapped;

  // Попробовать без "ская область", "ский край" и т.п.
  const cleaned = trimmed
    .replace(/ская область$/i, "")
    .replace(/ский край$/i, "")
    .replace(/ая область$/i, "")
    .trim();
  const mappedClean = CITY_NAME_TO_SLUG[cleaned];
  if (mappedClean) return mappedClean;

  return transliterateCity(trimmed);
}
