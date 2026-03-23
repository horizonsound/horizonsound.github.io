import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

/* ========================================================================
   LOG HELPERS
   Lightweight wrappers around console logging to keep output consistent.
   These make GitHub Actions logs easier to scan and help isolate warnings.
   ======================================================================== */
function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(`WARNING: ${msg}`);
}

function error(msg) {
  console.error(`ERROR: ${msg}`);
}

/* ========================================================================
   GENERAL HELPERS
   Shared utilities used across video + playlist fetchers.
   ======================================================================== */

/**
 * slugify(title)
 * Converts a YouTube title into a clean, URL‑safe slug.
 *
 * This slug becomes the canonical identity for songs and playlists
 * across the entire Horizon Sound site. It must remain stable forever.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['â€™]/g, "")       // remove apostrophes and smart quotes
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumerics with hyphens
    .replace(/-+/g, "-")         // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");    // trim leading/trailing hyphens
}

/**
 * normalizeVideoStatus(snippet, status)
 *
 * YouTube exposes multiple overlapping fields that describe visibility:
 *   - snippet.publishedAt
 *   - status.publishAt
 *   - status.privacyStatus
 *   - status.uploadStatus
 *
 * This function collapses all of that into a single canonical value:
 *   "scheduled", "public", "unlisted", "private", or raw uploadStatus.
 *
 * This ensures the site has a stable, predictable status field.
 */
function normalizeVideoStatus(snippet, status) {
  const publishAt = status.publishAt || null;
  const privacy = status.privacyStatus || "";
  const upload = status.uploadStatus || "";

  // Future publish date → scheduled
  if (publishAt && new Date(publishAt) > new Date()) return "scheduled";

  // Standard privacy states
  if (privacy === "public") return "public";
  if (privacy === "unlisted") return "unlisted";
  if (privacy === "private") return "private";

  // Some videos report "processed" instead of privacyStatus
  if (upload === "processed") return "public";

  // Fallback to raw uploadStatus
  return upload || "";
}

/* ========================================================================
   FETCH ALL VIDEOS (FULL METADATA)
   Retrieves every video on the channel, then fetches full metadata for
   each one. This is the backbone of the song feed and the source of all
   thumbnails, descriptions, durations, tags, and statistics.
   ======================================================================== */
export async function fetchAllVideos() {
  log("Initializing YouTube client...");

  // OAuth client for YouTube Data API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // -------------------------------------------------------------
  // 1. Fetch all playlists (cheap)
  // -------------------------------------------------------------
  log("Discovering videos via playlists...");
  const playlists = await fetchPlaylistsWithMembership();

  // Collect all video IDs from all playlists
  const allIds = new Set();
  playlists.forEach(pl => {
    pl.videoIds.forEach(id => allIds.add(id));
  });

  const videoIds = Array.from(allIds);
  log(`TOTAL UNIQUE VIDEO IDS FROM PLAYLISTS: ${videoIds.length}`);

  if (videoIds.length === 0) {
    error("No video IDs discovered from playlists. Aborting.");
    return [];
  }

  // -------------------------------------------------------------
  // 2. Fetch full metadata in batches of 50 (cheap)
  // -------------------------------------------------------------
  let allVideos = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    log(`Fetching metadata for videos ${i + 1}–${i + batch.length}...`);

    const details = await youtube.videos.list({
      part: [
        "snippet",
        "status",
        "contentDetails",
        "statistics",
        "topicDetails"
      ],
      id: batch.join(",")
    });

    if (!details.data.items) {
      warn("YouTube returned no details for a batch.");
      continue;
    }

    // Normalize each video into the final data model
    const normalized = details.data.items.map(item => {
      const snippet = item.snippet || {};
      const status = item.status || {};
      const content = item.contentDetails || {};
      const stats = item.statistics || {};
      const topics = item.topicDetails || {};
      const thumbs = snippet.thumbnails || {};

      const thumbnail =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        "";

      return {
        id: item.id,
        title: snippet.title || "",
        slug: slugify(snippet.title || ""),

        videostatus_raw: normalizeVideoStatus(snippet, status),
        publishedAt: snippet.publishedAt || "",
        scheduledAt: status.publishAt || "",
        thumbnail,

        playlists: [],

        youtube_metadata: {
          description: snippet.description || "",
          published_at: snippet.publishedAt || "",
          channel_id: snippet.channelId || "",
          channel_title: snippet.channelTitle || "",
          category_id: snippet.categoryId || "",
          tags: snippet.tags || [],
          duration: content.duration || "",
          definition: content.definition || "",
          region_allowed: content.regionRestriction?.allowed || [],
          region_blocked: content.regionRestriction?.blocked || [],
          content_rating: content.contentRating?.ytRating || "",
          statistics: {
            view_count: stats.viewCount || "",
            like_count: stats.likeCount || "",
            favorite_count: stats.favoriteCount || "",
            comment_count: stats.commentCount || ""
          },
          made_for_kids: status.madeForKids ?? false,
          self_declared_made_for_kids: status.selfDeclaredMadeForKids ?? false,
          topic_categories: topics.topicCategories || [],
          privacy_status: status.privacyStatus || "",
          upload_status: status.uploadStatus || "",
          publish_at: status.publishAt || ""
        }
      };
    });

    allVideos.push(...normalized);
  }

  log(`TOTAL VIDEOS FETCHED: ${allVideos.length}`);
  return allVideos;
}

