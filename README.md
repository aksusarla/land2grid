# land2grid website

Plain HTML/CSS/JS, six pages, no build step.

## Structure

- `index.html`: home
- `about.html`: team / story
- `contact.html`: contact form
- `services/land-management.html`
- `services/grid-connectivity.html`
- `services/customer-acquisition.html`
- `assets/style.css`, `assets/main.js`, `assets/logo.jpg`
- `thank-you.html`: form success page
- `robots.txt`, `sitemap.xml`

## Deploy on Netlify (contact form works out of the box)

1. Drag this whole folder onto https://app.netlify.com/drop, or connect the repo and leave build command empty / publish directory as `/`.
2. Netlify auto-detects the `data-netlify="true"` form in `contact.html`: no extra setup. Submissions show up under Site settings → Forms.
3. Point your domain at the Netlify site under Domain settings.

## Deploy on Vercel

1. `vercel` from this folder, or connect the repo (framework preset: "Other", no build command, output directory `/`).
2. Vercel has no built-in form handler. Sign up free at formspree.io, then in `contact.html`:
   - change the form's `action` to `https://formspree.io/f/YOUR_FORM_ID`
   - you can remove `data-netlify`, `netlify-honeypot`, and the hidden `form-name` field (Formspree doesn't need them)
3. Point your domain at the Vercel project under Settings → Domains.

## Editing the header/footer

The header and footer are still plain static HTML in every page (no includes at request time, so deploy stays build-free), but they're no longer hand-copied. `partials/header.html` and `partials/footer.html` (plus `partials/footer-minimal.html` for `thank-you.html`) are the single source of truth.

To change the nav, logo, footer links, address, etc.:

1. Edit `partials/header.html` and/or `partials/footer.html`.
2. Run `node scripts/build.js` from the repo root.
3. Commit the regenerated `.html` files along with the partial.

If you add a new page, add it to the `pages` list in `scripts/build.js`, give it an empty `<header class="site">...</header>` / `<footer class="site band-navy">...</footer>` pair (or copy one from an existing page), and run the build script to fill them in.
