import { useState, useEffect } from "react";
import AdminDataNav from "./AdminDataNav";
import AdminDataTableContainer from "./AdminDataTableContainer";
import LyricsEditorModal from "./LyricsEditorModal";

const types = [
  "artists",
  "playlists",
  "releases",
  "stage",
  "tracks",
  "youtube_metadata",
  "workbench"
];

export default function AdminDataLayout() {
  const [type, setType] = useState("artists");

  // NEW: status bar state
  const [status, setStatus] = useState<string | null>(null);

  function showStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2000);
  }

  const [lyricsEditor, setLyricsEditor] = useState({
    open: false,
    text: "",
    artistName: null,
    artistId: null,
    onSave: null
  });

function openLyricsEditor(text, artistName, artistId, onSave) {
  setLyricsEditor({
    open: true,
    text,
    artistName,
    artistId,
    onSave
  });
}

  function closeLyricsEditor() {
    setLyricsEditor(prev => ({ ...prev, open: false }));
  }

  useEffect(() => {
    const saved = localStorage.getItem("admin-data-type");
    if (saved) setType(saved);
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setType(e.detail);
      localStorage.setItem("admin-data-type", e.detail);
    };

    window.addEventListener("admin-data-select", handler as EventListener);
    return () =>
      window.removeEventListener("admin-data-select", handler as EventListener);
  }, []);

  return (
    <>
      {/* NEW: Status bar */}
      {status && (
        <div className="admin-status">
          {status}
        </div>
      )}

      <div className="admin-data-layout">
        <AdminDataNav types={types} defaultType={type} />

        <div className="admin-data-table">
          <AdminDataTableContainer
            type={type}
            showStatus={showStatus}
            onOpenLyricsEditor={openLyricsEditor}
          />
        </div>
      </div>

      {lyricsEditor.open && (
<LyricsEditorModal
  lyrics={lyricsEditor.text}
  artistName={lyricsEditor.artistName}
  artistId={lyricsEditor.artistId}
  onSave={(cleaned) => {
    if (lyricsEditor.onSave) lyricsEditor.onSave(cleaned);
    closeLyricsEditor();
  }}
  onClose={closeLyricsEditor}
/>
      )}

      <style>{`
        .admin-status {
          background: #333;
          color: white;
          padding: 8px 12px;
          font-size: 14px;
        }

        .admin-data-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        .admin-nav {
          width: 220px;
          flex-shrink: 0;
          border-right: 1px solid #ddd;
          padding: 20px;
          background: #fafafa;
        }

        .nav-item {
          padding: 10px 0;
          cursor: pointer;
        }

        .nav-item.selected {
          font-weight: bold;
          color: #0077ff;
        }

        .admin-data-table {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
      `}</style>
    </>
  );
}
