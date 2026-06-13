import React, { useEffect, useState } from "react";
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND
} from "lexical";

import { $patchStyleText } from "@lexical/selection";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export default function LyricsToolbar() {
  const [editor] = useLexicalComposerContext();

  // Persistent formatting defaults
  const [format, setFormat] = useState(() => {
    return (
      JSON.parse(localStorage.getItem("lyricsEditorFormat")) || {
        fontFamily: "Verdana",
        fontSize: "1.2rem",
        color: "#000000",
        lineHeight: "1.0"
      }
    );
  });

  function updateFormat(newValues) {
    const updated = { ...format, ...newValues };
    setFormat(updated);
    localStorage.setItem("lyricsEditorFormat", JSON.stringify(updated));
  }

  // Track selection formatting
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

    useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
        const selection = editorState._selection;

        if (!selection || !selection.hasFormat) {
            setIsBold(false);
            setIsItalic(false);
            setIsUnderline(false);
            return;
        }

        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
        });
    });
    }, [editor]);

  // Apply inline style patching
    function applyStyle(property, value) {
    editor.update(() => {
        const selection = editor.getEditorState()._selection;

        // No selection? Do nothing.
        if (!selection || !selection.getNodes) {
        return;
        }

        const nodes = selection.getNodes();

        // Only patch if at least one text node is present.
        const hasTextNode = nodes.some((n) => n.__text !== undefined);
        if (!hasTextNode) {
        return;
        }

        $patchStyleText({ [property]: value });
    });
    }

  return (
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
        value={format.fontFamily}
        onChange={(e) => {
          updateFormat({ fontFamily: e.target.value });
          applyStyle("font-family", e.target.value);
        }}
      >
        <option value="Verdana">Verdana</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Courier New">Courier New</option>
      </select>

      {/* Font Size */}
      <select
        value={format.fontSize}
        onChange={(e) => {
          updateFormat({ fontSize: e.target.value });
          applyStyle("font-size", e.target.value);
        }}
      >
        <option value="1rem">Small</option>
        <option value="1.2rem">Large</option>
        <option value="1.4rem">XL</option>
        <option value="1.6rem">XXL</option>
      </select>

      {/* Line Spacing */}
      <select
        value={format.lineHeight}
        onChange={(e) => {
          updateFormat({ lineHeight: e.target.value });
          applyStyle("line-height", e.target.value);
        }}
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
        value={format.color}
        onChange={(e) => {
          updateFormat({ color: e.target.value });
          applyStyle("color", e.target.value);
        }}
      />

      {/* Bold */}
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        style={{
          fontWeight: "bold",
          background: isBold ? "#ddd" : "transparent"
        }}
      >
        B
      </button>

      {/* Italic */}
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        style={{
          fontStyle: "italic",
          background: isItalic ? "#ddd" : "transparent"
        }}
      >
        I
      </button>

      {/* Underline */}
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        style={{
          textDecoration: "underline",
          background: isUnderline ? "#ddd" : "transparent"
        }}
      >
        U
      </button>

      {/* Undo */}
      <button onClick={() => editor.dispatchCommand(UNDO_COMMAND)}>
        ⟲
      </button>

      {/* Redo */}
      <button onClick={() => editor.dispatchCommand(REDO_COMMAND)}>
        ⟳
      </button>
    </div>
  );
}
