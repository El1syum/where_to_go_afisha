/**
 * Маппинг русских названий городов → slug.
 * Используется для фидов AdvCake (поле region) и Admitad (поле city).
 */
const CITY_NAME_TO_SLUG: Record<string, string> = {
  // Города-миллионники
  "Москва": "moscow",
  "Санкт-Петербург": "saint-petersburg",
  "Казань": "kazan",
  "Новосибирск": "novosibirsk",
  "Екатеринбург": "yekaterinburg",
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
  // Крупные города
  "Саратов": "saratov",
  "Тюмень": "tyumen",
  "Тольятти": "togliatti",
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
  "Астрахань": "astrahan",
  "Набережные Челны": "naberezhnie-chelny",
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
  "Архангельск": "arhangelsk",
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
  "Великий Новгород": "veliky-novgorod",
  "Сургут": "surgut",
  "Нижневартовск": "nizhnevartovsk",
  "Псков": "pskov",
  "Новороссийск": "novorossiysk",
  "Петрозаводск": "petrozavodsk",
  "Сыктывкар": "syktyvkar",
  "Якутск": "yakutsk",
  "Абакан": "abakan",
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
  "Старый Оскол": "stariy-oskol",
  // Подмосковье и города-спутники
  "Химки": "khimki",
  "Мытищи": "mytishchi",
  "Люберцы": "lyubertsy",
  "Одинцово": "odintsovo",
  "Красногорск": "krasnogorsk",
  "Королёв": "korolev",
  "Королев": "korolev",
  "Подольск": "podolsk",
  "Балашиха": "balashikha",
  "Домодедово": "domodedovo",
  "Зеленоград": "zelenograd",
  "Пушкино": "pushkino",
  "Щёлково": "shchelkovo",
  "Щелково": "shchelkovo",
  "Видное": "vidnoe",
  "Орехово-Зуево": "orehovo-zuevo",
  "Электросталь": "elektrostal",
  "Ногинск": "noginsk",
  "Сергиев Посад": "sergiev-posad",
  "Раменское": "ramenskoe",
  "Жуковский": "zhukovskiy",
  "Реутов": "reutov",
  "Дмитров": "dmitrov",
  "Дубна": "dubna",
  "Фрязино": "fryazino",
  "Коломна": "kolomna",
  "Воскресенск": "voskresensk",
  "Ступино": "stupino",
  "Истра": "istra",
  "Нара-Фоминск": "naro-fominsk",
  "Наро-Фоминск": "naro-fominsk",
  "Павловский Посад": "pavlovskiy-posad",
  // Курорты
  "Анапа": "anapa",
  "Геленджик": "gelendgik",
  "Кисловодск": "kislovodsk",
  "Пятигорск": "pyatigorsk",
  "Ессентуки": "essentuki",
  "Ставрополь": "stavropol",
  "Ялта": "yalta",
  "Феодосия": "feodosia",
  "Симферополь": "simferopol",
  "Севастополь": "sevastopol",
  "Алушта": "alushta",
  "Лазаревское": "lazarevskoe",
  "Туапсе": "tuapse",
  // Пригороды СПб
  "Гатчина": "gatchina",
  "Петергоф": "petergof",
  "Пушкин": "pushkin",
  "Выборг": "vyborg",
  "Всеволожск": "vsevolozhsk",
  "Кронштадт": "kronshtadt",
  "Кириши": "kirishi",
  // Сибирь и Дальний Восток
  "Улан-Удэ": "ulan-ude",
  "Чита": "chita",
  "Магадан": "magadan",
  "Норильск": "norilsk",
  "Южно-Сахалинск": "sakhalinsk",
  "Петропавловск-Камчатский": "petropavlovsk-kamchatsky",
  "Комсомольск-на-Амуре": "komsomolsk_na_amure",
  "Уссурийск": "ussuriysk",
  "Братск": "bratsk",
  "Находка": "nahodka",
  "Артём": "artem",
  "Арзамас": "arzamas",
  // Урал
  "Магнитогорск": "magnitogorsk",
  "Миасс": "miass",
  "Первоуральск": "pervouralsk",
  "Златоуст": "zlatoust",
  "Серов": "serov",
  // Поволжье
  "Волжский": "volgograd",
  "Нефтекамск": "nephtekamsk",
  "Нижнекамск": "nizhnekamsk",
  "Альметьевск": "almetyevsk",
  "Бугульма": "bugulma",
  "Сызрань": "sizran",
  "Новочебоксарск": "cheboksary",
  "Димитровград": "dimitrovgrad",
  "Балаково": "balakovo",
  // Север
  "Ханты-Мансийск": "khanty-mansiysk",
  "Нефтеюганск": "nefteugansk",
  "Ноябрьск": "noyabrsk",
  "Новый Уренгой": "noviy-urengoy",
  "Северодвинск": "severodvinsk",
  "Ухта": "uhta",
  "Салехард": "salekhard",
  // Юг
  "Майкоп": "maykop",
  "Элиста": "elista",
  "Дербент": "derbent",
  "Владикавказ": "vladikavkaz",
  "Грозный": "grozniy",
  "Нальчик": "nalchik",
  "Шахты": "shakhty",
  "Новочеркасск": "novocherkassk",
  "Волгодонск": "volgodonsk",
  "Троицк": "troitsk",
  // Средние города
  "Обнинск": "obninsk",
  "Муром": "murom",
  "Ковров": "kovrov",
  "Звенигород": "zvenigorod",
  "Минеральные Воды": "mineralnye-vody",
  "Кунгур": "kungur",
  "Тихвин": "tikhvin",
  "Зеленодольск": "zelenodolsk",
  "Рыбинск": "rybinsk",
  "Тобольск": "tobolsk",
  "Чехов": "chehov",
  "Клин": "klin",
  "Октябрьский": "oktyabrsky",
  "Салават": "salavat",
  "Светлогорск": "svetlogorsk",
  "Кудымкар": "kudimkar",
  "Мичуринск": "michurinsk",
  "Новомосковск": "novomoskovsk",
  "Ейск": "yesk",
  "Солнечногорск": "solnechnogorsk",
  // Казахстан
  "Алматы": "almaty",
  "Астана": "astana",
  "Актау": "aktau",
  "Актобе": "aktobe",
  "Атырау": "atyrau",
  "Караганда": "karaganda",
  "Шымкент": "chimkent",
  "Семей": "semey",
  "Костанай": "kostanai",
  "Усть-Каменогорск": "ust-kamenogorsk",
  "Темиртау": "temirtau",
  // Регионы → столицы (для фидов, которые указывают регион вместо города)
  "Самарская область": "samara",
  "Нижегородская область": "nizhny-novgorod",
  "Кузбасс": "kemerovo",
  "Кемеровская область": "kemerovo",
  "Калужская область": "kaluga",
  "Амурская область": "blagoveshchensk",
  "Сахалин": "sakhalinsk",
  "Сахалинская область": "sakhalinsk",
  "Республика Коми": "syktyvkar",
  "Республика Дагестан": "makhachkala",
  "Республика Адыгея": "maykop",
  "ХМАО": "khanty-mansiysk",
  "ЯНАО": "salekhard",
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
