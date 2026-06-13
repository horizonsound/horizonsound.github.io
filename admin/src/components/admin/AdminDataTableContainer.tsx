import { useState, useEffect, useMemo } from "react";
import AdminDataTable from "./AdminDataTable";
import { flatten } from "../../lib/flatten";
import { generateNextId } from "../../lib/generateId";

type AdminDataTableContainerProps = {
  type: string;
  showStatus: (msg: string) => void;
  onOpenLyricsEditor: (text: string, onSave: (cleaned: string) => void) => void;
};

export default function AdminDataTableContainer({
  type,
  showStatus,
  onOpenLyricsEditor
}: AdminDataTableContainerProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [filters, setFilters] = useState<Record<string, string | null>>({});
  const [artists, setArtists] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [stateReady, setStateReady] = useState(false);

  const getStorageKey = (type: string) => `adminTableState_${type}`;

  function toggleGroup(name: string) {
    setCollapsedGroups(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  }

  function sortByIdDesc(rows: any[]) {
    return [...rows].sort((a, b) => {
      const numA = parseInt(String(a.id).split("_")[1] ?? a.id, 10);
      const numB = parseInt(String(b.id).split("_")[1] ?? b.id, 10);
      return numB - numA;
    });
  }

  function handleClearFilters() {
    setFilters({});
    setCollapsedGroups({});
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey(type));
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      return Object.entries(filters).every(([col, value]) => {
        if (!value) return true;
        const cell = row[col] ?? "(blank)";
        return cell === value;
      });
    });
  }, [rows, filters]);

  const groupedRows = useMemo(() => {
    const map: Record<string, any[]> = {};

    for (const row of filteredRows) {
      const groupName = row.group || "Ungrouped";
      if (!map[groupName]) map[groupName] = [];
      map[groupName].push(row);
    }

    const sortedGroupNames = Object.keys(map).sort((a, b) =>
      a.localeCompare(b)
    );

    const result: Record<string, any[]> = {};

    for (const groupName of sortedGroupNames) {
      const groupRows = [...map[groupName]];

      if (!sortColumn) {
        result[groupName] = sortByIdDesc(groupRows);
        continue;
      }

      groupRows.sort((a, b) => {
        if (sortColumn === "id") {
          const numA = parseInt(String(a.id).replace("wb_", ""), 10);
          const numB = parseInt(String(b.id).replace("wb_", ""), 10);
          return sortDirection === "asc" ? numA - numB : numB - numA;
        }

        const A = a[sortColumn];
        const B = b[sortColumn];

        if (typeof A === "number" && typeof B === "number") {
          return sortDirection === "asc" ? A - B : B - A;
        }

        return sortDirection === "asc"
          ? String(A).localeCompare(String(B))
          : String(B).localeCompare(String(A));
      });

      result[groupName] = groupRows;
    }

    return result;
  }, [filteredRows, sortColumn, sortDirection]);

// Restore collapsed groups AFTER groupedRows exists
useEffect(() => {
  console.log("🟩 RESTORE EFFECT FIRED. groupedRows:", groupedRows);

  const key = getStorageKey(type);
  const saved =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;

  console.log("🟥 RAW RESTORED STRING:", { key, saved });

  if (!saved) {
    console.log("🟨 Nothing saved — marking ready");
    setStateReady(true);
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    console.log("🟪 PARSED RESTORED OBJECT:", parsed);

    // ✅ Just use what we saved
    setFilters(parsed.filters || {});
    if (parsed.sortColumn) setSortColumn(parsed.sortColumn);
    if (
      parsed.sortDirection === "asc" ||
      parsed.sortDirection === "desc"
    ) {
      setSortDirection(parsed.sortDirection);
    }

    const restoredCollapsed =
      (parsed.collapsedGroups as Record<string, boolean>) || {};
    console.log("🟧 FINAL COLLAPSED GROUPS APPLIED:", restoredCollapsed);
    setCollapsedGroups(restoredCollapsed);
  } catch (err) {
    console.log("❌ ERROR PARSING RESTORED STATE:", err);
  }

  setStateReady(true);
}, [type]);