/* ========================================================================
   FETCH ALL PLAYLISTS (FULL METADATA)
   Retrieves every playlist on the channel, including:
     - title
     - description
     - slug
     - published date
     - best available thumbnail
   ======================================================================== */
export async function fetchAllPlaylists() {
  console.log("Fetching playlists...");

  // OAuth client for YouTube Data API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  let playlists = [];
  let nextPageToken = null;
  let page = 1;

  // Paginated playlist fetch
  do {
    console.log(`PLAYLIST PAGE ${page}...`);

    const res = await youtube.playlists.list({
      part: ["id", "snippet"],
      channelId: process.env.YOUTUBE_CHANNEL_ID,
      maxResults: 50,
      pageToken: nextPageToken
    });

    if (!res.data.items) {
      console.error("ERROR: YouTube returned no playlist items.");
      break;
    }

    // Log each playlist
    res.data.items.forEach(item => {
      console.log(`  PLAYLIST FOUND: ${item.id} — ${item.snippet?.title || "(no title)"}`);
    });

    // Normalize playlist metadata
    res.data.items.forEach(item => {
      const snippet = item.snippet || {};
      const thumbs = snippet.thumbnails || {};

      // Thumbnail selection priority
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        "";

      if (!thumbnailUrl) {
        console.warn(`WARNING: No thumbnail found for playlist "${snippet.title}" (${item.id})`);
      } else {
        console.log(`  THUMBNAIL SELECTED for playlist ${item.id}: ${thumbnailUrl}`);
      }

      playlists.push({
        id: item.id,
        title: snippet.title || "",
        slug: slugify(snippet.title || ""),
        description: snippet.description || "",
        publishedAt: snippet.publishedAt || "",
        channel_id: snippet.channelId || "",        // ⭐ NEW
        channel_title: snippet.channelTitle || "",  // ⭐ NEW
        thumbnailUrl,
        videoIds: [] // Filled in by membership fetcher
      });
    });

    nextPageToken = res.data.nextPageToken;
    page++;
  } while (nextPageToken);

  console.log(`TOTAL PLAYLISTS FETCHED: ${playlists.length}`);
  return playlists;
}

/* ========================================================================
   FETCH PLAYLIST MEMBERSHIP
   For each playlist, fetch all video IDs it contains.
   This powers playlist → song relationships on the site.
   ======================================================================== */
export async function fetchPlaylistsWithMembership() {
  const playlists = await fetchAllPlaylists();

  console.log("Fetching playlist membership...");

  // OAuth client for YouTube Data API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // For each playlist, fetch all video IDs
  for (const pl of playlists) {
    console.log(`  MEMBERSHIP: ${pl.title}`);

    let nextPageToken = null;

    do {
      const res = await youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId: pl.id,
        maxResults: 50,
        pageToken: nextPageToken
      });

      if (!res.data.items) {
        console.warn(`WARNING: Playlist ${pl.id} returned no items.`);
        break;
      }

      res.data.items.forEach(item => {
        const videoId = item.contentDetails.videoId;
        if (!videoId) {
          console.warn(`WARNING: Playlist ${pl.id} item missing videoId`);
        } else {
          pl.videoIds.push(videoId);
        }
      });

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    console.log(`    → ${pl.videoIds.length} videos`);
  }

  return playlists;
}

/* ========================================================================
   DOWNLOAD PLAYLIST THUMBNAILS
   Saves playlist thumbnails locally and attaches the final site path
   to each playlist object. This ensures thumbnails are served locally.
   ======================================================================== */
export async function processPlaylistThumbnails(playlists, thumbnailDir) {
  const fs = await import("fs");
  const path = await import("path");
  const axios = await import("axios");

  // Ensure thumbnail directory exists
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  // Download each playlist thumbnail
  for (const pl of playlists) {
    if (!pl.thumbnailUrl) {
      console.warn(`Skipping thumbnail for playlist "${pl.title}" — no thumbnail URL.`);
      pl.thumbnail = null;
      continue;
    }

    const filename = `playlist-${pl.slug}.jpeg`;
    const filepath = path.join(thumbnailDir, filename);

    try {
      console.log(`  DOWNLOADING PLAYLIST THUMBNAIL: ${filename}`);
      const response = await axios.default.get(pl.thumbnailUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filepath, response.data);
      pl.thumbnail = `/assets/thumbnails/${filename}`;
    } catch (err) {
      console.error(`ERROR downloading playlist thumbnail for "${pl.title}": ${err.message}`);
      pl.thumbnail = null;
    }
  }

  return playlists;
}
