// Maps football-data.org team names to flag emoji. Emoji flags are plain
// Unicode characters (no image hosting, no licensing concerns) and render
// natively on every modern OS/browser.
const FLAGS: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Bolivia: "🇧🇴",
  "Bosnia and Herzegovina": "🇧🇦",
  "Bosnia & Herzegovina": "🇧🇦",
  "Bosnia-Herzegovina": "🇧🇦",
  Bosnia: "🇧🇦",
  Brazil: "🇧🇷",
  Cameroon: "🇨🇲",
  Canada: "🇨🇦",
  Chile: "🇨🇱",
  Colombia: "🇨🇴",
  "Costa Rica": "🇨🇷",
  Croatia: "🇭🇷",
  Curacao: "🇨🇼",
  Curaçao: "🇨🇼",
  "Czech Republic": "🇨🇿",
  Czechia: "🇨🇿",
  Denmark: "🇩🇰",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Greece: "🇬🇷",
  Haiti: "🇭🇹",
  Honduras: "🇭🇳",
  Iceland: "🇮🇸",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  "Ivory Coast": "🇨🇮",
  "Côte d'Ivoire": "🇨🇮",
  Jamaica: "🇯🇲",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  "Korea Republic": "🇰🇷",
  "South Korea": "🇰🇷",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Nigeria: "🇳🇬",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Peru: "🇵🇪",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Senegal: "🇸🇳",
  Serbia: "🇷🇸",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  Türkiye: "🇹🇷",
  Ukraine: "🇺🇦",
  "United States": "🇺🇸",
  USA: "🇺🇸",
  Uruguay: "🇺🇾",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  Uzbekistan: "🇺🇿",
  Algeria: "🇩🇿",
  "Cabo Verde": "🇨🇻",
  "Cape Verde": "🇨🇻",
  "Cape Verde Islands": "🇨🇻",
  "South Africa": "🇿🇦",
  "DR Congo": "🇨🇩",
  "Congo DR": "🇨🇩",
  Congo: "🇨🇬",
  "Republic of the Congo": "🇨🇬",
  "Democratic Republic of the Congo": "🇨🇩",
  "Democratic Republic Congo": "🇨🇩",
  Venezuela: "🇻🇪",
  Suriname: "🇸🇷",
  "New Caledonia": "🇳🇨",
};

// Lookup table keyed by a normalised form (lowercase, "&"/"-" treated as
// "and"/space, accents stripped) so small naming differences between data
// sources ("Bosnia & Herzegovina" vs "Bosnia and Herzegovina", "Cape Verde"
// vs "Cabo Verde", etc.) still resolve to the right flag.
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(FLAGS).map(([name, flag]) => [normalize(name), flag])
);

/** Returns a flag emoji for a team name, or a neutral placeholder if unknown. */
export function flagFor(teamName: string): string {
  return FLAGS[teamName] ?? NORMALIZED_FLAGS[normalize(teamName)] ?? "🏳️";
}
