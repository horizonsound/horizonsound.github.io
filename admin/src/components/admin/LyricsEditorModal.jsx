import React, { useState, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { ParagraphWithDataType } from "@/extensions/ParagraphWithDataType";
import { FontSize } from "@/extensions/FontSize";
import { LineHeight } from "@/extensions/LineHeight";
import { cleanLyrics } from "./cleanLyrics";
import "@/styles/lyrics-editor.css";

/* ---------------------------
   SECTION HEADER DETECTOR
---------------------------- */
function isSectionHeader(line) {
  return /^(Intro|Verse|Pre Chorus|Post Chorus|Chorus|Bridge|Outro)$/i.test(
    line.trim()
  );
}

/* ---------------------------
   CONVERT LYRICS TO HTML
---------------------------- */
function lyricsToHtml(text) {
  if (!text) return `<p data-type="lyrics-text"></p>`;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (trimmed === "") {
        return `<p data-type="lyrics-text"><br></p>`;
      }

      if (isSectionHeader(trimmed)) {
        return `<p data-type="lyrics-header">${trimmed}</p>`;
      }

      return `<p data-type="lyrics-text">${trimmed}</p>`;
    })
    .join("");
}

function getColorForLine(section, lineIndex) {
  if (!profile || !profile.sections[section]) return "#888";

  const stats = profile.sections[section];
  const avg = stats.avg;
  const sd = stats.stddev;

  const diff = Math.abs(lineIndex - avg);

  if (diff <= sd) return "green";
  if (diff <= sd * 2) return "orange";
  return "red";
}

