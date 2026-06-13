import React, { useState } from "react";

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

export default function EditPlaylistModal({ row, onClose, onSave, onDelete, showStatus }) {
  const [form, setForm] = useState(unflatten(row));

  const updateField = (path, value) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      obj[p] = obj[p] || {};
      obj = obj[p];
    }
    obj[parts[parts.length - 1]] = value;
    setForm(updated);
  };

  const updateArray = (path, index, value) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    const arr = [...(obj[parts[parts.length - 1]] || [])];
    arr[index] = value;
    obj[parts[parts.length - 1]] = arr;
    setForm(updated);
  };

  const addToArray = (path) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
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
          style={{ width: "100%", padding: "6px", marginTop: "4px", minHeight: "80px" }}
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
          width: "700px",
          maxHeight: "85vh",
          overflowY: "auto"
        }}
      >
        <h2>Edit Playlist</h2>

        {renderInput("Slug", "slug")}
        {renderInput("Title", "title")}
        {renderInput("Subtitle", "subtitle")}
        {renderTextarea("Description", "description")}

        {renderArray("Mood", "mood")}
        {renderArray("Genre Focus", "genre_focus")}
        {renderArray("Tracks", "tracks")}
        {renderArray("Featured Artists", "featured_artists")}

        {renderInput("Artwork Cover", "artwork.cover")}
        {renderInput("Artwork Banner", "artwork.banner")}

        {renderInput("Spotify", "links.spotify")}
        {renderInput("Apple Music", "links.apple_music")}
        {renderInput("YouTube Music", "links.youtube_music")}
        {renderInput("Amazon Music", "links.amazon_music")}
        {renderInput("Tidal", "links.tidal")}

        {renderInput("SEO Title", "seo.title")}
        {renderTextarea("SEO Description", "seo.description")}
        {renderArray("SEO Keywords", "seo.keywords")}

        {renderInput("Status", "status")}
        {renderInput("Priority", "internal.priority")}

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button onClick={() => onSave(flatten(form))}>Save</button>
          <button onClick={onClose}>Close</button>
        {/* ⭐ DELETE BUTTON */}
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
