# Hero background video

Homepage hero (`index.html`) rotates through 6 looping clips, cross-fading to the
next one every 6 seconds (logic in `assets/main.js`, `HERO_CLIPS` array): two wind,
two solar, two hydro — a deliberate mix across renewable types rather than wind only.

1. "Wind turbines in the field" — Coverr
   Page: https://coverr.co/videos/wind-turbines-in-the-field-oaw1emlhfi
   File: https://cdn.coverr.co/videos/coverr-wind-turbines-in-the-field-7853/1080p.mp4

2. "Aerial view of expansive solar farm under cloudy sky" — Pexels
   Page: https://www.pexels.com/video/aerial-view-of-expansive-solar-farm-under-cloudy-sky-30583778/
   File: https://videos.pexels.com/video-files/30583778/13097063_2560_1440_30fps.mp4

3. "Scenic aerial view of a hydro-electric dam" — Pexels
   Page: https://www.pexels.com/video/scenic-aerial-view-of-a-hydro-electric-dam-30372395/
   File: https://videos.pexels.com/video-files/30372395/13017165_3072_1440_24fps.mp4

4. "Wind turbines in Madeira Island" — Coverr
   Page: https://coverr.co/videos/wind-turbines-in-madeira-island-wuuebdpmkg
   File: https://cdn.coverr.co/videos/coverr-wind-turbines-in-madeira-island-56/720p.mp4

5. "Drone footage of a solar farm" — Pexels
   Page: https://www.pexels.com/video/drone-footage-of-a-solar-farm-7042814/
   File: https://videos.pexels.com/video-files/7042814/7042814-uhd_2732_1318_30fps.mp4

6. "Drone footage of the Sir Adam Beck hydroelectric generating stations" — Pexels
   Page: https://www.pexels.com/video/drone-footage-of-the-sir-adam-beck-hydroelectric-generating-stations-6133235/
   File: https://videos.pexels.com/video-files/6133235/6133235-uhd_2560_1440_30fps.mp4

License:
- Coverr clips (1, 4): Coverr Royalty-Free for Commercial Use — no attribution
  required, no watermark, cleared for ads, client projects, websites and social
  posts. Cannot be resold or redistributed as standalone stock footage.
- Pexels clips (2, 3, 5, 6): Pexels License — free for commercial and
  non-commercial use, no attribution required, may be modified. Cannot be sold
  unaltered or redistributed as standalone stock footage, and cannot be used to
  imply endorsement by any identifiable person in the clip (not a concern here —
  all four are aerial/drone shots with no people).

Dropped from this rotation — no clip found that is actually footage of the named
subject under a free, commercial-use license (checked 2026-11-15):
- Battery storage (BESS): free libraries (Coverr, Pixabay) return only phone/EV
  battery-charging clips, nothing resembling a grid-scale storage facility.
  Mixkit has container/substation-style energy clips, but even its "free" tier is
  released under the Mixkit *Restricted* License (personal use only) — real
  commercial use requires its paid Envato tier.
- Biogas / biomass: no free, commercial-use video turned up at all beyond a
  single generic "wood pellets" clip, which doesn't read as a biogas plant.
If solar/hydro gets replaced by more specific shots later, or BESS/biogas shots are
wanted, either source licensed clips separately (a paid stock library is the
realistic path for those two) and add them to `HERO_CLIPS`, or keep rotating what's
here.

Each video is referenced directly from its host's CDN rather than vendored into
this repo, so a visitor's browser fetches it straight from Coverr/Pexels when the
page loads.
