import fs from "fs";
import path from "path";
import https from "https";
import { fetchAllVideos } from "./fetch-youtube-metadata.js";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------------
   HTML FORMATTER
------------------------------------------------------- */
function formatHtmlBlock(text) {
  if (!text || text.trim() === "") return "";

  text = text.replace(/\r\n/g, "\n");

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text = text.replace(urlRegex, url => `<a href="${url}">${url}</a>`);

  const hashtagRegex = /(^|\s)#([A-Za-z0-9_]+)/g;
  text = text.replace(hashtagRegex, (match, space, tag) => {
    const lower = tag.toLowerCase();
    return `${space}<a href="https://www.youtube.com/hashtag/${lower}">#${tag}</a>`;
  });

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs.map(p => `<p>${p}</p>`).join("\n");
}

/* -------------------------------------------------------
   YAML BLOCK BUILDER
------------------------------------------------------- */
function buildYamlBlock(html) {
  if (!html || html.trim() === "") return "|\n";

  const indented = html
    .split("\n")
    .map(line => "      " + line)
    .join("\n");

  return "|\n" + indented + "\n";
}

/* -------------------------------------------------------
   DOWNLOAD IMAGE
------------------------------------------------------- */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, response => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        return resolve(false);
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close();
        resolve(true);
      });
    }).on("error", err => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/* -------------------------------------------------------
   INCREMENTING FILENAME
------------------------------------------------------- */
function getIncrementedFilename(baseName, folder = "_data") {
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  let candidate = baseName;
  let counter = 1;

  while (fs.existsSync(path.join(folder, candidate))) {
    candidate = `${name} (${counter})${ext}`;
    counter++;
  }

  return path.join(folder, candidate);
}

/* -------------------------------------------------------
   MAIN GENERATOR
------------------------------------------------------- */
async function generatePreviewYAML() {
  try {
    const videos = await fetchAllVideos();

    videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const thumbnailFolder = path.join("assets", "thumbnails");
    if (!fs.existsSync(thumbnailFolder)) {
      fs.mkdirSync(thumbnailFolder, { recursive: true });
    }

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`Downloading thumbnail ${i + 1} of ${videos.length}: ${video.slug}`);

      if (video.thumbnailUrl) {
        const thumbnailPath = path.join(thumbnailFolder, `${video.slug}.jpeg`);
        await downloadImage(video.thumbnailUrl, thumbnailPath);
      }
    }

    const songsFolder = "_songs";
    if (!fs.existsSync(songsFolder)) {
      fs.mkdirSync(songsFolder, { recursive: true });
    }

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const songFilePath = path.join(songsFolder, `${video.slug}.md`);
      const content = `---\nlayout: song\nsong_id: ${video.slug}\n---\n`;
      fs.writeFileSync(songFilePath, content, "utf8");
      console.log(`Created song file: ${songFilePath}`);
    }

    let yamlOutput = "songs:\n";

    videos.forEach(video => {
      const descriptionHtml = formatHtmlBlock(video.description);
      const lyricsHtml = formatHtmlBlock(video.lyrics);

      yamlOutput += `  - song_id: "${video.slug}"\n`;
      yamlOutput += `    title: "${video.title}"\n`;
      yamlOutput += `    subtitle: ""\n`;
      yamlOutput += `    youtube_id: "${video.id}"\n`;
      yamlOutput += `    url: "/music/${video.slug}/"\n`;
      yamlOutput += `    image: "/assets/thumbnails/${video.slug}.jpeg"\n`;
      yamlOutput += `    videostatus: "${video.status}"\n`;
      yamlOutput += `    primary_playlist: "${video.primaryPlaylist}"\n`;
      yamlOutput += `    sequence: "${video.sequence}"\n`;
      yamlOutput += `    scheduled_at: "${video.scheduledAt}"\n`;

      yamlOutput += `    metadata:\n`;
      yamlOutput += `      published_at: "${video.metadata.published_at}"\n`;
      yamlOutput += `      channel_id: "${video.metadata.channel_id}"\n`;
      yamlOutput += `      channel_title: "${video.metadata.channel_title}"\n`;
      yamlOutput += `      category_id: "${video.metadata.category_id}"\n`;

      yamlOutput += `      tags:`;
      if (video.metadata.tags.length === 0) {
        yamlOutput += ` []\n`;
      } else {
        yamlOutput += `\n`;
        video.metadata.tags.forEach(tag => {
          yamlOutput += `        - "${tag}"\n`;
        });
      }

      yamlOutput += `      duration: "${video.metadata.duration}"\n`;
      yamlOutput += `      definition: "${video.metadata.definition}"\n`;

      yamlOutput += `      region_allowed:`;
      if (video.metadata.region_allowed.length === 0) {
        yamlOutput += ` []\n`;
      } else {
        yamlOutput += `\n`;
        video.metadata.region_allowed.forEach(r => {
          yamlOutput += `        - "${r}"\n`;
        });
      }

      yamlOutput += `      region_blocked:`;
      if (video.metadata.region_blocked.length === 0) {
        yamlOutput += ` []\n`;
      } else {
        yamlOutput += `\n`;
        video.metadata.region_blocked.forEach(r => {
          yamlOutput += `        - "${r}"\n`;
        });
      }

      yamlOutput += `      content_rating: "${video.metadata.content_rating}"\n`;

      yamlOutput += `      statistics:\n`;
      yamlOutput += `        view_count: "${video.metadata.statistics.view_count}"\n`;
      yamlOutput += `        like_count: "${video.metadata.statistics.like_count}"\n`;
      yamlOutput += `        favorite_count: "${video.metadata.statistics.favorite_count}"\n`;
      yamlOutput += `        comment_count: "${video.metadata.statistics.comment_count}"\n`;

      yamlOutput += `      made_for_kids: ${video.metadata.made_for_kids}\n`;
      yamlOutput += `      self_declared_made_for_kids: ${video.metadata.self_declared_made_for_kids}\n`;

      yamlOutput += `      topic_categories:`;
      if (video.metadata.topic_categories.length === 0) {
        yamlOutput += ` []\n`;
      } else {
        yamlOutput += `\n`;
        video.metadata.topic_categories.forEach(url => {
          yamlOutput += `        - "${url}"\n`;
        });
      }

      yamlOutput += `    description_html: ${buildYamlBlock(descriptionHtml)}`;
      yamlOutput += `    lyrics_html: ${buildYamlBlock(lyricsHtml)}\n`;
    });

    const outputFile = getIncrementedFilename("music_preview.yml");
    fs.writeFileSync(outputFile, yamlOutput, "utf8");

    console.log("Preview YAML written to:", outputFile);
  } catch (err) {
    console.error("Error generating preview YAML:", err);
  }
}

generatePreviewYAML();
