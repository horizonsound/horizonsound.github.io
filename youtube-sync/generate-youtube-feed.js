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
  
  function extractHashtags(desc) {
    if (!desc) return { clean: "", tags: [] };
  
    const tagRegex = /#[A-Za-z0-9_-]+/g;
    const tags = desc.match(tagRegex) || [];
  
    let clean = desc.replace(tagRegex, "");
    
    // Remove leftover punctuation from hashtag removal (commas, slashes, pipes, extra spaces)
    clean = clean.replace(/^[\s,;:|/-]+/gm, "").trim();
    
    // Normalize tags (strip #)
    const normalized = tags.map(t => t.slice(1).toLowerCase());
  
    return { clean, tags: normalized };
  }
  
function extractVibes(desc) {
  if (!desc) return { descriptionWithoutVibes: "", vibes: [] };

  const vibeMarker = /^(🎧|🎤|🎛️|⚡|🎼|✨)/;
  const lines = desc.split("\n");

  let firstVibeIndex = -1;
  let vibes = [];

  // Find first vibe line
  for (let i = 0; i < lines.length; i++) {
    if (vibeMarker.test(lines[i].trim())) {
      firstVibeIndex = i;
      break;
    }
  }

  // NEW: find playlist header fallback anchor
  const playlistHeaderIndex = lines.findIndex(line =>
    line.includes("playlist-header") || line.includes("🎵")
  );

  // CASE 1: No vibes found
  if (firstVibeIndex === -1) {
    // If playlist header exists → trim from there downward
    if (playlistHeaderIndex !== -1) {
      return {
        descriptionWithoutVibes: lines.slice(0, playlistHeaderIndex).join("\n").trim(),
        vibes: []
      };
    }

    // No vibes, no playlist header → return untouched
    return { descriptionWithoutVibes: desc.trim(), vibes: [] };
  }

  // CASE 2: Vibes exist → collect them
  for (let i = firstVibeIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (vibeMarker.test(line)) {
      vibes.push(line);
    } else {
      break;
    }
  }

  // Everything above the first vibe line stays
  const descriptionWithoutVibes = lines
    .slice(0, firstVibeIndex)
    .join("\n")
    .trim();

  return { descriptionWithoutVibes, vibes };
}
  
  function stripHeaderBlock(desc) {
    if (!desc) return desc;
  
    const lines = desc.split("\n");
  
    let i = 0;
  
    // 1. Remove "Official audio..." line
    if (/^Official audio/i.test(lines[i]?.trim())) {
      i++;
    }
  
    // 2. Remove playlist line
    if (/^Playlist:/i.test(lines[i]?.trim())) {
      i++;
    }
  
    // 3. Remove blank line after playlist
    if (lines[i]?.trim() === "") {
      i++;
    }
  
    // Everything from i downward is the real description
    return lines.slice(i).join("\n").trim();
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

  //console.log("RAW DESC >>>", JSON.stringify(desc));

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
    //console.log("PARAGRAPHS >>>", html);

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
      //console.log("MATCHED PLAYLIST URL: ", fullUrl);   // <— ADD THIS
  
      const title = playlistTitleLookup[playlistId] || fullUrl;
      const slug = playlistSlugMap[playlistId];
  
      if (!slug) return `<p>${title}</p>`;
  
      return    `<a href="${baseurl}/music/playlists/${slug}/" class="internal-playlist-link">▶️</a> ${title}`;
    }
  );

  //console.log("PARAGRAPHS BEFORE TABLE >>>", html);

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

  const rawDesc = video.youtube_metadata?.description || "";

  // Step 1: remove hashtags
  const { clean, tags } = extractHashtags(rawDesc);
  
  // Step 2: remove header block
  const descNoHeader = stripHeaderBlock(clean);
  
  // Step 3: extract vibes + trim description
  const { descriptionWithoutVibes, vibes } = extractVibes(descNoHeader);

  return {
    song_id,
    youtube_id: video.id,
    title: video.title,

    description_html: formatDescriptionToHtml(
      descriptionWithoutVibes,
      playlistTitleLookup,
      playlistSlugMap,
      process.env.BASEURL || ""
    ),
    
    vibes,   // ← NEW FIELD
    tags,    // ← already added
    
    url: `/music/${song_id}/`,
    thumbnail: `/assets/thumbnails/${song_id}.jpeg`,
    videostatus: video.videostatus_raw,
    playlists: video.playlists || [],

    tags,                       // ← NEW FIELD

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
    playlists: playlists.map(pl => {
      // Extract playlist-level hashtags
      const { clean: cleanDesc, tags: playlistTags } = extractHashtags(pl.description || "");
  
      return {
        playlist_id: pl.slug,
        title: pl.title,
        description: cleanDesc,       // cleaned description
        tags: playlistTags,           // NEW FIELD
        published_at: pl.publishedAt,
        channel_id: pl.channel_id,
        channel_title: pl.channel_title,
        thumbnail: pl.thumbnail,
        song_ids: pl.videoIds.map(id => slugLookup[id]).filter(Boolean)
      };
    })
  });

  /* -------------------------------------------------------------
     ENSURE OVERRIDE COMPLETENESS
     - Every song gets a music override
     - Every playlist gets a playlist override
  ------------------------------------------------------------- */
  const musicOverridePath = "./_data/music_overrides.yml";
  const playlistOverridePath = "./_data/playlist_overrides.yml";

  let musicOverrides = [];
  let playlistOverrides = [];

  if (fs.existsSync(musicOverridePath)) {
    const parsed = yaml.load(fs.readFileSync(musicOverridePath, "utf8")) || {};
    musicOverrides = parsed.overrides || [];
  }

  if (fs.existsSync(playlistOverridePath)) {
    const parsed = yaml.load(fs.readFileSync(playlistOverridePath, "utf8")) || {};
    playlistOverrides = parsed.overrides || [];
  }

  const musicOverrideSet = new Set(musicOverrides.map(o => o.song_id));
  const playlistOverrideSet = new Set(playlistOverrides.map(o => o.playlist_id));

  // Add missing song overrides
  for (const song of Videos) {
    if (!musicOverrideSet.has(song.song_id)) {
      musicOverrides.push({
        title: "",
        song_id: song.song_id,
        subtitle: "",
        collection: null,
        order: null,
        extra_title: null,
        extra_html: null,
        lyrics_html: ""
      });
    }
  }

  // Add missing playlist overrides
  for (const pl of playlists) {
    if (!playlistOverrideSet.has(pl.slug)) {
      playlistOverrides.push({
        playlist_id: pl.slug,
        is_collection: false,
        is_instrumental: false,
        title: "",
        subtitle: "",
        description: "",
        thumbnail: "",
        hero: "",
        songs: [],
        order: null
      });
    }
  }

  writeYaml(musicOverridePath, { overrides: musicOverrides });
  writeYaml(playlistOverridePath, { overrides: playlistOverrides });

  /* -------------------------------------------------------------
     GENERATE PLAYLIST PAGE FILES
     Creates: _playlists/<slug>
  ------------------------------------------------------------- */
  console.log("Generating playlist page files...");
  
  const PLAYLIST_PAGES_DIR = "./_playlists";
  
  for (const pl of playlists) {
    const filepath = path.join(PLAYLIST_PAGES_DIR, `${pl.slug}.md`);
  
    // Ensure _playlists directory exists
    ensureDir(PLAYLIST_PAGES_DIR);
  
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
  console.log("  Music overrides: ", musicOverrides.length);
  console.log("  Playlist overrides: ", playlistOverrides.length);
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
