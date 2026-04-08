// scripts/generate-hashtags.js

export function generateHashtags(songs) {
  return songs.map(song => {
    const hashtags = buildHashtags(song);
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

  // Deduplicate + limit to 12
  return Array.from(new Set(all)).slice(0, 12);
}
