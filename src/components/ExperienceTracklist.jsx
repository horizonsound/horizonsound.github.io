import { useState, useRef, useEffect } from "react";
import LyricsPanel from "./LyricsPanel.jsx";

export default function ExperienceTracklist({ tracks, release, artist }) {
  // --- STATE ---
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState(null);
  const [playQueue, setPlayQueue] = useState(tracks);

  const [shuffleEnabled, setShuffleEnabled] = useState(() => {
    if (typeof window === "undefined") return false; // SSR-safe fallback
    const saved = window.localStorage.getItem("shuffleEnabled");
    return saved ? JSON.parse(saved) : false;
  });
  const firstRender = useRef(true);

  // Inline player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0–100

    // --- SHARE URL (SSR SAFE) ---
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const twitterUrl  = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const redditUrl   = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}`;
  const linkUrl     = shareUrl;

  // Read ?trackId= only on the client and set initial index
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("trackId");

    if (trackId) {
      const idx = tracks.findIndex(t => t.id === trackId);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setCurrentIndex(0);
    }
  }, [tracks]);

  // --- HANDLERS ---
  function onLyricsClick(track) {
    setActiveTrack(track);
    setLyricsOpen(true);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function playNext() {
    if (currentIndex + 1 >= playQueue.length) return; // stop when done
    setCurrentIndex(i => i + 1);
    setIsPlaying(true); // intent to keep playing
  }

  function playPrev() {
    if (currentIndex === 0) return;
    setCurrentIndex(i => i - 1);
    setIsPlaying(true); // intent to keep playing
  }

  // Load new track when index or queue changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = playQueue[currentIndex];
    if (!track) return;

    audio.src = track.audio_url;
    setProgress(0);
  }, [currentIndex, playQueue]);

  // Shuffle / unshuffle queue, preserving current track
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const currentTrack = playQueue[currentIndex];
    if (!currentTrack) return;

    if (shuffleEnabled) {
      const shuffled = shuffleArray([...tracks]);
      const newIndex = shuffled.findIndex(t => t.id === currentTrack.id);

      setPlayQueue(shuffled);
      setCurrentIndex(newIndex >= 0 ? newIndex : 0);
    } else {
      const newIndex = tracks.findIndex(t => t.id === currentTrack.id);

      setPlayQueue(tracks);
      setCurrentIndex(newIndex >= 0 ? newIndex : 0);
    }
  }, [shuffleEnabled]); // ⭐ ONLY shuffleEnabled

  // Progress bar updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!audio.duration) {
        setProgress(0);
        return;
      }
      const pct = (audio.currentTime / audio.duration) * 100;
      setProgress(pct);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
    };
  }, []);

  // Auto-advance on track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (currentIndex + 1 < playQueue.length) {
        setCurrentIndex(i => i + 1);
        setIsPlaying(true); // keep playing into next track
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [currentIndex, playQueue]);

  // When a new track finishes loading, auto-play if isPlaying is true
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (isPlaying) {
        audio.play();
      }
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    return () => audio.removeEventListener("loadedmetadata", handleLoaded);
  }, [isPlaying, currentIndex]);

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const progressEl = document.getElementById("inline-progress");
    const currentTimeEl = document.getElementById("inline-current-time");
    const durationEl = document.getElementById("inline-duration");

    if (!progressEl || !currentTimeEl || !durationEl) return;

    function formatTime(sec) {
      if (isNaN(sec)) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    const updateDuration = () => {
      durationEl.textContent = formatTime(audio.duration);
    };

    const updateCurrentTime = () => {
      currentTimeEl.textContent = formatTime(audio.currentTime);
      const pct = (audio.currentTime / audio.duration) * 100;
      progressEl.value = pct || 0;
    };

    const scrub = () => {
      const newTime = (progressEl.value / 100) * audio.duration;
      audio.currentTime = newTime;
    };

    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("timeupdate", updateCurrentTime);
    progressEl.addEventListener("input", scrub);

    return () => {
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("timeupdate", updateCurrentTime);
      progressEl.removeEventListener("input", scrub);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const progressEl = document.getElementById("inline-progress");
    const currentTimeEl = document.getElementById("inline-current-time");
    const durationEl = document.getElementById("inline-duration");

    if (!progressEl || !currentTimeEl || !durationEl) return;

    function formatTime(sec) {
      if (isNaN(sec)) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    const updateDuration = () => {
      durationEl.textContent = formatTime(audio.duration);
    };

    const updateCurrentTime = () => {
      currentTimeEl.textContent = formatTime(audio.currentTime);
      const pct = (audio.currentTime / audio.duration) * 100;
      progressEl.value = pct || 0;
    };

    const scrub = () => {
      const newTime = (progressEl.value / 100) * audio.duration;
      audio.currentTime = newTime;
    };

    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("timeupdate", updateCurrentTime);
    progressEl.addEventListener("input", scrub);

    return () => {
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("timeupdate", updateCurrentTime);
      progressEl.removeEventListener("input", scrub);
    };
  }, []);

  // Keep activeTrack in sync with currentIndex
  useEffect(() => {
    const track = playQueue[currentIndex];
    if (track) {
      setActiveTrack(track);
    }
  }, [currentIndex, playQueue]);

  return (
    <div className="experience-player">

      {/* -------------------------------------- */}
      {/* HERO SECTION */}
      {/* -------------------------------------- */}
      <section className="experience-hero">
        <div className="hero-artwork">
          <img
            src={release?.artwork?.cover ?? "/assets/fallbacks/release-cover.jpg"}
            alt={release?.title ?? "Untitled Release"}
          />
        </div>

        <div className="hero-meta">
          <div className="share-row">
            {twitterUrl && (
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/twitter-icon.png" alt="Twitter" />
              </a>
            )}

            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/facebook-icon.png" alt="Facebook" />
              </a>
            )}

            {redditUrl && (
              <a href={redditUrl} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/reddit-icon.png" alt="Reddit" />
              </a>
            )}

            {linkUrl && (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/link-icon.png" alt="Link" />
              </a>
            )}
          </div>

          <h1 className="hero-title">{release.title}</h1>
          <p className="hero-artist">{artist?.name?.full ?? "Unknown Artist"}</p>

          <div className="hero-actions">
            <button className="hero-play" onClick={togglePlay}>
              <img
                className="hero-play-icon"
                src={isPlaying ? "/assets/icons/pause-icon.png" : "/assets/icons/play-icon.png"}
                alt={isPlaying ? "Pause" : "Play"}
              />
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              className={`hero-shuffle ${shuffleEnabled ? "active" : ""}`}
              onClick={() => {
                setShuffleEnabled(prev => {
                  const next = !prev;
                  localStorage.setItem("shuffleEnabled", JSON.stringify(next));
                  return next;
                });
              }}
            >
              <img
                src="/assets/icons/shuffle-icon.png"
                alt="Shuffle"
                className="hero-shuffle-icon"
              />
              Shuffle
            </button>
          </div>

          <p className="hero-details">
            {release.year} • {release.tracklist.length} songs • {release.genres?.primary}
          </p>
        </div>
      </section>

      {/* -------------------------------------- */}
      {/* INLINE PLAYER */}
      {/* -------------------------------------- */}
      <section className="inline-player glass-panel">
        <audio id="inline-audio" ref={audioRef}></audio>

        <div className="inline-player-meta">
          <h1 className="inline-player-title">{playQueue[currentIndex]?.title}</h1>
          <p className="inline-player-artist">{artist?.name?.full ?? "Unknown Artist"}</p>
        </div>

        <div className="inline-player-controls">
           <button className="inline-control-btn" onClick={playPrev}>
            <img
              src="/assets/icons/previous.png"
              alt="Previous"
              className="inline-previous-icon"
            />
          </button>
          <button className="inline-control-btn inline-play-btn" onClick={togglePlay}>
            <img
              src={isPlaying ? "/assets/icons/pause-icon.png" : "/assets/icons/play-icon.png"}
              alt={isPlaying ? "Pause" : "Play"}
              className="inline-play-icon"
            />
          </button>
          <button className="inline-control-btn" onClick={playNext}>
            <img
              src="/assets/icons/next-icon.png"
              alt="Next"
              className="inline-next-icon"
            />
          </button>
        </div>

        <input
          id="inline-progress"
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => {
            const audio = audioRef.current;
            if (!audio || !audio.duration) return;

            const pct = Number(e.target.value);
            const newTime = (pct / 100) * audio.duration;

            audio.currentTime = newTime;
            setProgress(pct);
          }}
        />

        <div className="inline-time-row">
          <span id="inline-current-time">0:00</span>
          <span id="inline-duration">0:00</span>
        </div>
      </section>

      {/* -------------------------------------- */}
      {/* TRACKLIST + LYRICS PANEL */}
      {/* -------------------------------------- */}
      <section className="experience-tracklist">
        <h2 className="tracklist-title">Tracklist</h2>

        <div className={`tracklist-container ${lyricsOpen ? "shifted" : ""}`}>
          <div className="tracklist">
            {tracks.map((track, index) => (
              <div className="track-block" key={track.id}>
                <div
                  className={`track-row ${activeTrack?.id === track.id ? "active" : ""}`}
                    onClick={() => {
                      const idx = playQueue.findIndex(t => t.id === track.id);
                      if (idx !== -1) {
                        setCurrentIndex(idx);
                        setIsPlaying(true);
                      }
                    }}
                  >
                  <div className="track-left">
                    <span className="track-number">{index + 1}</span>
                    <span className="track-title">{track.title}</span>
                    {activeTrack?.id === track.id && (
                      <div className={`eq-bars ${isPlaying ? "playing" : ""}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                  </div>

                  <div className="track-right">
                    <div className="track-controls">
                      <button
                        className="track-play"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(index);

                          setTimeout(() => {
                            const audio = audioRef.current;
                            if (!audio) return;

                            audio.play();
                            setIsPlaying(true);
                          }, 0);
                        }}
                      >
                        ▶
                      </button>

                      <img
                        src="/assets/icons/lyrics-icon.png"
                        className="lyrics-icon"
                        alt="Lyrics"
                        onClick={() => onLyricsClick(track)}
                      />
                    </div>

                    <span className="track-duration">
                      {track.duration_display}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lyricsOpen && activeTrack && (
            <LyricsPanel
              track={activeTrack}
              onClose={() => setLyricsOpen(false)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
