import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(snippet, status) {
  const publishAt = status.publishAt || null;
  const privacy = status.privacyStatus || "";
  const upload = status.uploadStatus || "";

  if (publishAt && new Date(publishAt) > new Date()) {
    return "Scheduled";
  }
  if (privacy === "public") return "Public";
  if (privacy === "unlisted") return "Unlisted";
  if (privacy === "private") return "Private";
  if (upload === "processed") return "Public";
  if (upload) return upload.charAt(0).toUpperCase() + upload.slice(1);

  return "";
}

export async function fetchAllVideos() {
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

  do {
    const searchRes = await youtube.search.list({
      part: ["id", "snippet"],
      forMine: true,
      maxResults: 50,
      pageToken: nextPageToken,
      type: "video"
    });

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

    const normalized = details.data.items.map(item => {
      const snippet = item.snippet || {};
      const status = item.status || {};
      const content = item.contentDetails || {};
      const stats = item.statistics || {};
      const topics = item.topicDetails || {};

      const thumbs = snippet.thumbnails || {};

      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        "";

      return {
        id: item.id,
        title: snippet.title || "",
        description: snippet.description || "",
        publishedAt: snippet.publishedAt || "",
        slug: slugify(snippet.title || ""),
        status: normalizeStatus(snippet, status),
        scheduledAt: status.publishAt || "",
        thumbnailUrl,

        metadata: {
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
          topic_categories: topics.topicCategories || []
        },

        primaryPlaylist: "",
        sequence: "",
        lyrics: ""
      };
    });

    allVideos.push(...normalized);
    nextPageToken = searchRes.data.nextPageToken;
  } while (nextPageToken);

  return allVideos;
}
