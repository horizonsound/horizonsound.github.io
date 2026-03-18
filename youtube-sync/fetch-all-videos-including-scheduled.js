require("dotenv").config();
const { google } = require("googleapis");

async function run() {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const channelId = "UCiko-zjojbsoXrsEuBOPbSw"; // Horizon Sound

  let allVideoIds = [];
  let nextPageToken = null;

  do {
    const res = await youtube.search.list({
      part: "id",
      channelId,
      type: "video",
      maxResults: 50,
      order: "date",
      pageToken: nextPageToken || undefined,
      eventType: "upcoming" // <-- scheduled & premieres
    });

    const ids = res.data.items.map((item) => item.id.videoId);
    allVideoIds.push(...ids);

    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);

  console.log("Scheduled / Upcoming videos:", allVideoIds.length);
  console.log(allVideoIds);
}

run();
