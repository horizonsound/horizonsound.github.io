import React, { useState, useEffect, useRef } from "react";

export default function RowActionsMenu({
  row,
  onEdit,
  onExport,
  onDelete,
  onPublish,
  showStatus,
  onOpenLyricsEditor
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const isLocked = row.checklist?.lyricsLocked === true;

  useEffect(() => {
    function handleClickOutside(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          padding: 0,
        }}
      >
        ⋮
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: 0,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 100,
          }}
        >
          {/* EDIT */}
          <button
            onClick={() => {
              setOpen(false);
              onEdit && onEdit();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 12px",
              background: "none",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Edit
          </button>

          {/* DIRECT LYRICS EDIT TEST */}
          {onOpenLyricsEditor && (
            <button
              onClick={() => {
                setOpen(false);
                onOpenLyricsEditor(
                  row.lyrics_raw ?? row.lyrics ?? "",
                  (cleaned) => {
                    onEdit(row.id, "lyrics_raw", cleaned);
                  }
                );
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Edit Lyrics (Direct)
            </button>
          )}

          {/* DISTROKID EXPORT */}
          {onExport && (
            <button
              onClick={() => {
                setOpen(false);
                onExport(row);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              DistroKid Export
            </button>
          )}

          {/* PUBLISH */}
          {onPublish && (
            <button
              onClick={() => {
                setOpen(false);
                onPublish(row);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Publish
            </button>
          )}

          {/* DELETE */}
          {onDelete && (
            <button
              onClick={() => {
                setOpen(false);
                onDelete(row.id);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                color: "red",
                fontWeight: 600,
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
