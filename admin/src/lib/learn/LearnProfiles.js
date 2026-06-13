// src/lib/learn/LearnProfiles.js
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// ------------------------------
// Utility: Syllable Counter
// ------------------------------
function countSyllables(text) {
  text = text.toLowerCase().replace(/[^a-z]/g, "");
  if (!text) return 0;

  const groups = text.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 0;

  if (text.endsWith("e")) count--;

  return Math.max(1, count);
}

// ------------------------------
// Load tracks.yml
// ------------------------------
function loadTracks() {
  const filePath = path.join(process.cwd(), "data/tracks.yml");
  const file = fs.readFileSync(filePath, "utf8");
  return yaml.load(file);
}

// ------------------------------
// Group tracks by Artist + Style
// ------------------------------
function groupTracks(tracks) {
  const groups = {};

  tracks.forEach(track => {
    const artist = track.primary_artist;
    const style = track.primary_artist_style;

    if (!artist || !style) return; // skip untagged tracks

    const key = `${artist}::${style}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(track);
  });

  return groups;
}

// ------------------------------
// Extract lines from a track
// ------------------------------
function extractLines(track) {
  const lines = [];

  track.lyrics.forEach(section => {
    const sectionName = section.type;
    const text = section.text;

    text.split("\n").forEach(raw => {
      const line = raw.trim();
      if (!line) return;

      lines.push({
        section: sectionName,
        text: line,
        syllables: countSyllables(line)
      });
    });
  });

  return lines;
}

// ------------------------------
// Group syllables by section
// ------------------------------
function groupBySection(lines) {
  const sections = {};

  lines.forEach(line => {
    if (!sections[line.section]) sections[line.section] = [];
    sections[line.section].push(line.syllables);
  });

  return sections;
}

// ------------------------------
// Compute statistics
// ------------------------------
function computeStats(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);

  return { avg, median, min, max, stddev };
}

// ------------------------------
// Build profile for a group
// ------------------------------
function buildProfile(tracks) {
  const allLines = tracks.flatMap(extractLines);
  const sections = groupBySection(allLines);

  const profile = { sections: {} };

  Object.keys(sections).forEach(sectionName => {
    const values = sections[sectionName];
    profile.sections[sectionName] = computeStats(values);
  });

  return profile;
}

// ------------------------------
// Save profile JSON
// ------------------------------
function saveProfile(artist, style, profile) {
  const dir = path.join(process.cwd(), "data/profiles", artist);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${style}.json`);
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), "utf8");
}

// ------------------------------
// MAIN: Learn profiles
// ------------------------------
export function learnProfiles({ artist = null, style = null } = {}) {
  const tracks = loadTracks();
  const groups = groupTracks(tracks); // { "art_004::Pop": [tracks...] }

  const results = {};

  Object.keys(groups).forEach(key => {
    const [groupArtist, groupStyle] = key.split("::");

    // Artist filter
    if (artist && groupArtist !== artist) return;

    // Style filter
    if (style && groupStyle !== style) return;

    const profile = buildProfile(groups[key]);
    saveProfile(groupArtist, groupStyle, profile);

    results[key] = profile;
  });

  return {
    status: "ok",
    profilesGenerated: Object.keys(results).length,
    results
  };
}
