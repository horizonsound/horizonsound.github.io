import { useState, useEffect } from "react";

interface AdminDataNavProps {
  types: string[];
  defaultType: string;
}

export default function AdminDataNav({ types, defaultType }: AdminDataNavProps) {
  const [selected, setSelected] = useState(defaultType);

  useEffect(() => {
    setSelected(defaultType);
  }, [defaultType]);

  return (
    <nav className="admin-nav">
      {types.map((t: string) => (
        <div
          key={t}
          className={`nav-item ${selected === t ? "selected" : ""}`}
          onClick={() => {
            setSelected(t); // update visual highlight
            window.dispatchEvent(
              new CustomEvent("admin-data-select", { detail: t })
            );
          }}
        >
          {t === "youtube_metadata"
            ? "YouTube Metadata"
            : t.charAt(0).toUpperCase() + t.slice(1)}
        </div>
      ))}
    </nav>
  );
}
