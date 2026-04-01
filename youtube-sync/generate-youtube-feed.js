/**
 * -------------------------------------------------------------
 *  YOUTUBE → LOCAL DATA INGESTION LAYER (CANONICAL + STABLE)
 * -------------------------------------------------------------
 *
 *  PURPOSE:
 *    This script fetches all YouTube videos and playlists from the
 *    Horizon Sound channel, downloads thumbnails, normalizes metadata,
 *    formats descriptions, attaches playlist membership, and writes
 *    two canonical YAML data files used by the website:
 *
 *      • _data/youtube_feed.yml       (all songs)
 *      • _data/youtube_playlists.yml  (all playlists)
 *
 *  This is the **single source of truth** for all YouTube-derived
 *  metadata. It must remain stable, complete, and append‑only.
 *
 *  NOTHING in this file should ever be removed because it is “unused.”
 *  The ingestion layer must preserve ALL useful upstream metadata
 *  for future features, analytics, debugging, and site evolution.
 *
 * -------------------------------------------------------------
 *  INPUTS:
 *    • YouTube API (via fetchAllVideos + fetchPlaylistsWithMembership)
 *    • Local overrides (merged later in the site build)
 *    • Local filesystem for thumbnails
 *
 *  OUTPUTS:
 *    • youtube_feed.yml       → list of normalized song objects
 *    • youtube_playlists.yml  → list of normalized playlist objects
 *    • /assets/thumbnails/    → downloaded JPEG thumbnails
 *
 * -------------------------------------------------------------
 *  GUARANTEES:
 *    • Never drops upstream metadata fields
 *    • Always produces deterministic YAML
 *    • Always formats descriptions into <p> blocks
 *    • Always downloads thumbnails
 *    • Always attaches playlist membership
 *    • Always safe to run repeatedly
 *
 * -------------------------------------------------------------
 */
let playlistSlugMap = {};

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

import {
  fetchAllVideos,
  fetchPlaylistsWithMembership,
  processPlaylistThumbnails
} from "./fetch-youtube-metadata.js";

/* -------------------------------------------------------------
   CONSTANTS & PATHS
------------------------------------------------------------- */

const DATA_DIR = "./_data";
const THUMBNAIL_DIR = "./assets/thumbnails";

const VIDEO_FEED_PATH = path.join(DATA_DIR, "youtube_feed.yml");
const PLAYLIST_FEED_PATH = path.join(DATA_DIR, "youtube_playlists.yml");

/* -------------------------------------------------------------
   FILESYSTEM HELPERS
------------------------------------------------------------- */

/**
 * ensureDir(dir)
 * Creates a directory if it doesn't exist.
 * Used for thumbnails and YAML output directories.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * writeYaml(filepath, data)
 * Writes YAML to disk with safe directory creation.
 */
function writeYaml(filepath, data) {
  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, yaml.dump(data), "utf8");
}

/* -------------------------------------------------------------
   DESCRIPTION FORMATTER
   Converts raw YouTube description text into compact <p> blocks.
   - Removes blank lines
   - Collapses internal newlines
   - Produces deterministic HTML
------------------------------------------------------------- */

