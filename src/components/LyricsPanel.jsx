import { useEffect } from "react";

export default function LyricsPanel({ track, onClose }) {
  if (!track) return null;

  const hasLyrics = Array.isArray(track.lyrics) && track.lyrics.length > 0;

  useEffect(() => {
    const body = document.querySelector(".lyrics-body");
    const topFade = document.querySelector(".lyrics-fade-top");
    const bottomFade = document.querySelector(".lyrics-fade-bottom");

    if (!body || !topFade || !bottomFade) return;

    const updateFades = () => {
      const atTop = body.scrollTop <= 0;
      const atBottom =
        body.scrollHeight - body.scrollTop === body.clientHeight;

      topFade.style.opacity = atTop ? "0" : "1";
      bottomFade.style.opacity = atBottom ? "0" : "1";
    };

    body.addEventListener("scroll", updateFades);
    updateFades();

    return () => body.removeEventListener("scroll", updateFades);
  }, []);

  return (
    <div className="lyrics-panel">
      <div className="lyrics-header">
        <span className="lyrics-title">{track.title}</span>
        <button className="lyrics-close" onClick={onClose}>✕</button>
      </div>

      {/* FADES */}
      <div className="lyrics-fade-top"></div>
      <div className="lyrics-fade-bottom"></div>

      <div className="lyrics-body">
        {!hasLyrics && (
          <div className="lyrics-section">
            <div className="lyrics-section-header">No Lyrics Available</div>
            <pre className="lyrics-section-text" style={{ opacity: 0.7 }}>
              This track does not have lyrics yet.
            </pre>
          </div>
        )}

        {hasLyrics &&
          track.lyrics
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(section => (
              <div className="lyrics-section" key={section.order}>
                <div className="lyrics-section-header">{section.type}</div>
                <pre className="lyrics-section-text">{section.text}</pre>
              </div>
            ))}
      </div>
    </div>
  );
}
