// Generates public/translations.json: German renderings of person names,
// houses and regions, plus UI strings. Person names are derived with
// dictionaries below (regnal given names, epithets, places, titles) which
// mirrors standard German usage ("Heinrich VIII.", "Eduard der Bekenner").
// The output is plain data — hand-edit translations.json afterwards to taste.
import { readFile, writeFile } from "node:fs/promises";

const GIVEN = {
  William: "Wilhelm", Henry: "Heinrich", Charles: "Karl", George: "Georg",
  Frederick: "Friedrich", Louis: "Ludwig", John: "Johann", Edward: "Eduard",
  James: "Jakob", Richard: "Richard", Edmund: "Edmund", Edgar: "Edgar",
  Alfred: "Alfred", Stephen: "Stephan", Matilda: "Mathilde", Eleanor: "Eleonore",
  Margaret: "Margarete", Mary: "Maria", Anne: "Anna", Catherine: "Katharina",
  Victoria: "Viktoria", Joanna: "Johanna", Francis: "Franz", Nicholas: "Nikolaus",
  Sophia: "Sophia", Augusta: "Auguste", Caroline: "Karoline", Philip: "Philipp",
  Philippa: "Philippa", Isabella: "Isabella", Maximilian: "Maximilian",
  Joseph: "Joseph", Leopold: "Leopold", Ferdinand: "Ferdinand", Albert: "Albert",
  Christian: "Christian", Peter: "Peter", Paul: "Paul", Alexander: "Alexander",
  Margrethe: "Margarethe", Haakon: "Haakon", Olav: "Olav", Harald: "Harald",
  Beatrix: "Beatrix", Wilhelmina: "Wilhelmina", Juliana: "Juliana",
  Constantine: "Konstantin", Rudolf: "Rudolf", Otto: "Otto",
  Elizabeth: "Elisabeth", Hugh: "Hugo", Theresa: "Theresia", Lothair: "Lothar",
};
// Female given names (for gendered epithet articles) and female title words.
const FEM_NAMES = new Set([
  "Matilda","Empress","Eleanor","Philippa","Isabella","Margaret","Mary","Anne",
  "Catherine","Jane","Elizabeth","Victoria","Alexandra","Alice","Beatrice",
  "Sophia","Sophie","Caroline","Charlotte","Augusta","Joanna","Marie","Maria",
  "Anna","Dagmar","Alix","Maud","Helena","Louise","Louisa","Wilhelmina",
  "Juliana","Beatrix","Margrethe","Sofía","Letizia","Leonor","Carlota",
  "Elena","Estelle","Ingrid","Catharina-Amalia","Elisabeth","Margarethe",
  "Bertrada","Rotrude","Hildegard","Judith","Jeanne","Anne-Marie","Olenna",
  "Cersei","Daenerys","Sansa","Arya","Catelyn","Lyanna","Rhaenyra","Alysanne",
  "Visenya","Rhaella","Helaena","Galadriel","Arwen","Éowyn","Lúthien","Melian",
  "Idril","Elwing","Celebrían","Margaery","Asha","Lysa","Joanna","Selyse",
  "Alicent","Shireen","Myrcella","Arianne","Elia","Rhaenys",
]);
const FEM_TITLES = /Queen|Empress|Princess|Duchess|Countess|Lady|Archduchess/;

const TITLES = {
  Empress: "Kaiserin", Emperor: "Kaiser", King: "König", Queen: "Königin",
  Prince: "Prinz", Princess: "Prinzessin", Archduke: "Erzherzog",
  Archduchess: "Erzherzogin", Duke: "Herzog", Duchess: "Herzogin",
  Count: "Graf", Countess: "Gräfin", Lord: "Lord", Lady: "Lady",
  Saint: "Heilige", "Crown Prince": "Kronprinz", "Grand Duke": "Großherzog",
};

