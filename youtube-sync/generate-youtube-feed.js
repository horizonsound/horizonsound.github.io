import fs from "fs";
import path from "path";
import yaml from "js-yaml";

import {
  fetchAllVideos,
  fetchPlaylistMembership,
  processPlaylistThumbnails
} from "./fetch-youtube-metadata.js";

/* -------------------------------------------------------
   PATHS
------------------------------------------------------- */
const DATA_DIR = "./_data";
const THUMBNAIL_DIR = "./assets/thumbnails";

const VIDEO_FEED_PATH = path.join(DATA_DIR, "youtube_feed.yml");
const PLAYLIST_FEED_PATH = path.join(DATA_DIR, "youtube_playlists.yml");

/* -------------------------------------------------------
   ENSURE DIRECTORIES
------------------------------------------------------- */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/* -------------------------------------------------------
   WRITE YAML
------------------------------------------------------- */
function writeYaml(filepath, data) {
  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, yaml.dump(data), "utf8");
}

/* -------------------------------------------------------
   MAIN GENERATOR
------------------------------------------------------- */
async function generate() {
  console.log("Fetching videos...");
  const videos = await fetchAllVideos();

  console.log("Fetching playlists + membership...");
  const playlists = await fetchPlaylistMembership();

  console.log("Downloading playlist thumbnails...");
  await processPlaylistThumbnails(playlists, THUMBNAIL_DIR);

  console.log("Attaching playlist membership to videos...");
  const playlistMap = {};
  playlists.forEach(pl => {
    pl.videoIds.forEach(id => {
      if (!playlistMap[id]) playlistMap[id] = [];
      playlistMap[id].push(pl.id);
    });
  });

  videos.forEach(video => {
    video.playlists = playlistMap[video.id] || [];
  });

  console.log("Writing youtube_feed.yml...");
  writeYaml(VIDEO_FEED_PATH, videos);

  console.log("Writing youtube_playlists.yml...");
  writeYaml(
    PLAYLIST_FEED_PATH,
    playlists.map(pl => ({
      playlist_id: pl.id,
      title: pl.title,
      slug: pl.slug,
      description: pl.description,
      published_at: pl.publishedAt,
      thumbnail: pl.thumbnail,
      song_ids: pl.videoIds
    }))
  );

  console.log("Done.");
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
