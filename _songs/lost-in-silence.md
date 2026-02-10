---
layout: song
title: "Lost in Silence"
subtitle: "A Way Back – Trilogy | Part I"

youtube_id: "59teEpeHah8"
hero_image: "/assets/Temp.jpg"

next_track_url: "/music/choosing-me-her-version/"
next_track_label: "Choosing Me (Her Version)"

tiles:
  - title: "Choosing Me (Her Version)"
    url: "/music/choosing-me-her-version/"
    image: "/assets/choosing-me-her-version.jpg"

  - title: "Choosing Me (His Version)"
    url: "/music/choosing-me-his-version/"
    image: "/assets/choosing-me-his-version.jpg"
---

<!-- SONG TITLE -->
<section class="homepage-section">
  <h2 class="section-header">{{ page.title }}</h2>
  <p class="song-subtitle">{{ page.subtitle }}</p>
</section>

<!-- VIDEO EMBED -->
<section class="homepage-section video-section">
  <div class="video-wrapper">
    <iframe 
      src="https://www.youtube.com/embed/{{ page.youtube_id }}"
      title="{{ page.title }}"
      frameborder="0"
      allowfullscreen>
    </iframe>
  </div>
</section>

<!-- ABOUT SECTION -->
<!-- paste your About HTML here -->

<!-- LYRICS SECTION -->
<!-- paste your Lyrics HTML here -->

<!-- TRILOGY NAV -->
<!-- paste your two tiles here for now -->

<!-- NEXT TRACK BUTTON -->
<section class="homepage-section" style="text-align:center; margin-top:40px;">
  <a href="{{ page.next_track_url }}" class="btn-primary">
    Next Track → {{ page.next_track_label }}
  </a>
</section>
