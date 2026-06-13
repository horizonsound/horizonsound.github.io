#!/usr/bin/env node

/**
 * PHASE 2B — STRUCTURED LYRICS MIGRATION (WITH ORDERING)
 * ------------------------------------------------------
 * - Assumes Phase 2A validation has already passed
 * - Converts lyrics_clean → structured lyrics array
 * - Assigns sequential order numbers to every section
 * - Moves lyrics_clean → lyrics_bak
 * - Removes lyrics_html
 * - Writes atomically and safely
 */

import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";

// Resolve script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const TRACKS_PATH = path.join(__dirname, "data", "tracks.yml");
const TRACKS_BAK_PATH = path.join(__dirname, "data", "tracks.yml.bak3");
const TRACKS_TMP_PATH = path.join(__dirname, "data", "tracks.yml.tmp3");

function fail(reason, trackId, line) {
  console.error(`\n❌ ERROR in track: ${trackId}`);
  console.error(`Reason: ${reason}`);
  if (line !== undefined) console.error(`Offending line: "${line}"`);
  console.error("\nMigration aborted. No files were modified.\n");
  process.exit(1);
}

function normalizeHeader(raw, trackId) {
  const match = raw.match(/^\[(.+?)\]$/);
  if (!match) {
    fail("Invalid section header format (expected [Section])", trackId, raw);
  }

  const inside = match[1].trim();
  const lower = inside.toLowerCase();

  // Final Chorus → Chorus
  if (lower === "final chorus") {
    return { type: "Chorus" };
  }

  const CANONICAL = {
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
      fail(`Numbered sections only allowed for Verse, not ${type}`, trackId, raw);
    }
  }

  fail(`Unknown section type: ${inside}`, trackId, raw);
}

function parseLyrics(clean, trackId) {
  const lines = clean.split(/\r?\n/);

  let sections = [];
  let current = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (current) {
        if (current.lines.length === 0) {
          fail("Empty section detected", trackId, trimmed);
        }
        sections.push(current);
      }

      const header = normalizeHeader(trimmed, trackId);
      current = { type: header.type, lines: [] };
      continue;
    }

    if (!current) {
      fail("Lyric text found before first section header", trackId, line);
    }

    current.lines.push(trimmed);
  }

  if (!current) {
    fail("No valid sections found in lyrics_clean", trackId);
  }

  if (current.lines.length === 0) {
    fail("Empty section detected", trackId);
  }

  sections.push(current);

  // ⭐ Assign sequential order numbers
  return sections.map((sec, index) => ({
  type: sec.type,
  order: index + 1,
  debug_order_marker: `ORDER=${index + 1}`, // TEMP
  text: sec.lines.join("\n")
}));
}

function run() {
  console.log("🔍 Loading data/tracks.yml...");

  const originalYaml = fs.readFileSync(TRACKS_PATH, "utf8");
  const tracks = yaml.load(originalYaml);

  console.log("🔍 Converting lyrics_clean into structured lyrics array...");

  for (const track of tracks) {
    const id = track.id || track.slug || "<unknown>";

    if (!track.lyrics_clean) {
      console.log(`Skipping ${id} — no lyrics_clean`);
      continue;
    }

    const clean = track.lyrics_clean.trim();
    const structured = parseLyrics(clean, id);

    track.lyrics_bak = track.lyrics_clean;

    delete track.lyrics_clean;
    delete track.lyrics_html;

    track.lyrics = structured;
  }

  console.log("💾 Writing atomic backup...");
  fs.writeFileSync(TRACKS_BAK_PATH, originalYaml, "utf8");

  console.log("💾 Writing updated tracks.yml.tmp3...");
  const newYaml = yaml.dump(tracks, { lineWidth: -1 });
  fs.writeFileSync(TRACKS_TMP_PATH, newYaml, "utf8");

  console.log("🔁 Replacing tracks.yml...");
  fs.renameSync(TRACKS_TMP_PATH, TRACKS_PATH);

  console.log("\n🎉 PHASE 2B COMPLETE — Lyrics structured successfully.");
  console.log("All sections now include sequential ordering.\n");
}

run();
