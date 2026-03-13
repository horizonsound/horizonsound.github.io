<script>
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

</script>
