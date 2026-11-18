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

## Editing content

Every page repeats the same header/footer markup (plain static HTML, no includes). If you add a page, copy the header/footer block from an existing page so the nav stays in sync.
