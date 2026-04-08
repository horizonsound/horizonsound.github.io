// scripts/utils/loadYaml.js
import fs from "fs";
import yaml from "js-yaml";

const FEED_PATH = "../_data/youtube_feed.yml";

export function loadSongsYaml() {
  const raw = fs.readFileSync(FEED_PATH, "utf8");
  const parsed = yaml.load(raw);
  return parsed.songs || [];
}

export function writeSongsYaml(songs) {
  const yamlStr = yaml.dump({ songs });
  fs.writeFileSync(FEED_PATH, yamlStr, "utf8");
}
