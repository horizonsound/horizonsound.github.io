require("dotenv").config();
const { google } = require("googleapis");

async function run() {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  // 1. Get the uploads playlist ID for your channel
  const channelId = "UCiko-zjojbsoXrsEuBOPbSw"; // Horizon Sound channel ID

  const channelRes = await youtube.channels.list({
    part: "contentDetails",
    id: channelId,
  });

  if (!channelRes.data.items.length) {
    console.error("Channel not found.");
    return;
  }

  const uploadsPlaylistId =
    channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;

  console.log("Uploads playlist:", uploadsPlaylistId);

  // 2. Loop through the uploads playlist and collect all video IDs
  let videoIds = [];
  let nextPageToken = null;

  do {
    const playlistRes = await youtube.playlistItems.list({
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken || undefined,
    });

    const ids = playlistRes.data.items.map(
      (item) => item.contentDetails.videoId
    );

    videoIds.push(...ids);

    nextPageToken = playlistRes.data.nextPageToken;
  } while (nextPageToken);

  // 3. Output the full list
  console.log("Total videos:", videoIds.length);
  console.log(videoIds);
}

run();
