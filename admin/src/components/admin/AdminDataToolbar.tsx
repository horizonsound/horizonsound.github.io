import React from "react";

type AdminDataToolbarProps = {
  pendingChanges: Record<string, any>;
  onSave: () => void;
  onCancel: () => void;

  // ⭐ NEW FILTER PROPS
  filters: Record<string, string | null>;
  setFilters: (f: Record<string, string | null>) => void;
};

export default function AdminDataToolbar({
  pendingChanges,
  onSave,
  onCancel,
  filters,
  setFilters
}: AdminDataToolbarProps) {
  const changeCount = Object.values(pendingChanges)
    .reduce((sum, row) => sum + Object.keys(row).length, 0);

  // If no pending changes, still show Clear Filters if filters exist
  const hasFilters = Object.values(filters).some(v => v);

  if (changeCount === 0 && !hasFilters) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        background: "#333",
        color: "white",
        padding: "10px 16px",
        borderBottomLeftRadius: "8px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        zIndex: 9999,
        fontSize: "14px"
      }}
    >
      {changeCount > 0 && (
        <span>📝 {changeCount} changes pending</span>
      )}

      {changeCount > 0 && (
        <>
          <button
            onClick={onSave}
            style={{
              background: "#4caf50",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Save All
          </button>

          <button
            onClick={onCancel}
            style={{
              background: "#d9534f",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </>
      )}

      {/* ⭐ CLEAR FILTERS BUTTON */}
      {hasFilters && (
        <button
          onClick={() => setFilters({})}
          style={{
            background: "#777",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
