#!/usr/bin/env node

/**
 * PHASE 1 — HTML STRIPPER (STRICT, PATCHED)
 * -----------------------------------------
 * - Only <p> and </p> allowed
 * - Accepts <p>[Header] on same line
 * - Anything else causes immediate failure
 * - Converts <p>...</p> blocks into plain text paragraphs
 * - Preserves all text exactly
 * - Writes result to lyrics_clean
 * - Does NOT modify lyrics_html
 * - Atomic write with backup
 */

import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";

// Resolve script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute paths to data files
const TRACKS_PATH = path.join(__dirname, "data", "tracks.yml");
const TRACKS_BAK_PATH = path.join(__dirname, "data", "tracks.yml.bak");
const TRACKS_TMP_PATH = path.join(__dirname, "data", "tracks.yml.tmp");

function fail(reason, trackId, line) {
  console.error(`\n❌ ERROR in track: ${trackId}`);
  console.error(`Reason: ${reason}`);
  if (line !== undefined) console.error(`Offending line: "${line}"`);
  console.error("\nMigration aborted. No files were modified.\n");
  process.exit(1);
}

function stripHtml(raw, trackId) {
  const lines = raw.split(/\r?\n/);

  // Detect HTML paragraphs line-by-line
  let htmlMode = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<p>") || trimmed.endsWith("</p>")) {
      htmlMode = true;
      break;
    }
  }

  // If no <p> or </p> tags found → treat as plain text
  if (!htmlMode) {
    return raw.trimEnd();
  }

  let output = [];
  let buffer = [];
  let inParagraph = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Detect ANY HTML tag
    const tagMatches = trimmed.match(/<[^>]+>/g);
    if (tagMatches) {
      for (const tag of tagMatches) {
        // Allow <p> and </p> ONLY
        if (tag !== "<p>" && tag !== "</p>" && !tag.startsWith("<p>")) {
          fail("Unexpected HTML tag found (only <p> and </p> allowed)", trackId, tag);
        }
      }
    }

    // Start of paragraph: <p> or <p>text
    if (trimmed.startsWith("<p>")) {
      if (inParagraph) {
        fail("Nested <p> detected", trackId, line);
      }
      inParagraph = true;
      buffer = [];

      const after = trimmed.slice(3).trim(); // text after <p>
      if (after) buffer.push(after);
      continue;
    }

    // End of paragraph: </p>
    if (trimmed.endsWith("</p>")) {
      if (!inParagraph) {
        fail("Closing </p> without opening <p>", trackId, line);
      }

      const before = trimmed.slice(0, -4).trim(); // text before </p>
      if (before) buffer.push(before);

      output.push(buffer.join("\n"));
      output.push(""); // blank line between paragraphs

      buffer = [];
      inParagraph = false;
      continue;
    }

    // Normal text inside paragraph
    if (inParagraph) {
      buffer.push(trimmed);
    } else if (trimmed !== "") {
      fail("Text found outside <p>...</p> block", trackId, line);
    }
  }

  if (inParagraph) {
    fail("Unclosed <p> block detected", trackId);
  }

  return output.join("\n").trimEnd();
}

function run() {
  console.log("🔍 Loading data/tracks.yml...");

  const originalYaml = fs.readFileSync(TRACKS_PATH, "utf8");
  const tracks = yaml.load(originalYaml);

  console.log("🔍 Stripping HTML from lyrics...");

  let modified = false;

  for (const track of tracks) {
    if (!track.lyrics_html) continue;

    const raw = track.lyrics_html;
    const cleaned = stripHtml(raw, track.id || track.slug || "<unknown>");

    if (cleaned !== raw.trimEnd()) {
      track.lyrics_clean = cleaned;
      modified = true;
    }
  }

  if (!modified) {
    console.log("✔ No HTML stripping needed. No changes written.");
    return;
  }

  console.log("💾 Writing atomic backup...");
  fs.writeFileSync(TRACKS_BAK_PATH, originalYaml, "utf8");

  console.log("💾 Writing updated tracks.yml.tmp...");
  const newYaml = yaml.dump(tracks, { lineWidth: -1 });
  fs.writeFileSync(TRACKS_TMP_PATH, newYaml, "utf8");

  console.log("🔁 Replacing tracks.yml...");
  fs.renameSync(TRACKS_TMP_PATH, TRACKS_PATH);

  console.log("\n🎉 PHASE 1 COMPLETE — HTML stripped safely.");
  console.log("Review lyrics_clean fields before running PHASE 2.\n");
}

run();
