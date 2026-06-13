export async function getTracks() {
  const res = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/tracks`);
  if (!res.ok) throw new Error("Failed to load tracks");
  return res.json();
}
