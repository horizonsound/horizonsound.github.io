import React, { useState, useMemo, useEffect } from "react";
import RowActionsMenu from "./RowActionsMenu";
import { assembleLyricsForDistroKid, formatForDistroKid } from "../../utils/lyricsTools";
import EditWorkbenchModal from "./EditWorkbenchModal";
import EditPlaylistModal from "./EditPlaylistModal";
import EditReleaseModal from "./EditReleaseModal";
import EditTrackModal from "./EditTrackModal";
import EditArtistModal from "./EditArtistModal";

export default function AdminDataTable({
  rows,
  pendingChanges,
  onEdit,
  onDelete,
  isWorkbench,
  artists = [],
  showStatus,
  type,
  filters,
  setFilters,
  onOpenLyricsEditor,
  groupedRows,
  collapsedGroups,
  toggleGroup,
  sortColumn,
  sortDirection,
  onSort
}: {
  rows: any[];
  pendingChanges: Record<string, any>;
  onEdit: (id: string, key: string, value: any) => void;
  onDelete: (id: string) => void;
  isWorkbench?: boolean;
  artists?: any[];
  showStatus: (msg: string) => void;
  type: string;

  filters: Record<string, string | null>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  onOpenLyricsEditor: (text: string, onSave: (cleaned: string) => void) => void;

  groupedRows: Record<string, any[]>;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (name: string) => void;

  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (col: string, direction?: "asc" | "desc") => void;
}) {
  const [openMenu, setOpenMenu] = useState<{ col: string | null; x: number; y: number }>({
    col: null,
    x: 0,
    y: 0
  });
  const [filterPanel, setFilterPanel] = useState<string | null>(null);

  const artistMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const a of artists) {
      if (a.name?.full) {
        map[a.name.full] = a;
      }
    }
    return map;
  }, [artists]);

  const styleMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const a of artists) {
      const name = a.name?.full;
      const styles = a.vocal_identity?.styles;
      if (name && styles) {
        map[name] = styles;
      }
    }
    return map;
  }, [artists]);

  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(null);

  const hasRows = rows && rows.length > 0;

  const datasetSignature = useMemo(() => {
    if (!rows || rows.length === 0) return "empty";
    return Object.keys(rows[0]).join("|");
  }, [rows]);

  const initialColumns = useMemo(() => {
    if (!hasRows) return [];

    const set = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
    }

    return Array.from(set);
  }, [datasetSignature]);

  const PRIORITY_COLUMNS = ["group", "id", "title", "artist", "status"];

  const columns = useMemo(() => {
    const ordered: string[] = PRIORITY_COLUMNS.filter(col =>
      initialColumns.includes(col)
    );
    const remaining = initialColumns.filter(col => !ordered.includes(col));
    return [...ordered, ...remaining];
  }, [initialColumns]);

  function handleHeaderClick(col: string, direction?: "asc" | "desc") {
    onSort(col, direction);
  }

  function renderSortIndicator(col: string) {
    if (col !== sortColumn) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  const artistOptions = useMemo(() => {
    if (!isWorkbench) return [];
    return artists.map(a => ({
      id: a.id,
      name: a.name.full
    }));
  }, [artists, isWorkbench]);

  type EditRowState = {
    type: string;
    row: any;
  } | null;

  const [editRow, setEditRow] = useState<EditRowState>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const startResizing = (
    e: React.MouseEvent<HTMLDivElement>,
    col: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const startX = e.clientX;
    const startWidth =
      columnWidths[col] || target.parentElement!.offsetWidth;

    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      setColumnWidths(prev => ({
        ...prev,
        [col]: Math.max(60, newWidth)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "auto";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    const close = () => {
      setOpenMenu({ col: null, x: 0, y: 0 });
      setFilterPanel(null);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function handleExportWorkbench(row: any) {
    const raw =
      typeof row.lyrics_raw === "string"
        ? row.lyrics_raw
        : typeof row.lyrics === "string"
        ? row.lyrics
        : "";

    if (!raw.trim()) {
      showStatus("No lyrics to export.");
      return;
    }

    const formatted = formatForDistroKid(raw);
    navigator.clipboard.writeText(formatted);
    showStatus("Copied Workbench lyrics to clipboard");
  }

  async function handlePublish(row: any) {
    try {
      const res = await fetch("/api/admin/data/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row })
      });

      const data = await res.json();

      if (!data.ok) {
        showStatus("Publish failed.");
        return;
      }

      showStatus(`Published track: ${data.result.title}`);
    } catch (err) {
      console.error("Publish failed:", err);
      showStatus("Publish failed — check server logs.");
    }
  }

  function handleExportTrack(row: any) {
    const sections = row.lyrics;

    if (!sections || typeof sections !== "object") {
      showStatus("No sectioned lyrics available for export.");
      return;
    }

    const formatted = assembleLyricsForDistroKid(sections);
    navigator.clipboard.writeText(formatted);
    showStatus("Copied Track lyrics to clipboard");
  }

  if (!hasRows) return <p>No rows loaded.</p>;

  return (
    <>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",   // horizontal scroll ONLY if needed
          // no overflowY here at all
          display: "block",
        }}
      >
        <table
          style={{
            width: "max-content",
            minWidth: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            tableLayout: "fixed"
          }}
        >
          <thead>
            <tr
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "#f7f7f7"
              }}
            >
              <th style={{ width: "30px" }}></th>

              {columns.map(col => (
                <th
                  key={col}
                  onClick={e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setOpenMenu({
                      col,
                      x: rect.left,
                      y: rect.bottom
                    });
                  }}
                  style={{
                    borderBottom: "2px solid #ccc",
                    padding: "6px",
                    textAlign: "left",
                    background: "#f7f7f7",
                    fontWeight: 600,
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    position: "relative",
                    width: columnWidths[col] || 180,
                    maxWidth: columnWidths[col] || 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {col}
                  {renderSortIndicator(col)}

                  <div
                    onMouseDown={e => {
                      e.stopPropagation();
                      startResizing(e, col);
                    }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      height: "100%",
                      width: "8px",
                      cursor: "col-resize",
                      zIndex: 10
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedRows)
              .sort(([a], [b]) => a.localeCompare(b)) // alphabetical group order
              .map(([groupName, groupRows]) => (
              <React.Fragment key={groupName}>
                <tr
                  style={{
                    background: "#e9e9e9",
                    cursor: "pointer",
                    fontWeight: 600,
                    position: "sticky",
                    top: 28,
                    zIndex: 5,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    backgroundColor: "#e9e9e9"   // ⭐ ADD THIS
                  }}
                  onClick={() => toggleGroup(groupName)}
                >
                  <td
                    colSpan={columns.length + 1}
                    style={{
                      padding: "8px",
                      borderBottom: "2px solid #ccc",
                      userSelect: "none"
                    }}
                  >
                    {collapsedGroups[groupName] === true ? "▼" : "▶" } {groupName} (
                    {groupRows.length})
                  </td>
                </tr>

                {!collapsedGroups[groupName] !== true &&
                  groupRows.map(row => (
                    <tr
                      key={row.id}
                      style={{
                        background:
                          isWorkbench && row.status === "published"
                            ? "#f0f0f0"
                            : "transparent"
                      }}
                    >
                      <td style={{ width: "30px", padding: "6px" }}>
                        <RowActionsMenu
                          row={row}
                          onEdit={() => setEditRow({ type, row })}
                          onOpenLyricsEditor={onOpenLyricsEditor}
                          onExport={() =>
                            isWorkbench
                              ? handleExportWorkbench(row)
                              : handleExportTrack(row)
                          }
                          onDelete={onDelete}
                          onPublish={() => handlePublish(row)}
                          showStatus={showStatus}
                        />
                      </td>

                      {columns.map(col => {
                        const id = row.id;

                        const isEditing =
                          editingCell &&
                          editingCell.id === id &&
                          editingCell.key === col;

                        const pendingValue =
                          pendingChanges[id] && pendingChanges[id][col];

                        const displayValue =
                          pendingValue !== undefined ? pendingValue : row[col];

                        const isObject =
                          displayValue &&
                          typeof displayValue === "object" &&
                          !Array.isArray(displayValue);

                        return (
                          <td
                            key={col}
                            onClick={e => {
                              if (col === "id") {
                                e.stopPropagation();
                                setEditRow({ type, row });
                                return;
                              }

                              if (!Array.isArray(displayValue) && !isObject) {
                                e.stopPropagation();
                                setEditingCell({ id, key: col });
                              }
                            }}
                            style={{
                              color: col === "id" ? "#0070f3" : "inherit",
                              textDecoration: col === "id" ? "underline" : "none",
                              cursor:
                                col === "id"
                                  ? "pointer"
                                  : Array.isArray(displayValue) || isObject
                                  ? "default"
                                  : "text",
                              borderBottom: "1px solid #eee",
                              padding: "6px",
                              verticalAlign: "top",
                              width: columnWidths[col] || 200,
                              maxWidth: columnWidths[col] || 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              background:
                                pendingValue !== undefined ? "#fff7d6" : "transparent"
                            }}
                          >
                            {isEditing ? (
                              isWorkbench && col === "artist" ? (
                                <select
                                  autoFocus
                                  defaultValue={displayValue ?? ""}
                                  onBlur={e => {
                                    const selectedName = e.target.value;
                                    const artist = artistOptions.find(
                                      a => a.name === selectedName
                                    );

                                    if (artist) {
                                      onEdit(id, "artist", artist.name);
                                      onEdit(id, "artist_id", artist.id);

                                      const fullArtist = artists.find(
                                        a => a.id === artist.id
                                      );
                                      if (fullArtist) {
                                        const base =
                                          fullArtist.vocal_identity?.base;
                                        if (base) onEdit(id, "prompt.base", base);

                                        const model =
                                          fullArtist.vocal_identity?.model;
                                        if (model) onEdit(id, "prompt.model", model);
                                      }
                                    }

                                    setEditingCell(null);
                                  }}
                                  style={{
                                    width: "100%",
                                    fontSize: "14px",
                                    padding: "4px"
                                  }}
                                >
                                  <option value="">— Select Artist —</option>
                                  {artistOptions.map(a => (
                                    <option key={a.id} value={a.name}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              ) : isWorkbench && col === "prompt.style" ? (
                                <select
                                  autoFocus
                                  defaultValue={displayValue ?? ""}
                                  onBlur={e => {
                                    const styleKey = e.target.value;

                                    if (styleKey !== displayValue) {
                                      onEdit(id, col, styleKey);
                                    }

                                    const artistName = row.artist;
                                    const stylesForArtist =
                                      styleMap[artistName] || {};
                                    const styleText = stylesForArtist[styleKey];

                                    if (styleText) {
                                      onEdit(id, "prompt.style", styleText);
                                    }

                                    setEditingCell(null);
                                  }}
                                  style={{
                                    width: "100%",
                                    fontSize: "14px",
                                    padding: "4px"
                                  }}
                                >
                                  <option value="">— Select Style —</option>
                                  {Object.keys(styleMap[row.artist] || {}).map(
                                    key => (
                                      <option key={key} value={key}>
                                        {key}
                                      </option>
                                    )
                                  )}
                                </select>
                              ) : (
                                <input
                                  autoFocus
                                  defaultValue={String(displayValue ?? "")}
                                  onBlur={e => {
                                    const newValue = e.target.value;
                                    const originalValue = String(
                                      displayValue ?? ""
                                    );

                                    if (newValue !== originalValue) {
                                      onEdit(id, col, newValue);
                                    }

                                    setEditingCell(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") {
                                      const input = e.target as HTMLInputElement;
                                      const newValue = input.value;
                                      const originalValue = String(
                                        displayValue ?? ""
                                      );

                                      if (newValue !== originalValue) {
                                        onEdit(id, col, newValue);
                                      }

                                      setEditingCell(null);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingCell(null);
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    fontSize: "14px",
                                    padding: "4px"
                                  }}
                                />
                              )
                            ) : col === "id" ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%"
                                }}
                              >
                                <span>{formatCell(displayValue)}</span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%"
                                }}
                              >
                                {formatCell(displayValue)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filterPanel && (
        <div
          style={{
            position: "fixed",
            top: openMenu.y,
            left: openMenu.x + 160,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            zIndex: 9999,
            padding: "10px",
            width: "200px"
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ marginBottom: "6px", fontWeight: 600 }}>
            Filter: {filterPanel}
          </div>

          <select
            value={filters[filterPanel!] ?? ""}
            onChange={e => {
              const value = e.target.value;
              setFilters(prev => ({
                ...prev,
                [filterPanel!]: value || null
              }));
            }}
            style={{ width: "100%", padding: "4px" }}
          >
            <option value="">(all)</option>

            {Array.from(
              new Set(
                rows.map(r => {
                  const raw = r[filterPanel!];
                  if (raw === null || raw === undefined) return "(blank)";
                  if (typeof raw === "object") return JSON.stringify(raw);
                  return String(raw);
                })
              )
            ).map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <button
            style={{ marginTop: "10px", width: "100%" }}
            onClick={() => setFilterPanel(null)}
          >
            Close
          </button>
        </div>
      )}

      {openMenu.col && (
        <div
          style={{
            position: "fixed",
            top: openMenu.y,
            left: openMenu.x,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            zIndex: 9999,
            padding: "4px 0",
            width: "150px"
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{ padding: "6px 12px", cursor: "pointer" }}
            onClick={() => {
              if (!openMenu.col) return;
              handleHeaderClick(openMenu.col, "asc");
              setOpenMenu({ col: null, x: 0, y: 0 });
            }}
          >
            Sort (A → Z)
          </div>

          <div
            style={{ padding: "6px 12px", cursor: "pointer" }}
            onClick={() => {
              if (!openMenu.col) return;
              handleHeaderClick(openMenu.col, "desc");
              setOpenMenu({ col: null, x: 0, y: 0 });
            }}
          >
            Sort (Z → A)
          </div>

          <div
            style={{ padding: "6px 12px", cursor: "pointer" }}
            onClick={() => {
              setFilterPanel(openMenu.col);
              setOpenMenu({ col: null, x: 0, y: 0 });
            }}
          >
            Filter…
          </div>
        </div>
      )}

      {editRow && editRow.type === "artists" && (
        <EditArtistModal
          row={editRow.row}
          onClose={() => setEditRow(null)}
          onSave={(updated: Record<string, any>) => {
            const id = updated.id;
            for (const key in updated) {
              if (key !== "id") onEdit(id, key, updated[key]);
            }
            setEditRow(null);
          }}
          onDelete={onDelete}
          showStatus={showStatus}
        />
      )}

      {editRow && editRow.type === "releases" && (
        <EditReleaseModal
          row={editRow.row}
          onClose={() => setEditRow(null)}
          onSave={(updated: Record<string, any>) => {
            const id = updated.id;
            for (const key in updated) {
              if (key !== "id") onEdit(id, key, updated[key]);
            }
            setEditRow(null);
          }}
          onDelete={onDelete}
          showStatus={showStatus}
        />
      )}

      {editRow && editRow.type === "playlists" && (
        <EditPlaylistModal
          row={editRow.row}
          onClose={() => setEditRow(null)}
          onSave={(updated: Record<string, any>) => {
            const id = updated.id;
            for (const key in updated) {
              if (key !== "id") onEdit(id, key, updated[key]);
            }
            setEditRow(null);
          }}
          onDelete={onDelete}
          showStatus={showStatus}
        />
      )}

      {editRow && editRow.type === "workbench" && (
        <EditWorkbenchModal
          row={editRow.row}
          onClose={() => setEditRow(null)}
          onSave={(updated: Record<string, any>) => {
            const id = updated.id;
            for (const key in updated) {
              if (key !== "id") onEdit(id, key, updated[key]);
            }
            setEditRow(null);
          }}
          onDelete={onDelete}
          showStatus={showStatus}
          artists={artists}
          onOpenLyricsEditor={(text: string, saveCallback: (cleaned: string) => void) => {
            onOpenLyricsEditor(text, saveCallback);
          }}
        />
      )}

      {editRow && editRow.type === "tracks" && (
        <EditTrackModal
          row={editRow.row}
          onClose={() => setEditRow(null)}
          onSave={(updated: Record<string, any>) => {
            const id = updated.id;
            for (const key in updated) {
              if (key !== "id") onEdit(id, key, updated[key]);
            }
            setEditRow(null);
          }}
          onDelete={onDelete}
          showStatus={showStatus}
        />
      )}
    </>
  );
}

function formatCell(value: any) {
  if (Array.isArray(value)) {
    return `🗂️ ${value.length} items`;
  }

  if (value && typeof value === "object") {
    const count = Object.keys(value).length;
    return `🗂️ ${count} items`;
  }

  if (value === null || value === undefined) return "";
  return String(value);
}
