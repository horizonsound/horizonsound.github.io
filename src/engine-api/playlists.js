export async function getPlaylists() {
  const res = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/playlists`);
  if (!res.ok) throw new Error("Failed to load playlists");
  return res.json();
}