function formatDescriptionToHtml(desc, playlistTitleLookup, playlistSlugMap, baseurl = "") {
  if (!desc) return "";

  console.log("RAW DESC >>>", JSON.stringify(desc));

  /* -------------------------------------------------------------
     1. MODIFY DESC BEFORE ANY <p> PROCESSING
  ------------------------------------------------------------- */

  // Force newline before every bullet
  desc = desc.replace(/•/g, "\n•");

  // Force blank line before each vibe marker
  desc = desc.replace(/(🎧|🎤|🎛️|⚡|🎼|✨)/g, "\n\n$1");

  // Split multiple playlist URLs on the same line into separate lines
  desc = desc.replace(
    /(https?:\/\/www\.youtube\.com\/playlist\?list=[A-Za-z0-9_-]+)\s+(https?:\/\/www\.youtube\.com\/playlist\?list=[A-Za-z0-9_-]+)/g,
    "$1\n$2"
  );

  // Force playlist headers onto their own line
  desc = desc.replace(/🎵 ([^\n]+)/g, "🎵 $1\n");

  /* -------------------------------------------------------------
     2. BUILD <p> BLOCKS FROM DESC
  ------------------------------------------------------------- */

let html = desc
  .split(/\n+/)
  .map(p => p.trim())
  .filter(p => p.length > 0)
  .map(p => `<p>${p}</p>`)
  .join("");

      // ADD IT HERE — after html is defined
    console.log("PARAGRAPHS >>>", html);

  /* -------------------------------------------------------------
     3. CONVERT VIBE PARAGRAPHS INTO <ul>
  ------------------------------------------------------------- */

  html = html.replace(
    /((?:<p>(?:🎧|🎤|🎛️|⚡|🎼|✨).*?<\/p>)+)/,
    (match) => {
      const items = match
        .match(/<p>.*?<\/p>/g)
        .map(p => p.replace(/^<p>/, "<li>").replace(/<\/p>$/, "</li>"))
        .join("");
      return `<ul class="vibe-list">${items}</ul>`;
    }
  );

  /* -------------------------------------------------------------
     4. CONVERT PLAYLIST URLS → INTERNAL LINKS + SPLIT INTO <p>
  ------------------------------------------------------------- */

  html = html.replace(
    /(https?:\/\/www\.youtube\.com\/playlist\?list=([A-Za-z0-9_-]+))/g,
    (match, fullUrl, playlistId) => {
      console.log("MATCHED PLAYLIST URL: ", fullUrl);   // <— ADD THIS
  
      const title = playlistTitleLookup[playlistId] || fullUrl;
      const slug = playlistSlugMap[playlistId];
  
      if (!slug) return `<p>${title}</p>`;
  
      return    `<a href="${baseurl}/music/playlists/${slug}/" class="internal-playlist-link">▶️</a> ${title}`;
    }
  );

  console.log("PARAGRAPHS BEFORE TABLE >>>", html);

/* -------------------------------------------------------------
   5. BUILD PLAYLIST TABLES USING A CLEAN STATE MACHINE
------------------------------------------------------------- */

{
  // Split into blocks (<p> and <ul> stay intact)
  const blocks = html.match(/<p>.*?<\/p>|<ul[\s\S]*?<\/ul>/g) || [];

  let output = [];
  let inTable = false;
  let currentHeader = "";
  let currentRows = [];

  const isHeader = p => /^<p>🎵 /.test(p);
  const isPlaylistItem = p => /internal-playlist-link/.test(p);
  const isDivider = p => /^<p>---/.test(p);
  const isAbout = p => /^<p>💬/.test(p);
  const isCopyright = p => /^<p>©/.test(p);
  const isHashtags = p => /^<p>#/.test(p);

  const flushTable = () => {
    if (!inTable) return;

    let rowsHtml = "";
    for (let i = 0; i < currentRows.length; i += 2) {
      const left = currentRows[i] || "";
      const right = currentRows[i + 1] || "";
      rowsHtml += `
        <tr>
          <td class="playlist-cell">${left}</td>
          <td class="playlist-cell">${right}</td>
        </tr>`;
    }

    output.push(`
      <p class="playlist-header">${currentHeader}</p>
      <table class="playlist-table">
        ${rowsHtml}
      </table>
    `);

    inTable = false;
    currentHeader = "";
    currentRows = [];
  };

  for (const block of blocks) {
    if (isHeader(block)) {
      flushTable();
      inTable = true;
      currentHeader = block.replace(/^<p>|<\/p>$/g, "");
      continue;
    }

    if (inTable && isPlaylistItem(block)) {
      const clean = block.replace(/^<p>|<\/p>$/g, "");
      currentRows.push(clean);
      continue;
    }

    if (inTable && (isDivider(block) || isAbout(block) || isCopyright(block) || isHashtags(block))) {
      flushTable();
      output.push(block);
      continue;
    }

    if (inTable && !isPlaylistItem(block)) {
      flushTable();
      output.push(block);
      continue;
    }

    output.push(block);
  }

  flushTable();
  html = output.join("\n");
}

  return html;
}

/* -------------------------------------------------------------
   SONG OBJECT NORMALIZATION
   Converts raw YouTube API video objects into stable, normalized
   song objects used by the site. This is the canonical schema.
------------------------------------------------------------- */

