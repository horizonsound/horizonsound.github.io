export async function getItemsByGenre() {
  const res = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/catalog`);
  if (!res.ok) throw new Error("Failed to load catalog");
  return res.json();
}
