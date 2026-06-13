// migrate-ids.ts
// Run with: ts-node migrate-ids.ts
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

type AnyObj = Record<string, any>;

const DATA_DIR = "./data";

const files = {
  artists: "artists.yml",
  releases: "releases.yml",
  tracks: "tracks.yml",
  playlists: "playlists.yml",
};

function loadYaml(filePath: string): AnyObj[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = yaml.load(raw);
  return (doc as AnyObj[]) || [];
}

function saveYaml(filePath: string, data: AnyObj[]) {
  const out = yaml.dump(data, { lineWidth: -1 });
  fs.writeFileSync(filePath, out, "utf8");
}

function buildIdMap(items: AnyObj[], prefix: string): Record<string, string> {
  const map: Record<string, string> = {};
  const sorted = [...items].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );
  sorted.forEach((item, idx) => {
    const oldId = item.id as string;
    const num = String(idx + 1).padStart(3, "0");
    map[oldId] = `${prefix}_${num}`;
  });
  return map;
}

function replaceId(value: any, map: Record<string, string>): any {
  if (typeof value === "string" && map[value]) {
    return map[value];
  }
  return value;
}

function deepRewriteIds(
  obj: any,
  maps: {
    artists: Record<string, string>;
    releases: Record<string, string>;
    tracks: Record<string, string>;
    playlists: Record<string, string>;
  }
): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => deepRewriteIds(v, maps));
  }

  if (obj && typeof obj === "object") {
    const out: AnyObj = {};

    for (const [k, v] of Object.entries(obj)) {
      //
      // 1. Rewrite the object's own ID
      //
      if (k === "id") {
        if (typeof v === "string") {
          if (v.startsWith("art-")) out[k] = replaceId(v, maps.artists);
          else if (v.startsWith("rel-")) out[k] = replaceId(v, maps.releases);
          else if (v.startsWith("trk-")) out[k] = replaceId(v, maps.tracks);
          else if (v.startsWith("ply-")) out[k] = replaceId(v, maps.playlists);
          else out[k] = v;
        } else out[k] = v;
        continue;
      }

      //
      // 2. Artist cross-links
      //
      if (k === "releases") {
        if (Array.isArray(v)) {
          out[k] = v.map((x) => replaceId(x, maps.releases));
        } else out[k] = v;
        continue;
      }

      if (k === "playlists") {
        if (Array.isArray(v)) {
          out[k] = v.map((x) => replaceId(x, maps.playlists));
        } else out[k] = v;
        continue;
      }

      //
      // 3. Track cross-links
      //
      if (k === "primary_artist") {
        out[k] = replaceId(v, maps.artists);
        continue;
      }

      if (k === "featuring_artists") {
        if (Array.isArray(v)) {
          out[k] = v.map((x) => replaceId(x, maps.artists));
        } else out[k] = v;
        continue;
      }

      if (k === "release_ids") {
        if (Array.isArray(v)) {
          out[k] = v.map((x) => replaceId(x, maps.releases));
        } else out[k] = v;
        continue;
      }

      //
      // 4. Release cross-links
      //
      if (k === "tracklist") {
        if (Array.isArray(v)) {
          out[k] = v.map((entry) => {
            if (entry && typeof entry === "object") {
              return {
                ...entry,
                track_id: replaceId(entry.track_id, maps.tracks),
              };
            }
            return entry;
          });
        } else out[k] = v;
        continue;
      }

      //
      // 5. Playlist cross-links
      //
      if (k === "tracks") {
        if (Array.isArray(v)) {
          out[k] = v.map((x) => replaceId(x, maps.tracks));
        } else out[k] = v;
        continue;
      }

      //
      // 6. Default recursion
      //
      out[k] = deepRewriteIds(v, maps);
    }

    return out;
  }

  return obj;
}

function main() {
  const artistsPath = path.join(DATA_DIR, files.artists);
  const releasesPath = path.join(DATA_DIR, files.releases);
  const tracksPath = path.join(DATA_DIR, files.tracks);
  const playlistsPath = path.join(DATA_DIR, files.playlists);

  const artists = loadYaml(artistsPath);
  const releases = loadYaml(releasesPath);
  const tracks = loadYaml(tracksPath);
  const playlists = loadYaml(playlistsPath);

  const artistIdMap = buildIdMap(artists, "art");
  const releaseIdMap = buildIdMap(releases, "rel");
  const trackIdMap = buildIdMap(tracks, "trk");
  const playlistIdMap = buildIdMap(playlists, "ply");

  const maps = {
    artists: artistIdMap,
    releases: releaseIdMap,
    tracks: trackIdMap,
    playlists: playlistIdMap,
  };

  const newArtists = artists.map((a) => deepRewriteIds(a, maps));
  const newReleases = releases.map((r) => deepRewriteIds(r, maps));
  const newTracks = tracks.map((t) => deepRewriteIds(t, maps));
  const newPlaylists = playlists.map((p) => deepRewriteIds(p, maps));

  fs.mkdirSync(path.join(DATA_DIR, "backup"), { recursive: true });
  fs.copyFileSync(artistsPath, path.join(DATA_DIR, "backup", files.artists));
  fs.copyFileSync(releasesPath, path.join(DATA_DIR, "backup", files.releases));
  fs.copyFileSync(tracksPath, path.join(DATA_DIR, "backup", files.tracks));
  fs.copyFileSync(playlistsPath, path.join(DATA_DIR, "backup", files.playlists));

  saveYaml(artistsPath, newArtists);
  saveYaml(releasesPath, newReleases);
  saveYaml(tracksPath, newTracks);
  saveYaml(playlistsPath, newPlaylists);

  console.log("✅ Migration complete. Originals backed up in data/backup.");
}

main();
