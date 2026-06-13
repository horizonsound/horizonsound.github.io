export async function getAllArtists() {
  const res = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/artists`);
  const artists = await res.json();

  // Compatibility layer: website expects only active artists
  return artists.filter(a => a.status === "active");
}