/* ---------------------------
   RHYME HELPER
---------------------------- */
function RhymeHelper() {
  const [word, setWord] = React.useState("");
  const [results, setResults] = React.useState("");

  async function fetchRhymes() {
    if (!word.trim()) return;

    const perfect = await fetch(
      `https://api.datamuse.com/words?rel_rhy=${word}`
    ).then((r) => r.json());

    const near = await fetch(
      `https://api.datamuse.com/words?sl=${word}`
    ).then((r) => r.json());

    let output = `Perfect Rhymes:\n`;
    output += perfect.map((w) => w.word).join(", ") || "None";
    output += `\n\nNear Rhymes:\n`;
    output += near.map((w) => w.word).join(", ") || "None";

    setResults(output);
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Rhyme Helper</h3>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter a word"
          style={{ flex: 1, padding: "6px" }}
        />
        <button
          onClick={fetchRhymes}
          style={{
            padding: "6px 12px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Find Rhymes
        </button>
      </div>

      <textarea
        value={results}
        readOnly
        style={{
          width: "100%",
          height: "120px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          fontFamily: "Verdana",
          fontSize: "0.9rem",
          whiteSpace: "pre-wrap",
        }}
      />
    </div>
  );
}

/* ---------------------------
   SYNONYM FINDER
---------------------------- */
function SynonymFinder() {
  const [word, setWord] = React.useState("");
  const [results, setResults] = React.useState([]);

  async function fetchSynonyms() {
    if (!word.trim()) return;

    const data = await fetch(
      `https://api.datamuse.com/words?rel_syn=${word}`
    ).then((r) => r.json());

    setResults(data.map((w) => w.word));
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Synonym Finder</h3>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter a word"
          style={{ flex: 1, padding: "6px" }}
        />
        <button
          onClick={fetchSynonyms}
          style={{
            padding: "6px 12px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Find
        </button>
      </div>

      <textarea
        value={results.join(", ")}
        readOnly
        style={{
          width: "100%",
          height: "120px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          fontFamily: "Verdana",
          fontSize: "0.9rem",
          whiteSpace: "pre-wrap",
        }}
      />
    </div>
  );
}

/* ---------------------------
   SYLLABLE COUNTER
---------------------------- */
function SyllableCounter() {
  const [text, setText] = React.useState("");
  const [count, setCount] = React.useState(0);

  function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return 0;

    const vowels = "aeiouy";
    let syllables = 0;
    let prevVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !prevVowel) syllables++;
      prevVowel = isVowel;
    }

    if (word.endsWith("e") && syllables > 1) syllables--;

    return syllables;
  }

  function handleCount() {
    const words = text.split(/\s+/).filter(Boolean);
    const total = words.reduce((sum, w) => sum + countSyllables(w), 0);
    setCount(total);
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Syllable Counter</h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter a line or phrase"
        style={{
          width: "100%",
          height: "80px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          fontFamily: "Verdana",
          fontSize: "0.9rem",
          marginBottom: "10px",
        }}
      />

      <button
        onClick={handleCount}
        style={{
          padding: "6px 12px",
          background: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "10px",
        }}
      >
        Count Syllables
      </button>

      <div
        style={{
          fontWeight: "bold",
          fontSize: "1rem",
          padding: "6px 0",
        }}
      >
        Total: {count}
      </div>
    </div>
  );
}

/* ---------------------------
   MAIN COMPONENT
---------------------------- */
export default function LyricsEditorModal({ lyrics, artistName, artistId, onSave, onClose })
 {
  const [value, setValue] = useState(lyrics ?? "");
  const [lineNumbers, setLineNumbers] = useState([]);
  const [showRhymeHelper, setShowRhymeHelper] = useState(true);
  const [showSynonyms, setShowSynonyms] = useState(true);
  const [showSyllables, setShowSyllables] = useState(true);
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [profile, setProfile] = useState(null);

  /* ---------------------------
     MAIN EDITOR
  ---------------------------- */
  const editor = useEditor({
    content: lyricsToHtml(lyrics),
    extensions: [
      StarterKit.configure({ paragraph: false }),
      ParagraphWithDataType,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
    ],
    editorProps: {
      attributes: {
        style: `
          font-family: Verdana;
          font-size: 1.2rem;
          line-height: 1.0;
        `,
      },
      handlePaste(view, event) {
        const pasted = event.clipboardData.getData("text/plain");
        if (!pasted) return false;

        const cleaned = cleanLyrics(pasted);
        const html = lyricsToHtml(cleaned);

        editor.commands.insertContent(html);
        event.preventDefault();
        return true;
      },
    },
    onUpdate({ editor }) {
      syncGutter(editor, gutterEditor);
    }
  });

  /* ---------------------------
     GUTTER EDITOR
  ---------------------------- */
  const gutterEditor = useEditor({
    content: lyricsToHtml(lyrics),
    editable: false,
    extensions: [
      StarterKit.configure({ paragraph: false }),
      ParagraphWithDataType,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
    ],
    editorProps: {
      attributes: {
        style: `
          font-family: Verdana;
          font-size: 1.2rem;
          line-height: 1.0;
          pointer-events: none;
          user-select: none;
        `,
      },
    },
  });

useEffect(() => {
  fetch("/api/admin/data/artists")
    .then(r => r.json())
    .then(data => {
      console.log("ARTISTS:", data);
      setArtists(data); // because API returns an array
    });
}, []);

useEffect(() => {
  if (!selectedArtist) return;

  fetch(`/api/admin/data/profiles/${selectedArtist}`)
    .then(r => r.json())
    .then(files => {
      // Normalize: remove .json if present
      const normalized = files.map(f => f.replace(".json", ""));

      setStyles(normalized);

      // Auto-select if only one style
      if (normalized.length === 1) {
        setSelectedStyle(normalized[0]);
      }
    });
}, [selectedArtist]);

useEffect(() => {
  if (!selectedArtist || !selectedStyle) return;

  fetch(`/data/profiles/${selectedArtist}/${selectedStyle}.json`)
    .then(r => r.json())
    .then(json => {
      console.log("Loaded profile:", json);
      setProfile(json);
    });
}, [selectedArtist, selectedStyle]);

useEffect(() => {
  if (editor && gutterEditor && profile) {
    syncGutter(editor, gutterEditor);
  }
}, [profile]);

/* ---------------------------
     INITIAL SYNC
  ---------------------------- */
  useEffect(() => {
    if (editor && gutterEditor) {
      gutterEditor.commands.setContent(editor.getHTML());
    }
  }, [editor, gutterEditor]);

  // Auto-select artist from workbench record
useEffect(() => {
  if (!artists.length) return;
  if (!artistName) return;

  const match = artists.find(a => a.name.full === artistName);

  if (match) {
    setSelectedArtist(match.id);
  }
}, [artists, lyrics]);

  /* ---------------------------
     CLEAN BUTTON
  ---------------------------- */
  function handleCleanLyrics() {
    if (!editor) return;

    const rawText = editor.getText();
    const cleanedText = cleanLyrics(rawText);
    const cleanedHtml = lyricsToHtml(cleanedText);

    editor.commands.setContent(cleanedHtml);
    setValue(cleanedText);
  }

  /* ---------------------------
     COPY BUTTON
  ---------------------------- */
  function handleCopyLyrics() {
    const html = editor.getHTML();

    let text = html
      .replace(/<\/p>\s*<p[^>]*>/g, "\n")
      .replace(/<br\s*\/?>/g, "")
      .replace(/<\/?p[^>]*>/g, "")
      .trim();

    text = text.replace(/\n{3,}/g, "\n\n");

    navigator.clipboard.writeText(text);
    alert("Lyrics copied to clipboard");
  }

  function countSyllables(text) {
    text = text.toLowerCase();
    if (text.length === 0) return 0;

    // Remove punctuation
    text = text.replace(/[^a-z]/g, "");

    // No letters = no syllables
    if (!text) return 0;

    // Count vowel groups
    const groups = text.match(/[aeiouy]+/g);
    let count = groups ? groups.length : 0;

    // Subtract silent "e"
    if (text.endsWith("e")) count--;

    return Math.max(1, count);
  }

  function buildGutterHtml(editor) {
    if (!editor) return "";

    const html = editor.getHTML();
    const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gs) || [];

    let currentSection = null;
    let lineIndexInSection = 0;

  return paragraphs
    .map((p) => {
      const isHeader = p.includes('data-type="lyrics-header"');

      // Extract inner text
      const inner = p.replace(/<[^>]+>/g, "").trim();

      // CASE 1: Section header
      if (isHeader) {
        currentSection = inner;      // Track the active section
        lineIndexInSection = 0;      // Reset line counter
        return p.replace(/>(.*?)</s, `>&nbsp;<`);
      }

      // CASE 2: Blank line
      if (inner.length === 0) {
        lineIndexInSection++;        // Still counts as a line in the section
        return p.replace(/>(.*?)</s, `>&nbsp;<`);
      }

      // CASE 3: Normal lyric line
      const syllables = countSyllables(inner);

      // Determine color
      const color = getColorForLine(currentSection, lineIndexInSection);

      // Increment line index AFTER using it
      lineIndexInSection++;

      return p.replace(
        />(.*?)</s,
        `><span style="color:${color}">${syllables}</span><`
      );
    })
    .join("");
}
  function getColorForLine(section, index) {
    if (!profile || !profile.sections || !profile.sections[section]) {
      return "#888"; // default gray
    }

    const stats = profile.sections[section];
    const avg = stats.avg;
    const sd = stats.stddev;

    const diff = Math.abs(index - avg);

    if (diff <= sd) return "green";
    if (diff <= sd * 2) return "orange";
    return "red";
  }

  function syncGutter(editor, gutterEditor) {
    if (!editor || !gutterEditor) return;

    const gutterHtml = buildGutterHtml(editor);
    gutterEditor.commands.setContent(gutterHtml);
  }

  useEffect(() => {
    if (editor && gutterEditor) {
      syncGutter(editor, gutterEditor);
    }
  }, [editor, gutterEditor]);

  /* ---------------------------
     RETURN JSX
  ---------------------------- */
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
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "40px",
      zIndex: 10000,
      minHeight: 0,
    }}
  >
    <div
      style={{
        background: "white",
        width: "min(1150px, 95vw)",
        height: "90vh",
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <h2>Edit Lyrics</h2>

        <div>
          <button
            onClick={() => onSave(value)}
            style={{
              padding: "6px 12px",
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Save
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              background: "#ccc",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>

<select
  value={selectedArtist || ""}
  onChange={(e) => setSelectedArtist(e.target.value)}
>
  <option value="">Select Artist</option>
{artists.map(a => (
  <option key={a.id} value={a.id}>
    {a.name.full}
  </option>
))}
</select>

<select
  value={selectedStyle || ""}
  onChange={(e) => setSelectedStyle(e.target.value)}
  disabled={!styles.length}
>
  <option value="">Select Style</option>
  {styles.map(s => (
    <option key={s} value={s}>{s}</option>
  ))}
</select>

          <button
              onClick={async () => {
                fetch(`${window.location.origin}/api/admin/data/learn-profiles`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({})
                });
              }}
              style={{
                marginLeft: "auto",
                padding: "6px 10px",
                background: "#4a7cff",
                color: "white",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Learn
            </button>
          </div>
      </div>

      {/* WORKSPACE — FIXED STRUCTURE */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "20px",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN */}
        <div
          style={{
            width: "600px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "10px",
              alignItems: "center",
              flexWrap: "nowrap",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "10px",
                alignItems: "center",
                flexWrap: "nowrap",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {/* Font Family */}
              <select
                defaultValue="Verdana"
                onChange={(e) =>
                  editor.chain().focus().setFontFamily(e.target.value).run()
                }
              >
                <option value="Verdana">Verdana</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
              </select>

              {/* Font Size */}
              <select
                defaultValue="1.2rem"
                onChange={(e) =>
                  editor.chain().focus().setFontSize(e.target.value).run()
                }
              >
                <option value="1rem">Small</option>
                <option value="1.2rem">Large</option>
                <option value="1.4rem">XL</option>
                <option value="1.6rem">XXL</option>
              </select>

              {/* Line Height */}
              <select
                defaultValue="1.0"
                onChange={(e) =>
                  editor.chain().focus().setLineHeight(e.target.value).run()
                }
              >
                <option value="1.0">1.0</option>
                <option value="1.2">1.2</option>
                <option value="1.4">1.4</option>
                <option value="1.6">1.6</option>
                <option value="2.0">2.0</option>
              </select>

              {/* Color */}
              <input
                type="color"
                onChange={(e) =>
                  editor.chain().focus().setColor(e.target.value).run()
                }
              />

              {/* Bold */}
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <b>B</b>
              </button>

              {/* Italic */}
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <i>I</i>
              </button>

              {/* Underline */}
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <u>U</u>
              </button>

              {/* Undo */}
              <button
                onClick={() => editor.chain().focus().undo().run()}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                ⟲
              </button>

              {/* Redo */}
              <button
                onClick={() => editor.chain().focus().redo().run()}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                ⟳
              </button>

              {/* Copy */}
              <button
                onClick={handleCopyLyrics}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                📋
              </button>

              {/* Clean */}
              <button
                onClick={handleCleanLyrics}
                style={{
                  padding: "4px 6px",
                  fontSize: "0.9rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                🧹
              </button>
            </div>

          </div>

          {/* SCROLL CONTAINER */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",   // ⭐ REQUIRED
              border: "1px solid #ccc",   // ✅ border here
            }}
            ref={(el) => {
              if (!el || !editor || !gutterEditor) return;
              const sync = () => {
                gutterEditor.view.dom.parentElement.scrollTop = el.scrollTop;
              };
              el.addEventListener("scroll", sync);
            }}
          >
            {/* Gutter */}
            <div
              className="lyrics-editor"
              style={{
                width: "50px",
                padding: "10px",
                borderRight: "1px solid #ccc",
                minHeight: 0,
                minWidth: 0,
                border: 0,
                height: "100%",        // stretch with scroll container
              }}
            >
              <EditorContent editor={gutterEditor} />
            </div>

            {/* Lyrics */}
            <div
              className="lyrics-editor"
              style={{
                width: "450px",
                padding: "10px",
                minHeight: 0,
                minWidth: 0,
                border: 0,
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Tools (NOW CORRECTLY INSIDE WORKSPACE) */}
        <div
          style={{
            width: "500px",
            flexShrink: 0,
            minWidth: 0,
            overflowY: "auto",
            paddingRight: "25px",
            minHeight: 0,
          }}
        >
          {/* Rhyme Helper */}
          <div
            onClick={() => setShowRhymeHelper(!showRhymeHelper)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              padding: "8px 0",
              fontWeight: "bold",
              borderBottom: "1px solid #eee",
              userSelect: "none",
            }}
          >
            <span>Rhyme Helper</span>
            <span>{showRhymeHelper ? "▾" : "▸"}</span>
          </div>

          {showRhymeHelper && (
            <div style={{ paddingTop: "10px" }}>
              <RhymeHelper />
            </div>
          )}

          {/* Synonym Finder */}
          <div
            onClick={() => setShowSynonyms(!showSynonyms)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              padding: "8px 0",
              fontWeight: "bold",
              borderBottom: "1px solid #eee",
              userSelect: "none",
            }}
          >
            <span>Synonym Finder</span>
            <span>{showSynonyms ? "▾" : "▸"}</span>
          </div>

          {showSynonyms && (
            <div style={{ paddingTop: "10px" }}>
              <SynonymFinder />
            </div>
          )}

          {/* Syllable Counter */}
          <div
            onClick={() => setShowSyllables(!showSyllables)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              padding: "8px 0",
              fontWeight: "bold",
              borderBottom: "1px solid #eee",
              userSelect: "none",
            }}
          >
            <span>Syllable Counter</span>
            <span>{showSyllables ? "▾" : "▸"}</span>
          </div>

          {showSyllables && (
            <div style={{ paddingTop: "10px" }}>
              <SyllableCounter />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}



{/* 
===========================================================
LYRIC EDITOR – CONTAINER HIERARCHY REFERENCE (ARCHITECTURE)
===========================================================

[ Modal Overlay ]
    • Full‑screen darkened background
    • Centers the modal container

    ↓

[ Modal Container ]
    • White box
    • height: 90vh
    • flex-direction: column
    • Contains header + workspace

    ↓

[ Header ]
    • "Edit Lyrics" title
    • Save / Close buttons

    ↓

[ Workspace (flex row) ]
    • The two-column layout
    • overflow: hidden
    • Contains LEFT COLUMN + RIGHT COLUMN

    ├── LEFT COLUMN
    │       • flex-direction: column
    │       • Contains toolbar + scroll container
    │
    │       ↓
    │
    │   [ Toolbar ]
    │       • Font controls, bold/italic/etc.
    │
    │       ↓
    │
    │   [ Scroll Container ]
    │       • overflow-y: auto
    │       • flex row containing:
    │           - Gutter wrapper
    │           - Editor wrapper
    │
    │       ↓
    │
    │   [ Gutter Wrapper ]
    │       • width: 50px
    │       • border-right: 1px solid #ccc
    │       • Contains TipTap gutter editor
    │
    │       ↓
    │
    │   [ .ProseMirror (gutter) ]
    │       • TipTap internal DOM
    │
    │
    │   [ Editor Wrapper ]
    │       • width: 450px
    │       • Contains TipTap main lyrics editor
    │
    │       ↓
    │
    │   [ .ProseMirror (lyrics) ]
    │       • TipTap internal DOM
    │       • This is the element that can overflow if not constrained
    │
    │
    └── RIGHT COLUMN (Tools)
            • width: 500px
            • overflow-y: auto
            • Contains:
                - Rhyme Helper
                - Synonym Finder
                - Syllable Counter

NOTES:
• The border you see scrolling upward is the gutter wrapper’s border-right.
• The overflow issue happens when .ProseMirror grows taller than the scroll container.
• TipTap inserts .ProseMirror automatically inside each EditorContent.
• This diagram reflects the actual DOM structure rendered by your JSX + TipTap.

===========================================================
END OF REFERENCE
===========================================================
*/}
