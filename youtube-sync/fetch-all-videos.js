require("dotenv").config();
const { google } = require("googleapis");

async function run() {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const channelId = "UCiko-zjojbsoXrsEuBOPbSw"; // Horizon Sound

  //
  // 1. PUBLIC + UNLISTED (via uploads playlist)
  //
  const channelRes = await youtube.channels.list({
    part: "contentDetails",
    id: channelId,
  });

  const uploadsPlaylistId =
    channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;

  let publicIds = [];
  let nextPageToken = null;

  do {
    const playlistRes = await youtube.playlistItems.list({
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken || undefined,
    });

    publicIds.push(
      ...playlistRes.data.items.map((item) => item.contentDetails.videoId)
    );

    nextPageToken = playlistRes.data.nextPageToken;
  } while (nextPageToken);

//
// 2. SCHEDULED / FUTURE PUBLISHES (modern method)
//
let scheduledIds = [];
nextPageToken = null;

do {
  const searchRes = await youtube.search.list({
    part: "snippet",
    channelId,
    type: "video",
    maxResults: 50,
    order: "date",
    pageToken: nextPageToken || undefined,
  });

  const futureVideos = searchRes.data.items.filter(item => {
    const publishTime = item.snippet.publishTime;
    return publishTime && new Date(publishTime) > new Date();
  });

  scheduledIds.push(...futureVideos.map(v => v.id.videoId));

  nextPageToken = searchRes.data.nextPageToken;
} while (nextPageToken);

  //
  // 3. MERGE + DEDUPE
  //
  const allIds = Array.from(new Set([...publicIds, ...scheduledIds]));

  console.log("Public/Unlisted:", publicIds.length);
  console.log("Scheduled:", scheduledIds.length);
  console.log("Total unique:", allIds.length);
  console.log(allIds);
}

run();
