// youtube-update-tags.js
import { google } from "googleapis";

export async function updateYoutubeTags(videoId, tags) {
  console.log(`  [YouTube] Updating tags for ${videoId}`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client
  });

  try {
    await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: videoId,
        snippet: { tags }
      }
    });

    console.log(`  [YouTube] ✓ Tags updated successfully`);
  } catch (err) {
    console.error(`  [YouTube] ✗ ERROR updating tags for ${videoId}`);
    console.error("  Message:", err.message);
    console.error("  Stack:", err.stack);
    throw err;
  }
}
