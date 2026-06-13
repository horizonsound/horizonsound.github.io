import { useEffect, useState } from "react";
import RowCarousel from "../global/RowCarousel.jsx";
import CarouselTile from "../global/CarouselTile.jsx";

// ⭐ Use the engine — NOT direct YAML
import { getReleases } from "../../engine-api/releases";

// ──────────────────────────────────────────────────────────────
//   GRID TILE VIEW -- All tiles in a single large grid, ordered
//                     by track title alphabetically in ascending
//                     order.
// ──────────────────────────────────────────────────────────────
function GridView({ items, trackToReleaseMap }) {
  const sorted = [...items].sort((a, b) => {
    const artistA = a.artist || "";
    const artistB = b.artist || "";
    if (artistA !== artistB) return artistA.localeCompare(artistB);
    return a.title.localeCompare(b.title);
  });
  return (
    <div className="shelf-grid-view">
      <div className="group-row">
        <div className="group-background" />
        <div className="group-tiles">
          {sorted.map((track) => {
            const resolved = trackToReleaseMap[track.id];
            return (
              <CarouselTile
                track={track}
                release={resolved}
                key={track.id}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//   GROUPED TILE VIEW -- Grouped by Artist and ordered by releases
//                        in descending release order, the tiles 
//                        ordered by track order.
// ────────────────────────────────────────────────────────────────
function GroupedView({ items, trackToReleaseMap }) {
  const groups = items.reduce((acc, track) => {
    const key = track.artist || "Unknown Artist";
    if (!acc[key]) acc[key] = [];
    acc[key].push(track);
    return acc;
  }, {});
  return (
    <div className="shelf-grid-view">
      {Object.entries(groups).map(([groupName, tracks]) => (
        <div key={groupName} className="shelf-group">
          <h3 className="shelf-title">{groupName}</h3>
          <div className="group-row">
            <div className="group-background" />
            <div className="group-tiles">
              {tracks.map((track) => {
                const resolved = trackToReleaseMap[track.id];
                return (
                  <CarouselTile
                    track={track}
                    release={resolved}
                    key={track.id}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//   LIST TILE VIEW -- A simple track list of all tracks, ordered
//                     by track title alphabetically in ascending
//                     order.
// ──────────────────────────────────────────────────────────────
function ListView({ items, trackToReleaseMap }) {
  return (
    <div className="explorer-list explorer-list-table">
      <div className="explorer-list-header">
        <div className="col-artist">Artist</div>
        <div className="col-genre">Genre</div>
        <div className="col-year">Year</div>
        <div className="col-release">Release</div>
      </div>
{items.map((track) => {
  const release = trackToReleaseMap[track.id];
  const releaseName = release?.title || release?.name || release?.slug || "—";

  return (
    <div className="explorer-list-row" key={track.id}>
      <div className="col-title">
<a href={`/experience/${release?.slug}?trackId=${track.id}`}>
  {track.title}
</a>
      </div>
      <div className="col-artist">{track.artist || "—"}</div>
      <div className="col-genre">{track.genre || "—"}</div>
      <div className="col-year">{track.year || "—"}</div>
      <div className="col-release">{releaseName}</div>
    </div>
  );
})}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//   CAROUSEL VIEW -- Each release will have it's own carousel with
//                    the carousels grouped by artist, so each 
//                    artists carousels stay together. The tracks 
//                    in the carousel will be ordered by the track 
//                    order.
// ────────────────────────────────────────────────────────────────
function CarouselView({ items, trackToReleaseMap }) {
  const groups = items.reduce((acc, track) => {
    const key = track.artist || "Unknown Artist";
    if (!acc[key]) acc[key] = [];
    acc[key].push(track);
    return acc;
  }, {});

  return Object.entries(groups).map(([artist, tracks]) => (
    <RowCarousel key={artist} title={artist}>
      {tracks.map((track) => {
        const resolved = trackToReleaseMap[track.id];
        return (
          <div key={track.id} className="row-item">
            <CarouselTile track={track} release={resolved} />
          </div>
        );
      })}
    </RowCarousel>
  ));
}

//
// ─────────────────────────────────────────────────────────────
//   MAIN EXPLORER RENDERER — ALL FIXED + LOGGING
// ─────────────────────────────────────────────────────────────
//

export default function ExplorerRenderer({ items }) {
  const [view, setView] = useState("carousel");
const [releases, setReleases] = useState([]);


  // Restore saved view
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("explorer_view");
      if (saved) setView(saved);
    } catch {}
  }, []);

  // Broadcast view changes (including restored)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("explorer:view", { detail: view })
    );
  }, [view]);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ genres: [], artists: [] });
  const [sort, setSort] = useState(null);

  useEffect(() => {
  const onView = (e) => {
    setView(e.detail);
    try {
      window.localStorage.setItem("explorer_view", e.detail);
    } catch {}
  };

    window.addEventListener("explorer:view", onView);
    return () => window.removeEventListener("explorer:view", onView);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await getReleases();
      setReleases(data);
    })();
  }, []);

  //
  // ⭐ Build reverse lookup: trackId → release
  //
  const trackToReleaseMap = {};

  for (const release of releases) {
    for (const entry of release.tracklist || []) {
      if (entry.track_id) {
        trackToReleaseMap[entry.track_id] = release;
      }
    }
  }
  const trackOrderMap = {};

  for (const release of releases) {
    for (const entry of release.tracklist || []) {
      if (entry.track_id) {
        trackOrderMap[entry.track_id] = entry.track_number ?? Infinity;
      }
    }
  }

  const releaseDateMap = {};

  for (const release of releases) {
    let date = null;

    if (typeof release.release_date === "string") {
      date = new Date(release.release_date);
    } else {
      // Missing or invalid date → treat as oldest possible
      date = new Date(0);
    }

    releaseDateMap[release.id] = date;
  }
const trackReleaseIdMap = {};

for (const release of releases) {
  for (const entry of release.tracklist || []) {
    if (entry.track_id) {
      trackReleaseIdMap[entry.track_id] = release.id;
    }
  }
}

  //
  // ─── EVENT LISTENERS ──────────────────────────────────────
  //
  useEffect(() => {
    const onView = (e) => {
      setView(e.detail);
    };

    const onSearch = (e) => {
      setSearch(e.detail);
    };

    const onFilter = (e) => {
      setFilters(e.detail);
    };

    const onSort = (e) => {
      setSort(e.detail);
    };

    window.addEventListener("explorer:view", onView);
    window.addEventListener("explorer:search", onSearch);
    window.addEventListener("explorer:filter", onFilter);
    window.addEventListener("explorer:sort", onSort);

    return () => {
      window.removeEventListener("explorer:view", onView);
      window.removeEventListener("explorer:search", onSearch);
      window.removeEventListener("explorer:filter", onFilter);
      window.removeEventListener("explorer:sort", onSort);
    };
  }, []);

  //
  // ─── DATA PIPELINE ─────────────────────────────────────────
  //
  let results = [...items];

  if (search.trim() !== "") {
    const q = search.toLowerCase();
    results = results.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        (track.artist && track.artist.toLowerCase().includes(q))
    );
  }

  if (filters.genres.length > 0) {
    results = results.filter((track) =>
      filters.genres.includes(track.genres?.primary?.toLowerCase())
    );
  }

  if (filters.artists.length > 0) {
    results = results.filter((track) =>
      filters.artists.includes((track.artist || "").toLowerCase())
    );
  }

  if (sort === "title") {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "artist") {
    results.sort((a, b) =>
      (a.artist || "").localeCompare(b.artist || "")
    );
  }
  if (sort === "year") {
    results.sort((a, b) => (a.year || 0) - (b.year || 0));
  }

  // ⭐ Sort by release track order if available
results.sort((a, b) => {
  // 1. Artist
  const artistA = (a.artist || "").toLowerCase();
  const artistB = (b.artist || "").toLowerCase();
  if (artistA !== artistB) return artistA.localeCompare(artistB);

  // 2. Release grouping (stable)
  const releaseA = trackReleaseIdMap[a.id] || "";
  const releaseB = trackReleaseIdMap[b.id] || "";
  if (releaseA !== releaseB) return releaseA.localeCompare(releaseB);

  // 3. Track order
  const orderA = trackOrderMap[a.id] ?? Infinity;
  const orderB = trackOrderMap[b.id] ?? Infinity;
  return orderA - orderB;
});

  //
  // ─── VIEW SWITCHING — FIXED + LOGGING
  //

if (view === "carousel")
  return <CarouselView items={results} trackToReleaseMap={trackToReleaseMap} trackOrderMap={trackOrderMap} />;

if (view === "grouped")
  return <GroupedView items={results} trackToReleaseMap={trackToReleaseMap} trackOrderMap={trackOrderMap} />;

if (view === "grid")
  return <GridView items={results} trackToReleaseMap={trackToReleaseMap} trackOrderMap={trackOrderMap} />;

if (view === "list")
  return <ListView items={results} trackToReleaseMap={trackToReleaseMap} trackOrderMap={trackOrderMap} />;

  return <CarouselView items={results} trackToReleaseMap={trackToReleaseMap} />;
}
