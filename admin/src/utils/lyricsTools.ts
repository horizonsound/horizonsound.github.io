import { cleanLyrics } from "../components/admin/cleanLyrics";

export function cleanLyricsAction(raw: string) {
  const current = raw || "";

  if (!current.trim()) {
    return {
      status: "empty",
      cleaned: current
    };
  }

  const cleaned = cleanLyrics(current);

  if (cleaned === current) {
    return {
      status: "already_clean",
      cleaned
    };
  }

  return {
    status: "cleaned",
    cleaned
  };
}

export function formatForDistroKid(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => {
      const lower = line.trim().toLowerCase();

      if (["verse", "pre chorus", "chorus", "bridge", "outro"].includes(lower)) {
        return "";
      }

      const stripped = line.replace(/([^\w\s]|_)+$/g, match => {
        return /^(\.\.\.|--+)$/.test(match) ? match : "";
      });

      return stripped.charAt(0).toUpperCase() + stripped.slice(1);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function exportDistroKidLyrics(raw: string): string {
  const cleaned = cleanLyrics(raw);
  return formatForDistroKid(cleaned);
}

export function assembleLyricsForDistroKid(sections: any[]): string {
  if (!Array.isArray(sections)) return "";

  // 1. Sort by order
  const sorted = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // 2. Flatten all section text into one array of lines
  const lines: string[] = [];

  for (const sec of sorted) {
    if (!sec.text) continue;

    const rawLines = sec.text.split("\n");

    for (let line of rawLines) {
      line = line.trim();
      if (!line) continue;

      // Remove punctuation at end
      line = line.replace(/[.,!?;:]+$/, "");

      // Uppercase first letter
      line = line.charAt(0).toUpperCase() + line.slice(1);

      lines.push(line);
    }

    // Blank line between sections
    lines.push("");
  }

  // Remove trailing blank line
  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}