function buildSongObject(video, playlistTitleLookup, playlistSlugMap) {
  const song_id = video.slug;

  return {
    song_id,
    youtube_id: video.id,
    title: video.title,

    // ⭐ Correct: pass playlistSlugMap into formatter
    description_html: formatDescriptionToHtml(
      video.youtube_metadata?.description || "",
      playlistTitleLookup,
      playlistSlugMap,
      process.env.BASEURL || ""   // e.g. "" or "/development"
    ),

    url: `/music/${song_id}/`,
    thumbnail: `/assets/thumbnails/${song_id}.jpeg`,
    videostatus: video.videostatus_raw,
    playlists: video.playlists || [],

    view_count_num: parseInt(
      video.youtube_metadata?.statistics?.view_count || "0",
      10
    ),

    youtube_metadata: {
      published_at: video.publishedAt || null,
      scheduled_at: video.scheduledAt || null,
      channel_id: video.youtube_metadata?.channel_id || null,
      channel_title: video.youtube_metadata?.channel_title || null,
      category_id: video.youtube_metadata?.category_id || null,
      tags: video.youtube_metadata?.tags || [],

      duration: video.youtube_metadata?.duration || null,
      definition: video.youtube_metadata?.definition || null,
      dimension: video.youtube_metadata?.dimension || null,
      caption: video.youtube_metadata?.caption || null,
      licensed_content: video.youtube_metadata?.licensed_content || false,
      region_allowed: video.youtube_metadata?.region_allowed || [],
      region_blocked: video.youtube_metadata?.region_blocked || [],
      content_rating: video.youtube_metadata?.content_rating || {},

      statistics: video.youtube_metadata?.statistics || {
        view_count: 0,
        like_count: 0,
        favorite_count: 0,
        comment_count: 0
      },

      made_for_kids: video.youtube_metadata?.made_for_kids || false,
      self_declared_made_for_kids: video.youtube_metadata?.self_declared_made_for_kids || false,
      topic_categories: video.youtube_metadata?.topic_categories || [],
      privacy_status: video.privacyStatus || null,
      upload_status: video.uploadStatus || null,
      publish_at: video.publishAt || null,
      license: video.youtube_metadata?.license || "",
      embeddable: video.youtube_metadata?.embeddable ?? true,
      public_stats_viewable: video.youtube_metadata?.public_stats_viewable ?? true
    }
  };
}

/* -------------------------------------------------------------
   MAIN GENERATION PIPELINE
   Fetch → Thumbnails → Membership → Normalize → YAML
------------------------------------------------------------- */