const PLACES = {
  France: "Frankreich", Spain: "Spanien", Aragon: "Aragón", Castile: "Kastilien",
  Denmark: "Dänemark", Sweden: "Schweden", Norway: "Norwegen", Greece: "Griechenland",
  Russia: "Russland", Bavaria: "Bayern", Scotland: "Schottland", Wales: "Wales",
  England: "England", Hesse: "Hessen", Flanders: "Flandern", Hainault: "Hennegau",
  Hanover: "Hannover",
  Aquitaine: "Aquitanien", Valois: "Valois", Teck: "Teck", Battenberg: "Battenberg",
  Connaught: "Connaught", Austria: "Österreich", Portugal: "Portugal",
  "the Palatinate": "der Pfalz", "the Netherlands": "den Niederlanden",
  "Saxe-Coburg-Saalfeld": "Sachsen-Coburg-Saalfeld",
  "Mecklenburg-Strelitz": "Mecklenburg-Strelitz", "Saxe-Gotha": "Sachsen-Gotha",
};

// Epithets: "the X" -> gendered German.
const EPITHETS = {
  Great: ["der Große", "die Große"], Bald: ["der Kahle", "die Kahle"],
  Pious: ["der Fromme", "die Fromme"], Simple: ["der Einfältige", "die Einfältige"],
  Fat: ["der Dicke", "die Dicke"], Young: ["der Junge", "die Junge"],
  Conqueror: ["der Eroberer", "die Eroberin"], Confessor: ["der Bekenner", "die Bekennerin"],
  Unready: ["der Ratlose", "die Ratlose"], Fair: ["der Schöne", "die Schöne"],
  Wise: ["der Weise", "die Weise"], Mad: ["der Wahnsinnige", "die Wahnsinnige"],
  Bold: ["der Kühne", "die Kühne"], Good: ["der Gute", "die Gute"],
  Handsome: ["der Schöne", "die Schöne"], Affable: ["der Freundliche", "die Freundliche"],
  Victorious: ["der Siegreiche", "die Siegreiche"], Prudent: ["der Kluge", "die Kluge"],
  Indolent: ["der Faule", "die Faule"], Stammerer: ["der Stammler", "die Stammlerin"],
  Cruel: ["der Grausame", "die Grausame"], Lionheart: ["Löwenherz", "Löwenherz"],
  Strong: ["der Starke", "die Starke"], Pacific: ["der Friedfertige", "die Friedfertige"],
  Elder: ["der Ältere", "die Ältere"],
};

// Multi-word phrases replaced verbatim before everything else.
const PHRASES = {
  "the Sun King": "der Sonnenkönig", "the Great Elector": "der Große Kurfürst",
  "the Black Prince": "der Schwarze Prinz", "the Young Dragon": "der junge Drache",
  "the Old Took": "der Alte Tuk", "the Mad King": "der Irre König",
  "the Mariner": "der Seefahrer", "the Conciliator": "der Schlichter",
  "the Unworthy": "der Unwürdige", "the Unlikely": "der Unwahrscheinliche",
  "the Blessed": "der Gesegnete", "the Dragonbane": "der Drachentod",
  "the Beggar King": "der Bettelkönig", "the Tall": "der Lange",
  "the Deathless": "der Unsterbliche", "the White": "die Weiße",
  "the Daring": "der Kühne", "the Brave": "der Tapfere", "Last-king": "letzter König",
  "of Scots": "der Schotten", "the Indolent": "der Träge",
  "the Swan King": "der Schwanenkönig", "the Exile": "der Verbannte",
  "the Gaffer": "der Ohm", "of the Vinzgau": "von den Vinzgau",
};
// Single-token surnames / sobriquets, replaced wherever they appear.
const WORD = {
  Oakenshield: "Eichenschild", Ironfoot: "Eisenfuß", Stonehelm: "Steinhelm",
  Snow: "Schnee", Stormborn: "Sturmtochter", Greyjoy: "Graufreud",
  Baggins: "Beutlin", Took: "Tuk", Brandybuck: "Brandybock", Gamgee: "Gamdschie",
  Cotton: "Kattun", Samwise: "Samweis", Meriadoc: "Meriadoc",
};

