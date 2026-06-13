export function getTrackIndexForRelease(track, release) {
  if (!track || !release || !release.tracklist) return 0;

  const entry = release.tracklist.find(t => t.track_id === track.id);
  if (!entry) return 0;

  // Convert 1‑based track_number → 0‑based index
  return (entry.track_number ?? 1) - 1;
}
