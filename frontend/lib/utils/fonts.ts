const GOOGLE_FONTS = new Set(
  [
    "Inter",
    "Instrument Sans",
    "Instrument Serif",
    "Roboto",
    "Roboto Flex",
    "Roboto Mono",
    "Open Sans",
    "Poppins",
    "Manrope",
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
    "Fira Mono",
    "Geist",
    "Geist Mono",
    "Cabinet Grotesk",
    "General Sans",
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
    "Mulish",
    "Karla",
    "Rubik",
    "Quicksand",
    "Ubuntu",
    "Ubuntu Mono",
    "Merriweather",
    "Playfair Display",
    "PT Sans",
    "PT Serif",
    "Cormorant Garamond",
    "Crimson Pro",
    "Lora",
    "EB Garamond",
    "Libre Baskerville",
    "Libre Caslon Text",
    "Bitter",
    "Roboto Slab",
    "Bebas Neue",
    "Anton",
    "Oswald",
    "Archivo",
    "Archivo Black",
    "Big Shoulders Display",
    "Caveat",
    "Pacifico",
    "Dancing Script",
  ].map((f) => f.toLowerCase())
);

const SYSTEM_FONTS = new Set(
  [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
    "serif",
    "monospace",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Helvetica",
    "Helvetica Neue",
    "Arial",
    "Times",
    "Times New Roman",
    "Courier",
    "Courier New",
    "Georgia",
    "Verdana",
    "Tahoma",
  ].map((f) => f.toLowerCase().trim())
);

export interface FontInfo {
  name: string;
  isSystem: boolean;
  isGoogle: boolean;
  downloadUrl: string | null;
}

export function classifyFont(rawName: string): FontInfo {
  const name = rawName.replace(/['"]/g, "").trim();
  const lower = name.toLowerCase();

  if (!name) {
    return { name, isSystem: true, isGoogle: false, downloadUrl: null };
  }

  if (SYSTEM_FONTS.has(lower)) {
    return { name, isSystem: true, isGoogle: false, downloadUrl: null };
  }

  if (GOOGLE_FONTS.has(lower)) {
    const slug = name.replace(/\s+/g, "+");
    return {
      name,
      isSystem: false,
      isGoogle: true,
      downloadUrl: `https://fonts.google.com/specimen/${slug}`,
    };
  }

  return {
    name,
    isSystem: false,
    isGoogle: false,
    downloadUrl: `https://www.google.com/search?q=${encodeURIComponent(`${name} font`)}`,
  };
}

export function classifyFonts(rawNames: string[]): FontInfo[] {
  const seen = new Set<string>();
  const result: FontInfo[] = [];
  for (const raw of rawNames) {
    const info = classifyFont(raw);
    const key = info.name.toLowerCase();
    if (!info.name || info.isSystem || seen.has(key)) continue;
    seen.add(key);
    result.push(info);
  }
  return result;
}
