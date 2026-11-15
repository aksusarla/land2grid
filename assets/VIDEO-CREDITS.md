# Hero background video

Homepage hero (`index.html`) rotates through 4 looping clips, cross-fading to the
next one every 6 seconds (logic in `assets/main.js`, `HERO_CLIPS` array). All four
are wind-turbine footage — Coverr's free catalog does not currently have real
solar-panel or battery-storage clips under its commercial-use license (checked
2026-11-15: both the "solar-panels" and "battery" tag pages return unrelated
Shutterstock placeholder results, not actual footage). If solar/battery shots are
wanted, either source licensed clips separately and add them to this rotation, or
point to a paid stock library.

1. "Wind turbines in the field"
   Page: https://coverr.co/videos/wind-turbines-in-the-field-oaw1emlhfi
   File: https://cdn.coverr.co/videos/coverr-wind-turbines-in-the-field-7853/1080p.mp4

2. "Wind turbines in a field"
   Page: https://coverr.co/videos/wind-turbines-in-a-field-bkxrmhq2wt
   File: https://cdn.coverr.co/videos/coverr-wind-turbines-in-a-field-5831/720p.mp4

3. "Wind turbines in Madeira Island"
   Page: https://coverr.co/videos/wind-turbines-in-madeira-island-wuuebdpmkg
   File: https://cdn.coverr.co/videos/coverr-wind-turbines-in-madeira-island-56/720p.mp4

4. "Close-up of a wind turbine"
   Page: https://coverr.co/videos/close-up-of-a-wind-turbine-9y8kk5xcuy
   File: https://cdn.coverr.co/videos/coverr-close-up-of-a-wind-turbine-7742/720p.mp4

License (all four): Coverr Royalty-Free for Commercial Use — no attribution required,
no watermark, cleared for ads, client projects, websites and social posts. Cannot be
resold or redistributed as standalone stock footage. (Checked 2026-11-15.)

Each video is referenced directly from Coverr's CDN rather than vendored into this
repo, so a visitor's browser fetches it straight from Coverr when the page loads.
