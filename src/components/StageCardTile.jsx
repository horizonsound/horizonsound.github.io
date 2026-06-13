import { useEffect, useState } from "react";

export default function StageCardTile({ releaseId, slot }) {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    setRelease(window.__RELEASES__?.[releaseId]);
  }, [releaseId]);

  if (!release) {
    return <div className={`tile missing ${slot}`}>Missing</div>;
  }

  return (
  <div className={`card-tile ${slot}`}>
    <div className="card-tile-image-wrapper">
      <img src={release.cover} alt={release.title} />
    </div>
    <div className="card-tile-overlay-title">{release.title}</div>
  </div>
  );
}
