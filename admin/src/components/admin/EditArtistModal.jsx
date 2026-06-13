import React, { useState } from "react";

function unflatten(obj) {
  const result = {};

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

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

export default function EditArtistModal({ row, onClose, onSave, onDelete, showStatus }) {
  const [form, setForm] = useState(unflatten(row));

  const updateField = (path, value) => {
    const parts = path.split(".");
    const updated = { ...form };
    let obj = updated;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      obj[key] = obj[key] || {};
      obj = obj[key];
    }

    obj[parts[parts.length - 1]] = value;
    setForm(updated);
  };

  const renderInput = (label, path, type = "text") => {
    const parts = path.split(".");
    let value = form;

    for (const p of parts) value = value?.[p];

    return (
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontWeight: "bold" }}>{label}</label>
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => updateField(path, e.target.value)}
          style={{
            width: "100%",
            padding: "6px",
            marginTop: "4px",
            border: "1px solid #ccc",
            borderRadius: "4px"
          }}
        />
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
          overflowY: "auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}
      >
        <h2>Edit Artist</h2>

        {renderInput("Full Name", "name.full")}
        {renderInput("First Name", "name.first")}
        {renderInput("Last Name", "name.last")}
        {renderInput("Initials", "name.initials")}

        {renderInput("Slug", "slug")}
        {renderInput("Status", "status")}
        {renderInput("Type", "type")}
        {renderInput("Tagline", "tagline")}

        {renderInput("Short Bio", "bio_short")}
        {renderInput("Long Bio", "bio_long")}

        {renderInput("Genre (Primary)", "genres.primary")}
        {renderInput("Genre (Secondary)", "genres.secondary")}
        {renderInput("Genre (Tertiary)", "genres.tertiary")}

        {renderInput("Website", "links.website")}
        {renderInput("Spotify", "links.spotify")}
        {renderInput("Apple Music", "links.apple_music")}
        {renderInput("YouTube", "links.youtube")}
        {renderInput("Instagram", "links.instagram")}
        {renderInput("TikTok", "links.tiktok")}
        {renderInput("Twitter", "links.twitter")}

        {renderInput("SEO Title", "seo.title")}
        {renderInput("SEO Description", "seo.description")}

        {renderInput("Internal Notes", "internal.notes")}
        {renderInput("Priority", "internal.priority", "number")}

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button onClick={() => onSave(form)}>Save</button>
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
