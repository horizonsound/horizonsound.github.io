import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------------
   LOG HELPERS
   Small wrappers around console logging to keep output
   consistent and easy to scan during GitHub Actions runs.
------------------------------------------------------- */
function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(`WARNING: ${msg}`);
}

function error(msg) {
  console.error(`ERROR: ${msg}`);
}

/* -------------------------------------------------------
   HELPERS
   Utility functions used across video + playlist fetchers.
------------------------------------------------------- */

/**
 * Convert a YouTube title into a clean, URL‑safe slug.
 * This slug becomes the canonical identity for songs
 * and playlists across the entire Horizon Sound site.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['â€™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize YouTube's status fields into a single,
 * lowercase canonical value used by the site.
 *
 * Possible outputs:
 *   - "scheduled"
 *   - "public"
 *   - "unlisted"
 *   - "private"
 *   - raw uploadStatus fallback
 */
function normalizeVideoStatus(snippet, status) {
  const publishAt = status.publishAt || null;
  const privacy = status.privacyStatus || "";
  const upload = status.uploadStatus || "";

  if (publishAt && new Date(publishAt) > new Date()) return "scheduled";
  if (privacy === "public") return "public";
  if (privacy === "unlisted") return "unlisted";
  if (privacy === "private") return "private";
  if (upload === "processed") return "public";

  return upload || "";
}

/* -------------------------------------------------------
   FETCH ALL VIDEOS (FULL METADATA)
   Retrieves every video on the channel, then fetches
   full metadata for each one. This is the backbone of
   the song feed and the source of all song thumbnails.
------------------------------------------------------- */
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

  let allVideos = [];
  let nextPageToken = null;
  let page = 1;

  log("Fetching videos from YouTube...");

  // Paginated fetch of all videos on the channel
  do {
    log(`VIDEO PAGE ${page}...`);

    const searchRes = await youtube.search.list({
      part: ["id", "snippet"],
      forMine: true,
      maxResults: 50,
      pageToken: nextPageToken,
      type: "video"
    });

    if (!searchRes.data.items) {
      error("YouTube returned no items for video search.");
      break;
    }

    // Log each discovered video
    searchRes.data.items.forEach(item => {
      log(`  VIDEO FOUND: ${item.id.videoId} — ${item.snippet?.title || "(no title)"}`);
    });

    // Fetch full metadata for all videos in this page
    const ids = searchRes.data.items.map(item => item.id.videoId).join(",");

    const details = await youtube.videos.list({
      part: [
        "snippet",
        "status",
        "contentDetails",
        "statistics",
        "topicDetails"
      ],
      id: ids
    });

    if (!details.data.items) {
      error("YouTube returned no details for video list.");
      break;
    }

    // Normalize each video into the final data model
    const normalized = details.data.items.map(item => {
      const snippet = item.snippet || {};
      const status = item.status || {};
      const content = item.contentDetails || {};
      const stats = item.statistics || {};
      const topics = item.topicDetails || {};
      const thumbs = snippet.thumbnails || {};

      // Thumbnail selection priority
      const thumbnail =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        "";

      if (!thumbnail) {
        warn(`No thumbnail found for video "${snippet.title}" (${item.id})`);
      } else {
        log(`  THUMBNAIL SELECTED for ${item.id}: ${thumbnail}`);
      }

      return {
        id: item.id,
        title: snippet.title || "",
        slug: slugify(snippet.title || ""),

        // Canonical status fields for the site
        videostatus_raw: normalizeVideoStatus(snippet, status),
        publishedAt: snippet.publishedAt || "",
        scheduledAt: status.publishAt || "",
        thumbnail,

        // Filled later by playlist membership
        playlists: [],

        // Full raw metadata block used by the site
        youtube_metadata: {
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

          // Raw YouTube status fields
          privacy_status: status.privacyStatus || "",
          upload_status: status.uploadStatus || "",
          publish_at: status.publishAt || ""
        }
      };
    });

    allVideos.push(...normalized);
    nextPageToken = searchRes.data.nextPageToken;
    page++;
  } while (nextPageToken);

  log(`TOTAL VIDEOS FETCHED: ${allVideos.length}`);

  if (allVideos.length === 0) {
    error("No videos returned from YouTube. Aborting.");
  }

  return allVideos;
}

/* -------------------------------------------------------
   FETCH ALL PLAYLISTS (FULL METADATA)
   Retrieves every playlist on the channel, including
   title, description, slug, published date, and the
   best available thumbnail URL.
------------------------------------------------------- */
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

/* -------------------------------------------------------
   FETCH PLAYLIST MEMBERSHIP
   For each playlist, fetch all video IDs it contains.
   This is what powers playlist → song relationships.
------------------------------------------------------- */
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

/* -------------------------------------------------------
   DOWNLOAD PLAYLIST THUMBNAILS
   Saves playlist thumbnails locally and attaches the
   final site path to each playlist object.
------------------------------------------------------- */
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
