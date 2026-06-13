export async function GET() {
  console.log("APPLE_MUSIC_DEVELOPER_TOKEN ROUTE CALLED");

  const value = process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  console.log("APPLE_MUSIC_DEVELOPER_TOKEN:", value);

  return new Response(
    JSON.stringify({ value }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
