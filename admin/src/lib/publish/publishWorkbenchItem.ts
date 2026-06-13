"use server";

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { splitLyricsIntoSections } from "../../components/admin/lyricsUtils";
import { generateNextId } from "../generateId"; // adjust path as needed

interface WorkbenchItem {
  id: string;
  title: string;
  artist: string;      // human-readable name
  artist_id: string;   // stable ID
  project: string;
  lyrics_raw: string;
  checklist?: Record<string, any>;
}

function cleanTitle(rawTitle: string) {
  return rawTitle.replace(/^\d+\.\s*/, "").trim();
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateTrackId() {
  return "trk_" + Math.floor(Math.random() * 1_000_000);
}

export async function publishWorkbenchItem(workbenchRow: WorkbenchItem) {
  //
  // 1. STRUCTURE LYRICS
  //
  const structuredLyrics = splitLyricsIntoSections(workbenchRow.lyrics_raw);

  //
  // 2. BUILD TRACK OBJECT
  //
  const cleanedTitle = cleanTitle(workbenchRow.title);
  const slug = slugify(cleanedTitle);

  const track = {
    id: generateTrackId(),
    slug,
    title: cleanedTitle,
    subtitle: workbenchRow.artist,     // human-readable name
    status: "published",
    mastered: false,
    type: null,

    // ⭐ NEW — direct from Workbench
    primary_artist: workbenchRow.artist_id,

    featuring_artists: [],
    release_ids: [],
    is_instrumental: false,
    lyrics_excerpt: null,

    suno: {
      vocal: {
        artist: null,
        style: null,
        model: null,
        base_snapshot: null,
        style_snapshot: null,
      },
      production: {
        model: null,
        prompt: null,
      },
    },

    audio: {
      preview_mp3: null,
      full_mp3: null,
      wav: null,
      stems_zip: null,
      instrumental_mp3: null,
      instrumental_wav: null,
    },

    bpm: null,
    key: null,
    duration: null,
    duration_display: null,
    isrc: null,
    version: "original",

    genres: {
      primary: null,
      secondary: null,
      tertiary: null,
    },

    moods: [],
    description_html: null,
    context_title: null,
    context_html: null,

    artwork: {
      cover: null,
      banner: null,
      gallery: [],
    },

    videos: [],
    links: {
      spotify: null,
      apple_music: null,
      youtube_music: null,
      amazon_music: null,
      tidal: null,
    },

    playlists: [],
    credits: {
      producers: [],
      writers: [],
      mixers: [],
      mastering_engineers: [],
      musicians: [],
      engineers: [],
    },

    seo: {
      title: null,
      description: null,
      keywords: [],
    },

    internal: {
      notes: null,
      priority: null,
    },

    lyrics: structuredLyrics,
  };

  //
  // 3. WRITE TO tracks.yml
  //
// 3. WRITE TO tracks.yml
const tracksPath = path.join(process.cwd(), "data", "tracks.yml");
const tracksFile =
  (yaml.load(fs.readFileSync(tracksPath, "utf8")) as any[]) || [];

// Generate proper sequential ID
track.id = generateNextId(tracksFile, "trk");

// Insert at TOP
tracksFile.unshift(track);

fs.writeFileSync(tracksPath, yaml.dump(tracksFile, { lineWidth: -1 }));

  //
  // 4. UPDATE WORKBENCH ITEM
  //
  const wbPath = path.join(process.cwd(), "data", "workbench.yml");
  const wbFile = (yaml.load(fs.readFileSync(wbPath, "utf8")) as any[]) || [];

  const index = wbFile.findIndex((w) => w.id === workbenchRow.id);
  if (index !== -1) {
    wbFile[index].status = "published";
    wbFile[index].publishedAt = new Date().toISOString();
    wbFile[index].checklist = wbFile[index].checklist || {};
    wbFile[index].checklist.lyricsLocked = true;
  }

  fs.writeFileSync(wbPath, yaml.dump(wbFile, { lineWidth: -1 }));

  return track;
}
