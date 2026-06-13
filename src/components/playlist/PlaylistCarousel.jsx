import RowCarousel from "../global/RowCarousel.jsx";
import CarouselTile from "../global/CarouselTile.jsx";

export default function PlaylistCarousel({ playlist, tracks, releases }) {
  function findReleaseForTrack(track) {
    return releases.find((r) =>
      r.tracklist?.some((tl) => tl.track_id === track.id)
    );
  }

  return (
    <RowCarousel title={playlist.title}>
      {tracks.map((track) => {
        const release = findReleaseForTrack(track);
        return (
          <div key={track.id} className="row-item">
            <CarouselTile track={track} release={release} />
          </div>
        );
      })}
    </RowCarousel>
  );
}