useEffect(() => {
  if (!stateReady) return;

  async function load() {
    const data = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/data/${type}`).then(r => r.json());
    const flatRows = data.map((item: any) => flatten(item));
    setRows(sortByIdDesc(flatRows));
  }

  load();
}, [type, stateReady]);

useEffect(() => {
  if (typeof window === "undefined") return;

  const payload = {
    filters,
    collapsedGroups,
    sortColumn,
    sortDirection
  };

  console.log("🟦 SAVING TO LOCAL STORAGE:", {
    key: getStorageKey(type),
    payload
  });

  localStorage.setItem(getStorageKey(type), JSON.stringify(payload));
}, [filters, collapsedGroups, sortColumn, sortDirection, type]);

  const isWorkbench = type === "workbench";

  function updateCell(id: string, key: string, value: any) {
    setPendingChanges(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value
      }
    }));
  }

  async function cancelChanges() {
    setPendingChanges({});
    const data = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/data/${type}`).then(r => r.json());
    const flatRows = data.map((item: any) => flatten(item));
    setRows(sortByIdDesc(flatRows));
  }

  async function saveChanges() {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/data/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: pendingChanges })
    });

    if (res.ok) {
      setPendingChanges({});
      const data = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/data/${type}`).then(r => r.json());
      const flatRows = data.map((item: any) => flatten(item));
      setRows(sortByIdDesc(flatRows));
    }
  }

  useEffect(() => {
    fetch(`${import.meta.env.PUBLIC_API_URL}/admin/data/artists`)
      .then(r => r.json())
      .then(data => setArtists(data));
  }, []);

  async function handleDelete(id: string) {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/data/${type}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (res.ok) {
      showStatus(`Deleted ${id}`);

      setRows(prev => prev.filter(r => r.id !== id));

      setPendingChanges(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  }

  function expandAll() {
    const expanded: Record<string, boolean> = {};
    for (const group of Object.keys(groupedRows)) {
      expanded[group] = true;
    }
    setCollapsedGroups(expanded);
  }

  function collapseAll() {
    const collapsed: Record<string, boolean> = {};
    for (const group of Object.keys(groupedRows)) {
      collapsed[group] = false;
    }
    setCollapsedGroups(collapsed);
  }

  function handleAdd() {
    let newId: string;
    let newRow: any = {};

    switch (type) {
      case "artists":
        newId = generateNextId(rows, "art");
        break;
      case "releases":
        newId = generateNextId(rows, "rel");
        break;
      case "playlists":
        newId = generateNextId(rows, "ply");
        break;
      case "tracks":
        newId = generateNextId(rows, "trk");
        break;
      case "workbench":
        newId = generateNextId(rows, "wb");
        newRow.status = "seed";
        break;
      default:
        console.warn("Unknown type for Add:", type);
        return;
    }

    newRow.id = newId;

    setRows(prev => sortByIdDesc([flatten(newRow), ...prev]));

    setPendingChanges(prev => ({
      ...prev,
      [newId]: newRow
    }));
  }

  function handleSort(col: string, direction?: "asc" | "desc") {
    if (direction) {
      setSortColumn(col);
      setSortDirection(direction);
      return;
    }

    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  }

  return (
    <div
      style={{
        padding: "20px",
        minHeight: "100vh",   // ensures page grows
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2>Type: {type}</h2>
        <div className="admin-table-toolbar-row">
          <div className="toolbar-left">
            <button onClick={handleAdd}>+ Add</button>
            <button onClick={handleClearFilters}>Clear Filters</button>
            <button onClick={expandAll}>Expand All</button>
            <button onClick={collapseAll}>Collapse All</button>
          </div>

          <div className="toolbar-right">
            {Object.keys(pendingChanges).length > 0 && (
              <>
                <button className="save-btn" onClick={saveChanges}>Save</button>
                <button className="cancel-btn" onClick={cancelChanges}>Cancel</button>
              </>
            )}
          </div>
        </div>

        {stateReady && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <AdminDataTable
              rows={filteredRows}
              pendingChanges={pendingChanges}
              onEdit={updateCell}
              onDelete={handleDelete}
              isWorkbench={isWorkbench}
              artists={artists}
              showStatus={showStatus}
              type={type}
              filters={filters}
              setFilters={setFilters}
              onOpenLyricsEditor={onOpenLyricsEditor}
              groupedRows={groupedRows}
              collapsedGroups={collapsedGroups}
              toggleGroup={toggleGroup}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
        )}
      </div>
  );
}
