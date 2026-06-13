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

export function detectSectionHeader(line: string) {
  const match = line.match(/^\s*\[?\s*(final[- ]?chorus|intro|verse|pre[- ]?chorus|post[- ]?chorus|chorus|bridge|outro)(\s*\d+)?/i);
  if (!match) return null;

  const raw = match[1].toLowerCase().replace(/-/g, " ");
  const map: Record<string, string> = {
    "intro": "Intro",
    "verse": "Verse",
    "pre chorus": "Pre Chorus",
    "post chorus": "Post Chorus",
    "chorus": "Chorus",
    "final chorus": "Chorus",
    "bridge": "Bridge",
    "outro": "Outro"
  };

  return map[raw] || null;
}

export function isStyledSectionHeader(line: string) {
  return /^(Intro|Verse|Pre Chorus|Post Chorus|Chorus|Bridge|Outro)$/i.test(
    line.trim()
  );
}

export function styleSectionHeader(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function cleanLyrics(text: string) {
  if (!text) return "";

  text = normalizeToAscii(text);

  // 1. Split and trim trailing spaces
  let lines = text.split(/\r?\n/).map(l => l.trimEnd());

  // 2. Remove ALL blank lines
  lines = lines.filter(l => l.trim() !== "");

  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const section = detectSectionHeader(line);
    if (section) {
      out.push(styleSectionHeader(section));
      continue;
    }

    out.push(line);
  }

  // Insert a blank line BEFORE every section except the first
  const final: string[] = [];

  for (let i = 0; i < out.length; i++) {
    const line = out[i];

    const isSection =
      detectSectionHeader(line) !== null ||
      isStyledSectionHeader(line);

    if (isSection && final.length > 0) {
      // Only add if previous line isn't already blank
      if (final[final.length - 1] !== "") {
        final.push("");
      }
    }

    final.push(line);
  }

  // 4. Remove trailing blank lines
  while (final.length > 0 && final[final.length - 1].trim() === "") {
    final.pop();
  }

  return final.join("\n");
}
