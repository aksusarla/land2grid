# Service page hero banners

Each of the three service pages (`services/land-management.html`,
`services/grid-connectivity.html`, `services/customer-acquisition.html`)
has a full-bleed photo hero under its header, in the same visual language
as the homepage's video hero (dark gradient, heading over it) but a
single static photo instead of a looping video, to keep subpages lighter.

1. Land management, "Capture of wavy sand dunes with a bright blue sky in
   La Oliva, Spain", Pexels. No free, commercially licensed photo of
   Rajasthan specifically was found; this is a generic barren/desert
   landscape used as the closest available stand-in. Swap for a real
   photo of a land2grid site if one becomes available.
   Page: https://www.pexels.com/photo/8065430
   File: https://images.pexels.com/photos/8065430/pexels-photo-8065430.jpeg

2. Grid connectivity, "High-voltage electrical substation with steel
   structures and power lines at dawn", Pexels.
   Page: https://www.pexels.com/photo/18468536
   File: https://images.pexels.com/photos/18468536/pexels-photo-18468536/free-photo-of-power-distribution-substation.jpeg

3. Customer acquisition, "Industrial plant with road and trucks in
   Iași, Romania, reflecting in water on a sunny day", Pexels.
   Page: https://www.pexels.com/photo/2183113
   File: https://images.pexels.com/photos/2183113/pexels-photo-2183113.jpeg

License: Pexels License, free for commercial and non-commercial use, no
attribution required, may be modified. Cannot be sold unaltered or
redistributed as standalone stock imagery, and cannot be used to imply
endorsement by any identifiable person (none of the three has a person
in it, so not a concern here).

Each image is referenced directly from Pexels' own CDN rather than
vendored into this repo, the same approach used for the homepage hero
videos (see `VIDEO-CREDITS.md`). A visitor's browser fetches it straight
from Pexels when the page loads.
