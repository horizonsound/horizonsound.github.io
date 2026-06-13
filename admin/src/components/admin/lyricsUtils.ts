// components/admin/lyricsUtils.ts

export function normalizeToAscii(text: string) {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200F]/g, "")
    .replace(/[^\x20-\x7E\n\r]/g, "")
    .trimEnd();
}

/**
 * Phase 1-style cleaner: normalize + collapse blank lines + keep headers.
 * This is safe to run on raw textarea input before splitting.
 */
export function cleanLyrics(text: string) {
  if (!text) return "";

  text = normalizeToAscii(text);

  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const trimmed = line.trim();

    // Preserve headers as-is (we validate later)
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      out.push(trimmed);
      continue;
    }

    if (trimmed === "") {
      if (out[out.length - 1] !== "") {
        out.push("");
      }
      continue;
    }

    out.push(line);
  }

  while (out.length > 0 && out[out.length - 1] === "") {
    out.pop();
  }

  return out.join("\n");
}

/**
 * Phase 2A / 2B canonical header normalization.
 * Throws on invalid headers.
 */
export function normalizeHeaderStrict(raw: string): { type: string } {
  const match = raw.match(/^\[(.+?)\]$/);
  if (!match) {
    throw new Error(`Invalid section header format (expected [Section]): "${raw}"`);
  }

  const inside = match[1].trim();
  const lower = inside.toLowerCase();

  // Final Chorus → Chorus
  if (lower === "final chorus") {
    return { type: "Chorus" };
  }

  const CANONICAL: Record<string, string> = {
    "intro": "Intro",
    "verse": "Verse",
    "pre chorus": "Pre Chorus",
    "post chorus": "Post Chorus",
    "chorus": "Chorus",
    "bridge": "Bridge",
    "outro": "Outro"
  };

  // Verse with numbers
  const verseMatch = lower.match(/^verse\s+(\d+)$/);
  if (verseMatch) {
    return { type: "Verse" };
  }

  if (lower === "verse") {
    return { type: "Verse" };
  }

  if (lower in CANONICAL) {
    return { type: CANONICAL[lower] };
  }

  const numbered = lower.match(/^([a-z\s]+)\s+(\d+)$/);
  if (numbered) {
    const type = numbered[1];
    if (type !== "verse") {
      throw new Error(
        `Numbered sections only allowed for Verse, not "${type}" in header "${raw}"`
      );
    }
  }

  throw new Error(`Unknown section type: "${inside}" in header "${raw}"`);
}

export function detectLooseHeader(line: string): string | null {
  if (!line) return null;

  const trimmed = line.trim();

  // Remove brackets if present
  const noBrackets = trimmed.replace(/^\[(.+?)\]$/, "$1").trim();

  // Normalize hyphens → spaces
  const normalized = noBrackets.replace(/-/g, " ").replace(/\s+/g, " ").trim();

  const lower = normalized.toLowerCase();

  // Final Chorus → Chorus
  if (lower === "final chorus") return "Chorus";

  const canonical: Record<string, string> = {
    "intro": "Intro",
    "verse": "Verse",
    "pre chorus": "Pre Chorus",
    "post chorus": "Post Chorus",
    "chorus": "Chorus",
    "bridge": "Bridge",
    "outro": "Outro"
  };

  // Verse with numbers
  if (/^verse\s+\d+$/.test(lower)) return "Verse";

  // Exact canonical match
  if (canonical[lower]) return canonical[lower];

  return null;
}

/**
 * Phase 2B-style parser: cleaned text → structured sections.
 * Throws on invalid structure.
 */
export function splitLyricsIntoSections(text: string) {
  if (!text) return [];

  const clean = cleanLyrics(text);
  const lines = clean.split(/\r?\n/);

  const sections: { type: string; lines: string[] }[] = [];
  let current: { type: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const headerType = detectLooseHeader(trimmed);

    if (headerType) {
    if (current) {
        if (current.lines.length === 0) {
        throw new Error(`Empty section detected before header "${trimmed}"`);
        }
        sections.push(current);
    }

    current = { type: headerType, lines: [] };
    continue;
    }

    if (!current) {
      throw new Error(
        `Lyric text found before first section header: "${line}"`
      );
    }

    current.lines.push(trimmed);
  }

  if (!current) {
    throw new Error("No valid sections found in lyrics");
  }

  if (current.lines.length === 0) {
    throw new Error("Empty section detected at end of lyrics");
  }

  sections.push(current);

  // Assign sequential order numbers (Phase 2B)
  return sections.map((sec, index) => ({
    type: sec.type,
    order: index + 1,
    text: sec.lines.join("\n")
  }));
}

/**
 * Structured sections → textarea text.
 * This is what you show in the Track Edit modal.
 */
export function assembleLyricsSections(
  sections: { type: string; order?: number; text: string }[] | undefined | null
): string {
  if (!sections || sections.length === 0) return "";

  return sections
    .map((sec) => {
      // We don't re-encode order into the header; we keep it simple:
      // [Verse], [Chorus], etc. (matching what you actually typed)
      const header = `[${sec.type}]`;
      const body = (sec.text || "").trim();
      return body ? `${header}\n${body}` : header;
    })
    .join("\n\n");
}
