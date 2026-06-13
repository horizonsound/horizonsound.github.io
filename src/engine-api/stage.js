export async function getStage() {
  const stageRes = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/stage`);
  const stage = await stageRes.json();

  const releasesRes = await fetch(`${import.meta.env.PUBLIC_ENGINE_URL}/releases`);
  const releases = await releasesRes.json();

  console.log("🔥 RAW STAGE:", stage);
  console.log("🔥 RAW RELEASES:", releases);

  const resolve = (id) => releases.find(r => r.id === id) || null;

  const enrichedCards = stage.cards.map(card => {
    const albums = Object.entries(card.albums || {})
    .sort(([a], [b]) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10);
        const numB = parseInt(b.replace(/\D/g, ""), 10);
        return numA - numB;
    })
    .map(([_, id]) => resolve(id));

    const singles = Object.entries(card.singles || {})
    .sort(([a], [b]) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10);
        const numB = parseInt(b.replace(/\D/g, ""), 10);
        return numA - numB;
    })
    .map(([_, id]) => resolve(id));

    const enriched = { ...card, albums, singles };
    console.log("🔥 ENRICHED CARD:", enriched);
    return enriched;
  });

  const enrichedStage = { ...stage, cards: enrichedCards };
  console.log("🔥 FINAL ENRICHED STAGE:", enrichedStage);

  return enrichedStage;
}
