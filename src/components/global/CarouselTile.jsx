// @ts-nocheck
import React from "react";

export default function CarouselTile({ track, release = null, inactive = false }) {

  const releaseDate = release?.release_date
    ? new Date(release.release_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const imageSrc =
    track?.artwork?.cover ??
    release?.artwork?.cover ??
    "/assets/thumbnails/fallback.jpg";

  // Add ?track= to the Experience Page URL
  let href;

  if (!inactive) {
    if (release && track) {
      // TRACK TILE → open release + select track
      href = `/experience/${release.slug}?trackId=${track.id}`;
    } else if (!release && track?.slug) {
      // RELEASE TILE → open release, Experience page selects track 1
      href = `/experience/${track.slug}`;
    }
  }

  return (
    <a className={`tile ${inactive ? "inactive" : ""}`} href={href}>
      <div className="tile-image-wrapper">
        <img src={imageSrc} alt={track.title} />

        {inactive && releaseDate && (
          <div className="tile-overlay-coming-soon">Coming {releaseDate}</div>
        )}
      </div>

      <div className="tile-overlay-title">{track.title}</div>
    </a>
  );
}