async function generate() {
  console.log("Fetching videos...");
  const videos = await fetchAllVideos();

  // Build lookup: YouTube video ID → slug
  const slugLookup = {};
  for (const v of videos) {
    slugLookup[v.id] = v.slug;
  }

  if (!videos || videos.length === 0) {
    console.error("ERROR: No videos returned from YouTube. Aborting.");
    process.exit(1);
  }

  console.log(`VIDEO COUNT: ${videos.length}`);

  console.log("Fetching playlists + membership...");
  const playlists = await fetchPlaylistsWithMembership();
  
  // Build lookup: YouTube playlist ID → playlist title
  const playlistTitleLookup = {};
  for (const pl of playlists) {
    playlistTitleLookup[pl.id] = pl.title;
  }

  if (!playlists) {
    console.error("ERROR: fetchPlaylistsWithMembership() returned undefined.");
    process.exit(1);
  }

// Build a lookup: { YouTube playlist ID → slug }
playlistSlugMap = {};
for (const pl of playlists) {
  playlistSlugMap[pl.id] = pl.slug;   // pl.id = YouTube playlist ID, pl.slug = your slug
}

  console.log(`PLAYLIST COUNT: ${playlists.length}`);

  /* -------------------------------------------------------------
     PLAYLIST THUMBNAILS
  ------------------------------------------------------------- */
  console.log("Downloading playlist thumbnails...");
  await processPlaylistThumbnails(playlists, THUMBNAIL_DIR);

  /* -------------------------------------------------------------
     SONG THUMBNAILS
  ------------------------------------------------------------- */
  console.log("Downloading song thumbnails...");
  ensureDir(THUMBNAIL_DIR);

  for (const video of videos) {
    const filename = `${video.slug}.jpeg`;
    const filepath = path.join(THUMBNAIL_DIR, filename);

    if (!video.thumbnail) {
      console.warn(`WARNING: No thumbnail URL for video "${video.title}"`);
      continue;
    }

    try {
      console.log(`  → ${filename}`);
      const res = await fetch(video.thumbnail);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filepath, buf);
    } catch (err) {
      console.error(`ERROR downloading thumbnail for "${video.title}": ${err.message}`);
    }
  }

  /* -------------------------------------------------------------
     ATTACH PLAYLIST MEMBERSHIP
  ------------------------------------------------------------- */
  console.log("Attaching playlist membership to videos...");
  const playlistMap = {};
  playlists.forEach(pl => {
    pl.videoIds.forEach(id => {
      const slug = slugLookup[id];
      if (!slug) {
        console.warn(`WARNING: Playlist ${pl.title} references unknown video ID: ${id}`);
        return;
      }
      if (!playlistMap[slug]) playlistMap[slug] = [];
      playlistMap[slug].push(pl.slug);
    });
  });

  videos.forEach(video => {
    video.playlists = playlistMap[video.slug] || [];
  });

  /* -------------------------------------------------------------
     NORMALIZE SONG OBJECTS
  ------------------------------------------------------------- */
  console.log("Building song objects...");
  const Videos = videos.map(video => buildSongObject(video, playlistTitleLookup, playlistSlugMap));

  /* -------------------------------------------------------------
     WRITE SONG FEED
  ------------------------------------------------------------- */
  console.log("Writing youtube_feed.yml...");
  writeYaml(VIDEO_FEED_PATH, { songs: Videos });

  /* -------------------------------------------------------------
     WRITE PLAYLIST FEED
  ------------------------------------------------------------- */
  console.log("Writing youtube_playlists.yml...");
  writeYaml(PLAYLIST_FEED_PATH, {
    playlists: playlists.map(pl => ({
      playlist_id: pl.slug,
      title: pl.title,
      description: pl.description,
      published_at: pl.publishedAt,
      channel_id: pl.channel_id,        // ⭐ NEW
      channel_title: pl.channel_title,  // ⭐ NEW
      thumbnail: pl.thumbnail,
      song_ids: pl.videoIds.map(id => slugLookup[id])
    }))
    
  });

  /* -------------------------------------------------------------
     GENERATE PLAYLIST PAGE FILES
     Creates: _playlists/<slug>
  ------------------------------------------------------------- */
  
  console.log("Generating playlist page files...");
  
  const PLAYLIST_PAGES_DIR = "./_playlists";
  
  for (const pl of playlists) {
    const filepath = path.join(PLAYLIST_PAGES_DIR, pl.slug);
  
    // Ensure _playlists directory exists
    ensureDir(PLAYLIST_PAGES_DIR);
  
    // Minimal front matter matching your working files
const frontMatter =
`---
layout: playlist
playlist_id: ${pl.slug}
title: "${pl.title.replace(/"/g, '\\"')}"
is_playlist_page: true
permalink: /music/playlists/${pl.slug}/
---
`;
  
    fs.writeFileSync(filepath, frontMatter, "utf8");
  
    console.log(`  → ${filepath}`);
  }

  /* -------------------------------------------------------------
     SUMMARY
  ------------------------------------------------------------- */
  console.log("\nSUMMARY:");
  console.log(`  Videos fetched: ${videos.length}`);
  console.log(`  Playlists fetched: ${playlists.length}`);
  console.log(`  Song thumbnails downloaded: ${videos.length}`);
  console.log(`  Playlist thumbnails downloaded: ${playlists.filter(pl => pl.thumbnail).length}/${playlists.length}`);
  console.log("  Feed written: _data/youtube_feed.yml");
  console.log("  Playlists written: _data/youtube_playlists.yml");
  console.log("");

  console.log("Done.");
}

/* -------------------------------------------------------------
   EXECUTE
------------------------------------------------------------- */

generate().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