function isFemale(p) {
  if (FEM_TITLES.test(p.title || "")) return true;
  const first = (p.name || "").split(/[\s,]/)[0];
  return FEM_NAMES.has(first);
}

const ROMAN = /^(?=[MDCLXVI])M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/;

function translateName(p) {
  let name = p.name;
  const fem = isFemale(p);

  // 1. Multi-word phrases (verbatim).
  for (const [en, de] of Object.entries(PHRASES)) name = name.split(en).join(de);

  // 2. "the <Epithet>" phrases.
  name = name.replace(/\bthe ([A-Z][a-zA-Z]+)\b/g, (m, word) =>
    EPITHETS[word] ? EPITHETS[word][fem ? 1 : 0] : m
  );

  // 3. "of [the] <Place>" -> "von <Place>".
  name = name.replace(/\bof ((?:the )?[A-ZÉ][\wÀ-ÿ-]*(?: [A-ZÉ][\wÀ-ÿ-]*)*)/g, (m, place) =>
    "von " + (PLACES[place] || place)
  );

  // 4. Leading / post-comma title words.
  name = name.replace(
    /\b(Crown Prince|Grand Duke|Empress|Emperor|King|Queen|Prince|Princess|Archduke|Archduchess|Duke|Duchess|Count|Countess|Lord|Lady|Saint)\b/g,
    (m) => TITLES[m] || m
  );

  // 5. Token pass: given names, surnames, ordinal periods.
  const stop = /^(von|der|die|das)$/;
  const out = [];
  let stillName = true;
  for (const tok of name.split(" ")) {
    const clean = tok.replace(/[.,()]/g, "");
    const punct = tok.slice(clean.length === tok.length ? tok.length : tok.indexOf(clean) + clean.length);
    const trail = tok.endsWith(",") ? "," : "";
    if (stop.test(clean)) stillName = false;
    if (ROMAN.test(clean) && /[IVXLC]/.test(clean)) {
      out.push(clean + "."); // German writes "Heinrich VIII."
      stillName = false;
    } else if (WORD[clean]) {
      out.push(WORD[clean] + trail);
    } else if (stillName && GIVEN[clean]) {
      out.push(GIVEN[clean] + trail);
    } else {
      out.push(tok);
    }
  }
  return out.join(" ").replace(/\s+\./g, ".").replace(/\.\./g, ".");
}

