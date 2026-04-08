// update-youtube.js
import { loadSongsYaml, writeSongsYaml } from "./utils/loadYaml.js";
import { generateHashtags } from "./generate-hashtags.js";
import { updateYoutubeTags } from "./youtube-update-tags.js";

const mode = process.env.MODE || "prod"; // default to prod if not set

async function main() {
  console.log("=== Horizon Sound Metadata Pipeline ===");
  console.log(`Running in MODE: ${mode.toUpperCase()}\n`);

  console.log("Loading songs from YAML...");
  let songs = loadSongsYaml();
  console.log(`Loaded ${songs.length} songs\n`);

  console.log("Generating hashtags...");
  songs = generateHashtags(songs);
  console.log("Hashtag generation complete.\n");

  console.log("Writing updated YAML...");
  try {
    writeSongsYaml(songs);
    console.log("YAML write complete.\n");
  } catch (err) {
    console.error("ERROR WRITING YAML:", err.message);
    console.error(err.stack);
    throw err; // stop execution so we see the failure
  }

  // -----------------------------
  // DEV MODE: Skip YouTube updates
  // -----------------------------
  if (mode === "dev") {
    console.log("DEV MODE: Skipping YouTube tag updates entirely.");
    console.log("DEV MODE: No API calls were made.\n");
    console.log("=== Pipeline Complete (DEV MODE) ===");
    return;
  }

  // -----------------------------
  // PROD MODE: Update YouTube
  // -----------------------------
  console.log("Updating YouTube tags...\n");

  for (const song of songs) {
    console.log(`→ Updating video: ${song.title} (${song.youtube_id})`);
    console.log(`  Hashtags: ${song.hashtags.join(", ")}`);

    try {
      await updateYoutubeTags(song.youtube_id, song.hashtags);
      console.log("  ✓ YouTube update successful\n");
    } catch (err) {
      console.error("  ✗ ERROR updating YouTube:", err.message);
      console.error(err.stack);
    }
  }

  console.log("=== Pipeline Complete (PROD MODE) ===");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  console.error(err.stack);
  process.exit(1);
});
