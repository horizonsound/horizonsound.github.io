// generate-hashtags.js

export function generateHashtags(songs) {
  console.log("Starting hashtag generation...\n");

  return songs.map(song => {
    console.log(`---`);
    console.log(`Song: ${song.title}`);
    console.log(`Slug: ${song.song_id}`);
    console.log(`Playlists: ${song.playlists.join(", ")}`);
    console.log(`Vibes: ${song.vibes.join(", ")}`);
    console.log(`Existing tags: ${song.tags.join(", ")}`);

    const hashtags = buildHashtags(song);

    console.log(`Generated hashtags: ${hashtags.join(", ")}\n`);

    return { ...song, hashtags };
  });
}

function buildHashtags(song) {
  const base = [
    "#horizonsound",
    `#${song.title.toLowerCase().replace(/\s+/g, "")}`
  ];

  const vibeTags = (song.vibes || [])
    .map(v => "#" + v.replace(/[^A-Za-z0-9]/g, "").toLowerCase());

  const playlistTags = (song.playlists || [])
    .map(pl => "#" + pl.toLowerCase());

  const existingTags = (song.tags || [])
    .map(t => "#" + t.toLowerCase());

  const all = [...base, ...vibeTags, ...playlistTags, ...existingTags];

  return Array.from(new Set(all)).slice(0, 12);
}