// House and region maps (only entries that differ from the original).
const HOUSES = {
  Hanover: "Hannover", "Saxe-Coburg-Gotha": "Sachsen-Coburg und Gotha",
  Capet: "Kapetinger", Carolingian: "Karolinger", Robertian: "Robertiner",
  Valois: "Valois", Normandy: "Normandie", Savoy: "Savoyen", Welf: "Welfen",
  Flanders: "Flandern", Romanov: "Romanow",
  "Holstein-Gottorp-Romanov": "Holstein-Gottorp-Romanow",
  "Habsburg-Lorraine": "Habsburg-Lothringen", Lorraine: "Lothringen",
  "Hesse-Darmstadt": "Hessen-Darmstadt", "Orange-Nassau": "Oranien-Nassau",
  Braganza: "Bragança",
  // Middle-earth houses (German editions)
  "House of Finwë": "Haus Finwë", "House of Elros": "Haus Elros",
  "House of Elendil": "Haus Elendil", "House of Húrin (Stewards)": "Haus Húrin (Truchsesse)",
  "House of Dol Amroth": "Haus Dol Amroth", "House of Eorl": "Haus Eorl",
  "House of Hador": "Haus Hador", "House of Bëor": "Haus Bëor",
  "Durin's Folk": "Durins Volk", "Half-elven": "Halbelben",
  Baggins: "Beutlin", Took: "Tuk", Brandybuck: "Brandybock", Gamgee: "Gamdschie",
  Cotton: "Kattun", Sindar: "Sindar", Ainur: "Ainur",
  // Westeros houses
  Targaryen: "Haus Targaryen", Stark: "Haus Stark", Lannister: "Haus Lannister",
  Baratheon: "Haus Baratheon", Tully: "Haus Tully", Arryn: "Haus Arryn",
  Martell: "Haus Martell", Tyrell: "Haus Tyrell", Greyjoy: "Haus Graufreud",
  Hightower: "Haus Hohenturm", Velaryon: "Haus Velaryon", Florent: "Haus Florent",
};
const REGIONS = {
  "United Kingdom": "Vereinigtes Königreich", France: "Frankreich", Spain: "Spanien",
  Russia: "Russland", Germany: "Deutschland", Austria: "Österreich",
  Denmark: "Dänemark", Sweden: "Schweden", Norway: "Norwegen",
  Netherlands: "Niederlande", Belgium: "Belgien", Italy: "Italien",
  Portugal: "Portugal", Greece: "Griechenland",
  // Fantasy regions
  "The North": "Der Norden", "The Westerlands": "Die Westlande",
  "The Stormlands": "Die Sturmlande", "The Riverlands": "Die Flusslande",
  "The Vale": "Das Grüne Tal", "The Iron Islands": "Die Eiseninseln",
  "The Reach": "Die Weite", Dorne: "Dorne", "King's Landing": "Königsmund",
  "The Shire": "Das Auenland", Rivendell: "Bruchtal", Gondor: "Gondor",
  Rohan: "Rohan", Mordor: "Mordor", Buckland: "Bockland",
};

const UI = {
  en: {
    subtitle_brand: "Interactive linked family trees",
    allRealms: "All realms", reset: "Reset",
    searchPlaceholder: "Search a person…",
    legendHouses: "Houses", legendHint: "Click a house to highlight it.",
    lived: "Lived", house: "House", realm: "Realm",
    parents: "Parents", married: "Married", children: "Children",
    wiki: "Read on Wikipedia ↗", people: "people", houses: "houses",
    keyParent: "parent → child", keyMarriage: "marriage",
    tip: "Scroll to zoom · drag to pan · click a person for details",
    worldTitle: "Switch between worlds", countryTitle: "Jump to a country/region",
    langTitle: "Language",
  },
  de: {
    subtitle_brand: "Interaktive, verknüpfte Stammbäume",
    allRealms: "Alle Reiche", reset: "Zurücksetzen",
    searchPlaceholder: "Person suchen…",
    legendHouses: "Häuser", legendHint: "Auf ein Haus klicken zum Hervorheben.",
    lived: "Lebte", house: "Haus", realm: "Reich",
    parents: "Eltern", married: "Vermählt", children: "Kinder",
    wiki: "Auf Wikipedia lesen ↗", people: "Personen", houses: "Häuser",
    keyParent: "Eltern → Kind", keyMarriage: "Ehe",
    tip: "Scrollen zum Zoomen · ziehen zum Verschieben · Person anklicken für Details",
    worldTitle: "Zwischen Welten wechseln", countryTitle: "Zu einem Land/einer Region springen",
    langTitle: "Sprache",
  },
};

const people = {};
for (const file of ["royals.json", "middle-earth.json", "westeros.json"]) {
  const data = JSON.parse(await readFile(new URL(`../public/${file}`, import.meta.url)));
  for (const p of data.people) {
    const de = translateName(p);
    if (de !== p.name) people[p.id] = de;
  }
}

await writeFile(
  new URL("../public/translations.json", import.meta.url),
  JSON.stringify({ ui: UI, houses: HOUSES, regions: REGIONS, people }, null, 2) + "\n"
);
console.log("Wrote translations.json —", Object.keys(people).length, "person names");
