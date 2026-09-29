import type { SkillBundleFontMap } from "@/lib/types/skill-bundle";
import type { FontRoles } from "@/lib/types/extraction";

const DEFAULT_FONT = "Inter";
const DEFAULT_BODY_FONT = "Inter";

const PROPRIETARY_SUBSTITUTIONS: Record<string, string> = {
  "airbnb cereal vf": "Inter",
  "airbnb cereal app": "Inter",
  "airbnb cereal": "Inter",
  "sf pro": "Inter",
  "sf pro display": "Inter",
  "sf pro text": "Inter",
  "sf pro rounded": "Manrope",
  "san francisco": "Inter",
  "cera pro": "Manrope",
  "cera": "Manrope",
  "apercu": "Manrope",
  "apercu pro": "Manrope",
  "whitney": "Inter",
  "gilroy": "Manrope",
  "soehne": "Inter",
  "soehne mono": "JetBrains Mono",
  "söhne": "Inter",
  "founders grotesk": "Space Grotesk",
  "neue haas grotesk": "Inter",
  "neue haas unica": "Inter",
  "neue haas": "Inter",
  "helvetica": "Inter",
  "helvetica neue": "Inter",
  "akzidenz-grotesk": "Inter",
  "akzidenz grotesk": "Inter",
  "graphik": "Inter",
  "gt america": "Inter",
  "gt walsheim": "Manrope",
  "gt sectra": "Playfair Display",
  "gt super": "Playfair Display",
  "circular": "Manrope",
  "circular std": "Manrope",
  "circular pro": "Manrope",
  "lyon display": "Playfair Display",
  "lyon text": "Lora",
  "tiempos": "Lora",
  "tiempos headline": "Playfair Display",
  "tiempos text": "Lora",
  "national 2": "Inter",
  "messina sans": "Inter",
  "value sans": "Inter",
  "monument extended": "Bebas Neue",
  "monument grotesk": "Space Grotesk",
  "px grotesk": "Space Grotesk",
  "neue plak": "Inter",
  "matter": "Manrope",
  "untitled sans": "Inter",
  "untitled serif": "Lora",
  "calibre": "Inter",
  "ibm plex": "IBM Plex Sans",
  "stripe sans": "Inter",
  "uber move": "Manrope",
  "shopify sans": "Inter",
  "polysans": "Manrope",
  "obviously": "Bricolage Grotesque",
};

const KEYWORD_SUBSTITUTIONS: Array<{ pattern: RegExp; result: string }> = [
  { pattern: /grotesk|grotesque/i, result: "Space Grotesk" },
  { pattern: /serif|tiempos|playfair|lyon|garamond/i, result: "Playfair Display" },
  { pattern: /mono|code/i, result: "JetBrains Mono" },
  { pattern: /display|headline/i, result: "Bebas Neue" },
];

const SYSTEM_FONT_TOKENS = new Set([
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "sans-serif",
  "serif",
  "monospace",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "apple color emoji",
  "segoe ui emoji",
  "arial",
  "times",
  "times new roman",
  "courier",
  "courier new",
  "georgia",
  "verdana",
  "tahoma",
]);

const KNOWN_GOOGLE_FONTS = new Set(
  [
    "Inter",
    "Manrope",
    "Roboto",
    "Open Sans",
    "Poppins",
    "DM Sans",
    "DM Mono",
    "Plus Jakarta Sans",
    "Public Sans",
    "Source Sans 3",
    "Source Code Pro",
    "IBM Plex Sans",
    "IBM Plex Mono",
    "IBM Plex Serif",
    "Space Grotesk",
    "Space Mono",
    "JetBrains Mono",
    "Fira Code",
    "Fira Sans",
    "Geist",
    "Geist Mono",
    "Sora",
    "Outfit",
    "Onest",
    "Lexend",
    "Bricolage Grotesque",
    "Figtree",
    "Hanken Grotesk",
    "Montserrat",
    "Lato",
    "Raleway",
    "Nunito",
    "Nunito Sans",
    "Work Sans",
    "Karla",
    "Rubik",
    "Ubuntu",
    "Merriweather",
    "Playfair Display",
    "Cormorant Garamond",
    "Fraunces",
    "Newsreader",
    "Spectral",
    "PT Sans",
    "PT Serif",
    "Lora",
    "EB Garamond",
    "Libre Baskerville",
    "Bitter",
    "Roboto Slab",
    "Bebas Neue",
    "Anton",
    "Oswald",
    "Archivo",
    "Caveat",
    "Pacifico",
    "Dancing Script",
    "Instrument Sans",
    "Instrument Serif",
  ].map((f) => f.toLowerCase())
);

