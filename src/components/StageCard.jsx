export default function StageCard({ card }) {
  const { hero_image, title, albums, singles } = card;

  return (
    <div
      className="stage-card"
      style={{ backgroundImage: `url(${hero_image})` }}
    >
      <div className="stage-card-overlay">

        <div className="singles-grid">
          {Array.from({ length: 12 }).map((_, i) => {
            const single = singles[i];
            return single ? (
              <a
                key={i}
                href={`/experience/${single.slug}`}
                className="card-single-tile"
                style={{ backgroundImage: `url(${single.artwork.cover})` }}
              />
            ) : (
              <div key={i} className="card-single-tile card-single-tile--empty" />
            );
          })}
        </div>

        <div className="albums-grid">
          {Array.from({ length: 4 }).map((_, i) => {
            const album = albums[i];
            return album ? (
              <a
                key={i}
                href={`/experience/${album.slug}`}
                className="card-album-tile"
                style={{ backgroundImage: `url(${album.artwork.cover})` }}
              />
            ) : (
              <div key={i} className="card-album-tile card-album-tile--empty" />
            );
          })}
        </div>

      </div>

      <div className="stage-card-title">{title}</div>
    </div>
  );
}
