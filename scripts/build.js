#!/usr/bin/env node
/**
 * Stamps the shared header/footer markup from partials/ into every page.
 *
 * The site stays plain static HTML with no build step at deploy time --
 * this script just keeps the duplicated header/footer blocks in each
 * .html file in sync with a single source of truth. Edit a partial,
 * run `node scripts/build.js`, then commit the regenerated pages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const headerTpl = read('partials/header.html');
const footerTpl = read('partials/footer.html');
const footerMinimalTpl = read('partials/footer-minimal.html');

// Every page that carries the shared header/footer. Add new pages here.
const pages = [
  { file: 'index.html' },
  { file: 'about.html' },
  { file: 'contact.html' },
  { file: 'insights.html' },
  { file: 'privacy.html' },
  { file: 'terms.html' },
  { file: 'cookie-policy.html' },
  { file: 'thank-you.html', footer: 'minimal' },
  { file: 'dashboard.html' },
  { file: 'admin.html' },
  { file: 'login.html' },
  { file: 'documents.html' },
  { file: 'services/what-we-do.html' },
  { file: 'insights/land-aggregation-is-the-real-delay.html' },
  { file: 'insights/load-flow-study-before-you-file.html' },
  { file: 'insights/open-access-vs-group-captive.html' },
];

const HEADER_RE = /<header class="site">[\s\S]*?<\/header>/;
const FOOTER_RE = /<footer class="site band-navy">[\s\S]*?<\/footer>/;

function render(tpl, prefix, dashboardActive) {
  return tpl
    .replace(/{{PREFIX}}/g, prefix)
    .replace(/{{DASHBOARD_ACTIVE}}/g, dashboardActive || '')
    .trim();
}

let touched = 0;
let missing = 0;

for (const page of pages) {
  const filePath = path.join(ROOT, page.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`skip: ${page.file} not found`);
    missing++;
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const depth = page.file.split('/').length - 1;
  const prefix = '../'.repeat(depth);
  const dashboardActive = page.file === 'dashboard.html' ? ' active' : '';

  const header = render(headerTpl, prefix, dashboardActive);
  const footer = render(page.footer === 'minimal' ? footerMinimalTpl : footerTpl, prefix);

  let next = original;
  if (HEADER_RE.test(next)) {
    next = next.replace(HEADER_RE, header);
  } else {
    console.warn(`warn: no <header class="site"> block found in ${page.file}`);
  }
  if (FOOTER_RE.test(next)) {
    next = next.replace(FOOTER_RE, footer);
  } else {
    console.warn(`warn: no <footer class="site band-navy"> block found in ${page.file}`);
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next);
    touched++;
  }
}

console.log(`Rebuilt header/footer in ${touched} page(s) from partials/.${missing ? ` (${missing} listed page(s) missing)` : ''}`);
