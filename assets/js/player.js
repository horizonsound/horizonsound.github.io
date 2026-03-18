let YT_PLAYER = null;
let YT_READY = false;

function onYouTubeIframeAPIReady() {
  YT_READY = true;
}

function safeLoadSong(songId) {
  if (!YT_READY) {
    setTimeout(() => safeLoadSong(songId), 50);
    return;
  }
  loadSong(songId);
}

function buildPlayer(youtubeId) {
  if (!YT_READY || !ensurePlayerContainer()) {
    setTimeout(() => buildPlayer(youtubeId), 50);
    return;
  }

  if (!YT_PLAYER) {
    YT_PLAYER = new YT.Player('player-container', {
      videoId: youtubeId,
      playerVars: {
        autoplay: 1,
        mute: 0,
        controls: 1,
        rel: 0
      },
      events: {
        'onStateChange': onPlayerStateChange
      }
    });
  } else {
    YT_PLAYER.loadVideoById(youtubeId);
  }
}

function ensurePlayerContainer() {
  return document.getElementById("player-container") !== null;
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    advanceToNextSong(window.SELECTED_SONG_ID);
  }
}

function loadSong(songId) {
  window.SELECTED_SONG_ID = songId;

  const song = window.YOUTUBE_SONGS.find(s => s.song_id === songId);
  const override = window.MUSIC_OVERRIDES.find(s => s.song_id === songId);

  const title = override?.title || song?.title || "";
  const subtitle = override?.subtitle || "";
  const extraTitle = override?.extra_title || "";
  const extraHTML = override?.extra_html || "";
  const about = song?.description_html || "";
  const lyricsHTML = override?.lyrics_html || "";
  const youtubeId = song?.youtube_id || "";

  document.querySelector(".player-title").textContent = title;
  document.querySelector(".player-subtitle").textContent = subtitle;

  buildPlayer(youtubeId);

  document.getElementById("selected-song-extra").innerHTML = `
    ${extraTitle ? `<h3 class="section-header">${extraTitle}</h3>` : ""}
    ${extraHTML ? `<div class="about-text">${extraHTML}</div>` : ""}
  `;

  document.getElementById("selected-song-about").innerHTML = `
    ${about ? `<h3 class="section-header">About</h3>` : ""}
    ${about ? `<div class="about-text">${about}</div>` : ""}
  `;

  document.getElementById("selected-song-lyrics").innerHTML = lyricsHTML || "";

  highlightTile(songId);
}

function highlightTile(songId) {
  const tiles = document.querySelectorAll('.shared-tile');
  tiles.forEach(t => t.classList.remove('active'));

  const activeTile = document.querySelector(`.shared-tile[data-song-id="${songId}"]`);
  if (!activeTile) return;

  activeTile.classList.add('active');

  const strip = activeTile.closest('.content-strip, .horizontal-strip');
  if (strip) {
    strip.scrollTo({
      left: activeTile.offsetLeft - strip.offsetWidth / 2 + activeTile.offsetWidth / 2,
      behavior: 'smooth'
    });
  }
}

document.addEventListener("click", (e) => {
  const tile = e.target.closest(".shared-tile");
  if (!tile) return;
  if (tile.classList.contains("coming-soon")) return;

  const id = tile.getAttribute("data-song-id");

  const url = new URL(window.location.href);
  url.searchParams.set("song_id", id);
  history.pushState({}, "", url.toString());

  safeLoadSong(id);

  const strip = tile.closest('.content-strip, .horizontal-strip');
  if (strip) {
    strip.scrollTo({
      left: tile.offsetLeft - strip.offsetWidth / 2 + tile.offsetWidth / 2,
      behavior: 'smooth'
    });
  }
});

function advanceToNextSong(currentId) {
  const tiles = Array.from(document.querySelectorAll('.shared-tile:not(.coming-soon)'));
  const index = tiles.findIndex(t => t.getAttribute('data-song-id') === currentId);

  if (index === -1) return;

  const nextTile = tiles[index + 1];
  if (!nextTile) return;

  const nextId = nextTile.getAttribute('data-song-id');

  const url = new URL(window.location.href);
  url.searchParams.set("song_id", nextId);
  history.pushState({}, "", url.toString());

  safeLoadSong(nextId);
}

if (window.SELECTED_SONG_ID) {
  safeLoadSong(window.SELECTED_SONG_ID);
}
