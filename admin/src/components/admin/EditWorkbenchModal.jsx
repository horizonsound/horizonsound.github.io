import { cleanLyrics } from "./cleanLyrics";
import { cleanLyricsAction, formatForDistroKid } from "../../utils/lyricsTools";
import React, { useState } from "react";
import "../../styles/data-table.css";

export default function EditWorkbenchModal({
  row,
  onClose,
  onSave,
  onDelete,
  showStatus,
  artists,
  onOpenLyricsEditor
}) {

  // Stable controlled state
  const [local, setLocal] = useState({
    ...row,
    lyrics_raw: row.lyrics_raw ?? row.lyrics ?? "",
    metadata: row.metadata ?? {},
  });

  const [showLyricsEditor, setShowLyricsEditor] = useState(false);

  // Derived state
  const rawLyrics = local.lyrics_raw || "";
  const hasLyrics = rawLyrics.trim().length > 0;
  const isClean = hasLyrics && cleanLyrics(rawLyrics) === rawLyrics;

  // Generic update helper
  function update(key, value) {
    setLocal(prev => ({ ...prev, [key]: value }));
  }

  function isStyledSectionHeader(text) {
    return /^(Intro|Verse|Pre Chorus|Post Chorus|Chorus|Bridge|Outro)$/i.test(
      text.trim()
    );
  }

  function renderStyledLyrics(text) {
    if (!text) return "";

    return text
      .split("\n")
      .map((line) => {
        if (isStyledSectionHeader(line)) {
          return `<div class="bold">${line}</div>`;
        }
        return `<div class="editor-paragraph">${line}</div>`;
      })
      .join("");
  }

  // CLEAN HANDLER (shared logic)
  function handleClean() {
    const { status, cleaned } = cleanLyricsAction(local.lyrics_raw);

    if (status === "empty") {
      showStatus("There are no lyrics to clean.");
      return;
    }

    if (status === "already_clean") {
      showStatus("Lyrics are already clean.");
      return;
    }

    update("lyrics_raw", cleaned);
    showStatus("Lyrics cleaned.");
  }

  function renderStyledLyrics(text) {
    if (!text) return "";

    const lines = text.split("\n");

    return lines
      .map((line) => {
        if (isStyledSectionHeader(line)) {
          return `<div class="bold">${line}</div>`;
        }
        return `<div class="editor-paragraph">${line}</div>`;
      })
      .join("");
  }

  // DISTROKID EXPORT HANDLER (shared logic)
  function handleDistroKidExport() {
    const text = local.lyrics_raw || "";

    if (!text.trim()) {
      showStatus("No lyrics to export.");
      return;
    }

    const formatted = formatForDistroKid(text);
    navigator.clipboard.writeText(formatted);
    showStatus("Lyrics copied to the clipboard.");
  }
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
        width: "600px",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
      }}
    >
    <div
      style={{
        position: "sticky",
        top: 0,
        background: "white",
        padding: "10px 0",
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        borderBottom: "1px solid #ddd",
        zIndex: 10
      }}
    >
      <button
        onClick={() => {
onOpenLyricsEditor(
  local.lyrics_raw ?? "",
  local.artist,
  local.artist_id,
  (cleaned) => {
    const { cleaned: final } = cleanLyricsAction(cleaned);
    update("lyrics_raw", final);
    showStatus("Lyrics cleaned and updated");
  }
);
        }}
      >
        Edit Lyrics
      </button>
      <button onClick={handleDistroKidExport}>DistroKid Export</button>

      <button
        onClick={onClose}
        style={{
          padding: "6px 12px",
          background: "#ccc",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Close
      </button>

      <button
        onClick={() => onSave(local)}
        style={{
          padding: "6px 12px",
          background: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Save
      </button>

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

      <h2>Edit Row</h2>
      <p><strong>ID:</strong> {row.id}</p>

      {/* SIMPLE FIELDS */}
      <label>Title</label>
      <input
        value={local.title ?? ""}
        onChange={e => update("title", e.target.value)}
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Idea</label>
      <textarea
        value={local.idea ?? ""}
        onChange={e => update("idea", e.target.value)}
        style={{ width: "100%", height: "80px", marginBottom: "10px" }}
      />

      <label>Artist</label>
      <select
        value={local.artist_id ?? ""}
        onChange={e => {
          const newId = e.target.value;
          update("artist_id", newId);

          const artist = artists.find(a => a.id === newId);

          if (artist) {
            // Update the human‑readable name
            update("artist", artist.name.full);

            // Auto-fill prompts
            const base = artist.vocal_identity?.base;
            if (base) update("prompt", { ...local.prompt, base });

            const model = artist.vocal_identity?.model;
            if (model) update("prompt", { ...local.prompt, model });
          }
        }}
        style={{ width: "100%", marginBottom: "10px" }}
      >
        <option value="">— Select Artist —</option>
        {artists.map(a => (
          <option key={a.id} value={a.id}>
            {a.name.full}
          </option>
        ))}
      </select>

      <label>Project</label>
      <input
        value={local.project ?? ""}
        onChange={e => update("project", e.target.value)}
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Status</label>
      <input
        value={local.status ?? ""}
        onChange={e => update("status", e.target.value)}
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <div style={{ marginBottom: "10px" }}>
        <label>Lyrics</label>

        {local.lyrics_raw ? (
        <div
          className="lyrics-preview"
          dangerouslySetInnerHTML={{ __html: renderStyledLyrics(local.lyrics_raw) }}
        />
        ) : (
          <div style={{ opacity: 0.6, fontStyle: "italic" }}>
            No lyrics yet. Click “Edit Lyrics” to add them.
          </div>
        )}
      </div>

      <label>Lyric Notes</label>
      <textarea
        value={local.lyricNotes ?? ""}
        onChange={e => update("lyricNotes", e.target.value)}
        style={{ width: "100%", height: "80px", marginBottom: "10px" }}
      />

      <label>Production Notes</label>
      <textarea
        value={local.productionNotes ?? ""}
        onChange={e => update("productionNotes", e.target.value)}
        style={{ width: "100%", height: "80px", marginBottom: "10px" }}
      />

      <label>Voice Model</label>
      <input
        value={local.voiceModel ?? ""}
        onChange={e => update("voiceModel", e.target.value)}
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Final Audio URL</label>
      <input
        value={local.finalAudioUrl ?? ""}
        onChange={e => update("finalAudioUrl", e.target.value)}
        style={{ width: "100%", marginBottom: "10px" }}
      />

      {/* Metadata */}
      <h3>Metadata</h3>

      <label>BPM</label>
      <input
        value={local.metadata?.bpm ?? ""}
        onChange={e =>
          update("metadata", { ...local.metadata, bpm: e.target.value })
        }
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Key</label>
      <input
        value={local.metadata?.key ?? ""}
        onChange={e =>
          update("metadata", { ...local.metadata, key: e.target.value })
        }
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Mood</label>
      <input
        value={local.metadata?.mood ?? ""}
        onChange={e =>
          update("metadata", { ...local.metadata, mood: e.target.value })
        }
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Palette</label>
      <input
        value={local.metadata?.palette ?? ""}
        onChange={e =>
          update("metadata", { ...local.metadata, palette: e.target.value })
        }
        style={{ width: "100%", marginBottom: "10px" }}
      />
      </div>

  </div>
);
}
