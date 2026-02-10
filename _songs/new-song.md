---
layout: song
title: "SONG TITLE"
subtitle: "PROJECT NAME | Part X"
project_title: "PROJECT NAME"

youtube_id: "YOUTUBE_ID"
hero_image: "/assets/IMAGE.jpg"

next_track_url: "/music/NEXT-SONG/"
next_track_label: "Next Song Title"

tiles:
  - title: "Song A"
    url: "/music/song-a/"
    image: "/assets/song-a.jpg"

  - title: "Song B"
    url: "/music/song-b/"
    image: "/assets/song-b.jpg"

about: |
  Your description goes here.
  Use Markdown formatting.
  Line breaks are preserved.
  Bold, italics, lists — all work.

lyrics: |
  Paste lyrics here.
  Every line indented two spaces.
  Blank lines indented too.
---
<!-- ABOUT SECTION -->
{% include about.html %}

<!-- LYRICS SECTION -->
{% include lyrics.html %}

<!-- PROJECT NAV -->
{% include project-nav.html %}

<!-- NEXT TRACK BUTTON -->
{% include next-track.html %}

