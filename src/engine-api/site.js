export async function getOrigins() {
  const url = `${import.meta.env.PUBLIC_ENGINE_URL}/site`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load site data");
  const data = await res.json();
  return data.origins;
}