function normalize(family: string): string {
  return family
    .replace(/['"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface FontResolution {
  font: string;
  resolved: boolean;
}

function resolveFontFamily(rawFamily: string): FontResolution {
  if (!rawFamily) return { font: DEFAULT_FONT, resolved: false };
  const family = rawFamily.replace(/['"]/g, "").split(",")[0]?.trim() ?? "";
  if (!family) return { font: DEFAULT_FONT, resolved: false };

  const normalized = normalize(family);
  if (SYSTEM_FONT_TOKENS.has(normalized)) {
    return { font: DEFAULT_FONT, resolved: false };
  }

  const direct = PROPRIETARY_SUBSTITUTIONS[normalized];
  if (direct) return { font: direct, resolved: true };

  if (KNOWN_GOOGLE_FONTS.has(normalized)) {
    return { font: toTitleCase(family), resolved: true };
  }

  for (const { pattern, result } of KEYWORD_SUBSTITUTIONS) {
    if (pattern.test(family)) return { font: result, resolved: true };
  }

  return { font: DEFAULT_FONT, resolved: false };
}

export function mapFontFamily(rawFamily: string): string {
  return resolveFontFamily(rawFamily).font;
}

const SERIF_NAME_PATTERN =
  /serif|garamond|playfair|lora|merriweather|baskerville|tiempos|cormorant|times|georgia|bitter|spectral|crimson|fraunces|newsreader|slab/i;
const MONO_NAME_PATTERN = /mono|code|consolas|courier/i;

function classifyFont(font: string): "serif" | "mono" | "sans" {
  if (MONO_NAME_PATTERN.test(font)) return "mono";
  if (SERIF_NAME_PATTERN.test(font)) return "serif";
  return "sans";
}

function preferFromFamilies(
  families: string[],
  prefer: "serif" | "sans",
  avoid?: string
): string | null {
  const resolved = families
    .map((family) => resolveFontFamily(family))
    .filter((entry) => entry.resolved)
    .map((entry) => entry.font)
    .filter((font) => font !== avoid);
  const preferred = resolved.find((font) => classifyFont(font) === prefer);
  if (preferred) return preferred;
  return resolved[0] ?? null;
}

function resolveWithFamilies(
  rawFamily: string,
  families: string[],
  prefer: "serif" | "sans",
  avoid?: string
): string {
  const direct = resolveFontFamily(rawFamily);
  if (direct.resolved) return direct.font;
  const borrowed = preferFromFamilies(families, prefer, avoid);
  if (borrowed) return borrowed;
  return direct.font;
}

export function pickFontMap(
  roles: FontRoles,
  families: string[]
): SkillBundleFontMap {
  const headingRaw = roles.heading ?? families[0] ?? DEFAULT_FONT;
  const bodyRaw =
    roles.body ?? families[1] ?? roles.heading ?? families[0] ?? DEFAULT_BODY_FONT;
  const primary = resolveWithFamilies(headingRaw, families, "serif");
  const body = resolveWithFamilies(bodyRaw, families, "sans", primary);
  return { primary, body };
}

export function pickPrimaryAndBody(families: string[]): SkillBundleFontMap {
  const mapped = families
    .map((family) => mapFontFamily(family))
    .filter((family) => family.length > 0);

  const unique: string[] = [];
  for (const family of mapped) {
    if (!unique.includes(family)) unique.push(family);
  }

  const primary = unique[0] ?? DEFAULT_FONT;
  const body = unique[1] ?? primary;
  return { primary, body: body || DEFAULT_BODY_FONT };
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase()))
    .join(" ");
}
