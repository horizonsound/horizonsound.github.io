export async function GET() {
  const res = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/stage`);
  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Failed to load stage" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
