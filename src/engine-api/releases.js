export async function getReleases() {
  const res = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/releases`);
  if (!res.ok) throw new Error("Failed to load releases");
  return res.json();
}
