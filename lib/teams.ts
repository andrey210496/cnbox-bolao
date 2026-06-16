// Catálogo de seleções: nome PT, apelidos (PT/EN/FIFA) e código ISO-2 da bandeira (flagcdn).
export type Team = { name: string; code: string };

type Entry = { pt: string; code: string; aliases: string[] };

const COUNTRIES: Entry[] = [
  { pt: "Brasil", code: "br", aliases: ["brazil", "bra"] },
  { pt: "Argentina", code: "ar", aliases: ["argentina", "arg"] },
  { pt: "França", code: "fr", aliases: ["france", "fra"] },
  { pt: "Inglaterra", code: "gb-eng", aliases: ["england", "eng"] },
  { pt: "Espanha", code: "es", aliases: ["spain", "esp"] },
  { pt: "Portugal", code: "pt", aliases: ["portugal", "por"] },
  { pt: "Alemanha", code: "de", aliases: ["germany", "ger"] },
  { pt: "Países Baixos", code: "nl", aliases: ["netherlands", "holland", "ned", "holanda"] },
  { pt: "Itália", code: "it", aliases: ["italy", "ita"] },
  { pt: "Bélgica", code: "be", aliases: ["belgium", "bel"] },
  { pt: "Croácia", code: "hr", aliases: ["croatia", "cro"] },
  { pt: "Uruguai", code: "uy", aliases: ["uruguay", "uru"] },
  { pt: "Marrocos", code: "ma", aliases: ["morocco", "mar"] },
  { pt: "Estados Unidos", code: "us", aliases: ["united states", "usa", "estados unidos"] },
  { pt: "México", code: "mx", aliases: ["mexico", "mex"] },
  { pt: "Canadá", code: "ca", aliases: ["canada", "can"] },
  { pt: "Japão", code: "jp", aliases: ["japan", "jpn"] },
  { pt: "Coreia do Sul", code: "kr", aliases: ["korea republic", "south korea", "kor", "coreia do sul"] },
  { pt: "Senegal", code: "sn", aliases: ["senegal", "sen"] },
  { pt: "Suíça", code: "ch", aliases: ["switzerland", "sui", "s02"] },
  { pt: "Dinamarca", code: "dk", aliases: ["denmark", "den"] },
  { pt: "Colômbia", code: "co", aliases: ["colombia", "col"] },
  { pt: "Equador", code: "ec", aliases: ["ecuador", "ecu"] },
  { pt: "Polônia", code: "pl", aliases: ["poland", "pol"] },
  { pt: "Sérvia", code: "rs", aliases: ["serbia", "srb"] },
  { pt: "Gana", code: "gh", aliases: ["ghana", "gha"] },
  { pt: "Camarões", code: "cm", aliases: ["cameroon", "cmr"] },
  { pt: "Austrália", code: "au", aliases: ["australia", "aus"] },
  { pt: "Catar", code: "qa", aliases: ["qatar", "qat"] },
  { pt: "Arábia Saudita", code: "sa", aliases: ["saudi arabia", "ksa", "sau"] },
  { pt: "Irã", code: "ir", aliases: ["iran", "ir iran", "irn"] },
  { pt: "Tunísia", code: "tn", aliases: ["tunisia", "tun"] },
  { pt: "Nigéria", code: "ng", aliases: ["nigeria", "nga"] },
  { pt: "Egito", code: "eg", aliases: ["egypt", "egy"] },
  { pt: "Argélia", code: "dz", aliases: ["algeria", "alg"] },
  { pt: "Costa do Marfim", code: "ci", aliases: ["ivory coast", "cote d'ivoire", "civ"] },
  { pt: "Áustria", code: "at", aliases: ["austria", "aut"] },
  { pt: "Escócia", code: "gb-sct", aliases: ["scotland", "sco"] },
  { pt: "País de Gales", code: "gb-wls", aliases: ["wales", "wal"] },
  { pt: "Ucrânia", code: "ua", aliases: ["ukraine", "ukr"] },
  { pt: "Turquia", code: "tr", aliases: ["turkey", "turkiye", "tur"] },
  { pt: "Paraguai", code: "py", aliases: ["paraguay", "par"] },
  { pt: "Peru", code: "pe", aliases: ["peru", "per"] },
  { pt: "Chile", code: "cl", aliases: ["chile", "chi"] },
  { pt: "Costa Rica", code: "cr", aliases: ["costa rica", "crc"] },
  { pt: "Panamá", code: "pa", aliases: ["panama", "pan"] },
  { pt: "Nova Zelândia", code: "nz", aliases: ["new zealand", "nzl"] },
  { pt: "Jordânia", code: "jo", aliases: ["jordan", "jor"] },
  { pt: "Uzbequistão", code: "uz", aliases: ["uzbekistan", "uzb"] },
  { pt: "África do Sul", code: "za", aliases: ["south africa", "rsa"] },
  { pt: "Honduras", code: "hn", aliases: ["honduras", "hon"] },
  { pt: "Jamaica", code: "jm", aliases: ["jamaica", "jam"] },
  { pt: "Cabo Verde", code: "cv", aliases: ["cape verde", "cabo verde", "cpv"] },
  { pt: "Curaçao", code: "cw", aliases: ["curacao", "cuw"] },
  { pt: "Noruega", code: "no", aliases: ["norway", "nor"] },
  { pt: "Suécia", code: "se", aliases: ["sweden", "swe"] },
  { pt: "Grécia", code: "gr", aliases: ["greece", "gre"] },
  { pt: "Nova Caledônia", code: "nc", aliases: ["new caledonia"] },
  { pt: "Haiti", code: "ht", aliases: ["haiti", "hai"] },
];

export const TEAMS: Team[] = COUNTRIES.map((c) => ({ name: c.pt, code: c.code }));

function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
}

const INDEX = new Map<string, Entry>();
for (const c of COUNTRIES) {
  INDEX.set(norm(c.pt), c);
  for (const a of c.aliases) INDEX.set(norm(a), c);
}

/** Resolve um nome (PT/EN/FIFA) para { name (PT), code }. Null se desconhecido. */
export function resolveTeam(input: string): Team | null {
  const c = INDEX.get(norm(input));
  return c ? { name: c.pt, code: c.code } : null;
}

export function teamName(code: string): string {
  return COUNTRIES.find((t) => t.code === code)?.pt ?? code;
}
