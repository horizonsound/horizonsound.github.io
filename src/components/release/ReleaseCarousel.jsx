import React from "react";
import RowCarousel from "../global/RowCarousel.jsx";
import CarouselTile from "../global/CarouselTile.jsx";

export default function ReleaseCarousel({ release, tracks }) {
  const tracksForRelease = release.tracklist
    .map(tl => tracks.find(t => t.id === tl.track_id))
    .filter(Boolean);

  return (
    <RowCarousel title={release.displayTitle} >
      {tracksForRelease.map(track => (
        <div key={track.id} className="row-item">
          <CarouselTile
            track={track}
            release={release}
          />
        </div>
      ))}
    </RowCarousel>
  );
}
