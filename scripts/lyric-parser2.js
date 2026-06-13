#!/usr/bin/env node

/**
 * PHASE 2A — STRICT HEADER VALIDATION ONLY
 * ----------------------------------------
 * - Validates section headers in lyrics_clean
 * - Enforces your exact canonical rules
 * - Fails fast on first error
 * - Writes nothing
 * - Makes no changes to YAML
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

function fail(reason, trackId, line) {
  console.error(`\n❌ ERROR in track: ${trackId}`);
  console.error(`Reason: ${reason}`);
  if (line !== undefined) console.error(`Offending line: "${line}"`);
  console.error("\nValidation aborted. No files were modified.\n");
  process.exit(1);
}

/**
 * normalizeHeader()
 * Enforces your exact canonical rules:
 * - Allowed types: Verse, Pre-Chorus, Chorus, Bridge, Intro, Outro
 * - Verse may have numbers (ignored)
 * - Final Chorus → Chorus
 * - Pre Chorus (missing hyphen) is invalid
 * - No other numbered sections allowed
 * - No unknown types
 */
function normalizeHeader(raw, trackId) {
  // Must match [Something]
  const match = raw.match(/^\[(.+?)\]$/);
  if (!match) {
    fail("Invalid section header format (expected [Section])", trackId, raw);
  }

  const inside = match[1].trim();
  const lower = inside.toLowerCase();

  // ⭐ Special case: Final Chorus → Chorus
  if (lower === "final chorus") {
    return { type: "Chorus", order: null };
  }

  // ⭐ Canonical types (strict)
  const CANONICAL = {
    "intro": "Intro",
    "verse": "Verse",
    "pre chorus": "Pre Chorus",
    "post chorus": "Post Chorus",
    "chorus": "Chorus",
    "bridge": "Bridge",
    "outro": "Outro"
  };

  // ⭐ Allowed: Verse with numbers
  const verseMatch = lower.match(/^verse\s+(\d+)$/);
  if (verseMatch) {
    return { type: "Verse", order: null }; // ignore numbering
  }

  // ⭐ Allowed: plain Verse
  if (lower === "verse") {
    return { type: "Verse", order: null };
  }

  // ⭐ Allowed: exact canonical types
  if (lower in CANONICAL) {
    return { type: CANONICAL[lower], order: null };
  }

  // ⭐ Not allowed: Pre Chorus (missing hyphen)
  if (lower === "pre chorus") {
    fail("Invalid section type: Pre Chorus (missing hyphen)", trackId, raw);
  }

  // ⭐ Not allowed: numbered non‑verse sections
  const numbered = lower.match(/^([a-z\-]+)\s+(\d+)$/);
  if (numbered) {
    const type = numbered[1];
    if (type !== "verse") {
      fail(`Numbered sections only allowed for Verse, not ${type}`, trackId, raw);
    }
  }

  // ⭐ Everything else is invalid
  fail(`Unknown section type: ${inside}`, trackId, raw);
}

function validateLyrics(clean, trackId) {
  const lines = clean.split(/\r?\n/);

  let current = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    // Section header
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      // Validate header
      current = normalizeHeader(trimmed, trackId);
      current.lines = [];
      continue;
    }

    // Normal lyric line
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

  return true;
}

function run() {
  console.log("🔍 Loading data/tracks.yml...");

  const originalYaml = fs.readFileSync(TRACKS_PATH, "utf8");
  const tracks = yaml.load(originalYaml);

  console.log("🔍 Validating section headers in lyrics_clean...");

  for (const track of tracks) {
    const id = track.id || track.slug || "<unknown>";

    if (!track.lyrics_clean) {
      console.log(`Skipping ${id} — no lyrics_clean`);
      continue;
    }

    const clean = track.lyrics_clean.trim();
    validateLyrics(clean, id);
  }

  console.log("\n🎉 PHASE 2A COMPLETE — All headers validated successfully.");
  console.log("No issues found. No files were modified.\n");
}

run();
