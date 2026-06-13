import React, { useState, useEffect } from "react";
import {
  assembleLyricsSections,
  splitLyricsIntoSections
} from "./lyricsUtils";

function unflatten(obj) {
  const result = {};
  for (const key in obj) {
    const parts = key.split(".");
    let target = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!target[p]) target[p] = {};
      target = target[p];
    }
    target[parts[parts.length - 1]] = obj[key];
  }
  return result;
}

function flatten(obj, prefix = "", res = {}) {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, newKey, res);
    } else {
      res[newKey] = value;
    }
  }
  return res;
}

export default function EditTrackModal({ row, onClose, onSave, onDelete, showStatus }) {
  const [form, setForm] = useState(unflatten(row));
  const [lyricsText, setLyricsText] = useState("");
  const [lyricsError, setLyricsError] = useState(null);

  const updateField = (path, value) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      obj[parts[i]] = obj[parts[i]] || {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    setForm(updated);
  };

  const updateArray = (path, index, value) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    const arr = [...(obj[parts[parts.length - 1]] || [])];
    arr[index] = value;
    obj[parts[parts.length - 1]] = arr;
    setForm(updated);
  };

  const addToArray = (path) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    const arr = [...(obj[parts[parts.length - 1]] || [])];
    arr.push("");
    obj[parts[parts.length - 1]] = arr;
    setForm(updated);
  };

  const renderInput = (label, path) => {
    const parts = path.split(".");
    let value = form;
    for (const p of parts) value = value?.[p];
    return (
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontWeight: "bold" }}>{label}</label>
        <input
          value={value ?? ""}
          onChange={(e) => updateField(path, e.target.value)}
          style={{ width: "100%", padding: "6px", marginTop: "4px" }}
        />
      </div>
    );
  };

  const renderTextarea = (label, path) => {
    const parts = path.split(".");
    let value = form;
    for (const p of parts) value = value?.[p];
    return (
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontWeight: "bold" }}>{label}</label>
        <textarea
          value={value ?? ""}
          onChange={(e) => updateField(path, e.target.value)}
          style={{ width: "100%", padding: "6px", marginTop: "4px", minHeight: "100px" }}
        />
      </div>
    );
  };

  const renderArray = (label, path) => {
    const parts = path.split(".");
    let arr = form;
    for (const p of parts) arr = arr?.[p];
    arr = arr || [];

    return (
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontWeight: "bold" }}>{label}</label>
        {arr.map((item, i) => (
          <input
            key={i}
            value={item}
            onChange={(e) => updateArray(path, i, e.target.value)}
            style={{ width: "100%", padding: "6px", marginTop: "4px" }}
          />
        ))}
        <button onClick={() => addToArray(path)} style={{ marginTop: "6px" }}>
          + Add
        </button>
      </div>
    );
  };

  const renderLyrics = () => {
    return (
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontWeight: "bold" }}>Lyrics (full text)</label>
        <textarea
          value={lyricsText}
          onChange={(e) => {
            setLyricsError(null);
            setLyricsText(e.target.value);
          }}
          style={{ width: "100%", padding: "6px", marginTop: "4px", minHeight: "220px" }}
          placeholder={`[Verse]\nFirst line...\nSecond line...\n\n[Chorus]\n...`}
        />
        {lyricsError && (
          <div style={{ color: "red", marginTop: "6px", whiteSpace: "pre-wrap" }}>
            {lyricsError}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const sections = form.lyrics || [];
    const assembled = assembleLyricsSections(sections);
    setLyricsText(assembled);
  }, [form.lyrics]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          width: "750px",
          maxHeight: "85vh",
          overflowY: "auto"
        }}
      >
        <h2>Edit Track</h2>

        {renderInput("Slug", "slug")}
        {renderInput("Title", "title")}
        {renderInput("Subtitle", "subtitle")}
        {renderInput("Status", "status")}
        {renderInput("Mastered", "mastered")}
        {renderInput("Type", "type")}
        {renderInput("Primary Artist", "primary_artist")}
        {renderArray("Featuring Artists", "featuring_artists")}
        {renderArray("Release IDs", "release_ids")}
        {renderInput("Is Instrumental", "is_instrumental")}
        {renderTextarea("Lyrics Excerpt", "lyrics_excerpt")}

        <h3>Suno Vocal</h3>
        {renderInput("Artist", "suno.vocal.artist")}
        {renderInput("Style", "suno.vocal.style")}
        {renderInput("Model", "suno.vocal.model")}
        {renderInput("Base Snapshot", "suno.vocal.base_snapshot")}
        {renderInput("Style Snapshot", "suno.vocal.style_snapshot")}

        <h3>Suno Production</h3>
        {renderInput("Model", "suno.production.model")}
        {renderTextarea("Prompt", "suno.production.prompt")}

        <h3>Audio</h3>
        {renderInput("Preview MP3", "audio.preview_mp3")}
        {renderInput("Full MP3", "audio.full_mp3")}
        {renderInput("WAV", "audio.wav")}
        {renderInput("Stems ZIP", "audio.stems_zip")}
        {renderInput("Instrumental MP3", "audio.instrumental_mp3")}
        {renderInput("Instrumental WAV", "audio.instrumental_wav")}

        {renderInput("BPM", "bpm")}
        {renderInput("Key", "key")}
        {renderInput("Duration", "duration")}
        {renderInput("Duration Display", "duration_display")}
        {renderInput("ISRC", "isrc")}
        {renderInput("Version", "version")}

        <h3>Genres</h3>
        {renderInput("Primary", "genres.primary")}
        {renderInput("Secondary", "genres.secondary")}
        {renderInput("Tertiary", "genres.tertiary")}

        {renderArray("Moods", "moods")}
        {renderTextarea("Description HTML", "description_html")}
        {renderInput("Context Title", "context_title")}
        {renderTextarea("Context HTML", "context_html")}

        <h3>Artwork</h3>
        {renderInput("Cover", "artwork.cover")}
        {renderInput("Banner", "artwork.banner")}

        <h3>Links</h3>
        {renderInput("Spotify", "links.spotify")}
        {renderInput("Apple Music", "links.apple_music")}
        {renderInput("YouTube Music", "links.youtube_music")}
        {renderInput("Amazon Music", "links.amazon_music")}
        {renderInput("Tidal", "links.tidal")}

        {renderArray("Playlists", "playlists")}

        <h3>Credits</h3>
        {renderArray("Producers", "credits.producers")}
        {renderArray("Writers", "credits.writers")}
        {renderArray("Mixers", "credits.mixers")}
        {renderArray("Mastering Engineers", "credits.mastering_engineers")}
        {renderArray("Musicians", "credits.musicians")}
        {renderArray("Engineers", "credits.engineers")}

        <h3>SEO</h3>
        {renderInput("SEO Title", "seo.title")}
        {renderTextarea("SEO Description", "seo.description")}
        {renderArray("SEO Keywords", "seo.keywords")}

        <h3>Internal</h3>
        {renderInput("Notes", "internal.notes")}
        {renderInput("Priority", "internal.priority")}

        {renderLyrics()}

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              try {
                const structured = splitLyricsIntoSections(lyricsText);
                const nextForm = { ...form, lyrics: structured };
                onSave(flatten(nextForm));
              } catch (err) {
                setLyricsError(err.message || "Invalid lyrics format");
              }
            }}
          >
            Save
          </button>
          <button onClick={onClose}>Close</button>
          <button
            onClick={() => onDelete(row.id)}
            style={{
              background: "red",
              color: "white",
              padding: "6px 12px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
