#!/usr/bin/env node
/**
 * vibe-check test suite — zero dependencies, plain Node.
 *
 *   npm test        (or:  node test/run.mjs)
 *
 * Fixtures are written to a temp directory, scanned, and asserted on. Nothing
 * is written inside the repo.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS, walk, makeContext, runChecks, renderMarkdown, renderTerminal, tally, VERSION } from '../skills/vibe-check/scripts/scan.mjs';

// Fake key for fixtures, assembled at runtime so secret scanners don't flag the repo.
const FAKE_SK = ['sk', 'live', '51QxPzLKd92mNfQw8TbVrXyZa4HcJ7nE2'].join('_');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-check-test-'));

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  \x1b[38;5;154m✓\x1b[0m ${name}\n`);
  } catch (err) {
    failures.push({ name, err });
    process.stdout.write(`  \x1b[38;5;203m✗\x1b[0m ${name}\n    ${err.message.split('\n').join('\n    ')}\n`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertStatus(results, id, expected, why) {
  const r = results.find((x) => x.id === id);
  assert(r, `no result for check "${id}"`);
  assert(
    r.status === expected,
    `${id}: expected ${expected}, got ${r.status}\n  summary: ${r.summary}${why ? `\n  (${why})` : ''}`,
  );
  return r;
}

/** Write a fixture tree and scan it. */
function scan(name, files) {
  const dir = path.join(TMP, name);
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  const walked = walk(dir);
  return { dir, results: runChecks(makeContext(dir, walked), {}), files: walked.files };
}

/* ───────────────────────── fixture: the broken app ─────────────────────── */

const BROKEN = {
  'index.html': `<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&display=swap">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABCD1234XY"></script>
  <script>gtag('config','G-ABCD1234XY');</script>
  <script src="https://static.hotjar.com/c/hotjar-3219887.js"></script>
</head>
<body>
  <img src="/hero.png" width="600">
  <input type="email" placeholder="you@example.com">
  <div onClick="upgrade()">Upgrade</div>
  <input type="file" accept="image/*">
</body>
</html>`,
  'src/pay.js': `const KEY = "${FAKE_SK}";
export const sub = () => fetch("/x", { body: JSON.stringify({ mode: "subscription", price: "price_1QxPzLKd92mNfQw8" }) });`,
  'src/mail.js': `import { Resend } from "resend";
export const newsletter = (list) => new Resend(process.env.K).emails.send({ to: list, subject: "Our newsletter", html: "<p>hi</p>" });`,
  'supabase/migrations/0001.sql': `create table public.posts (id uuid primary key, user_id uuid, body text);
alter table public.posts disable row level security;`,
  'package.json': JSON.stringify({ name: 'broken', private: true, dependencies: { resend: '^4', openai: '^4', '@supabase/supabase-js': '^2' } }, null, 2),
  '.env': 'OPENAI_API_KEY=sk-proj-aB3dEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf\n',
};

/* ───────────────────────── fixture: the fixed app ──────────────────────── */

const FIXED = {
  'index.html': `<!doctype html>
<html lang="en">
<head>
  <style>@font-face{font-family:Inter;src:url("/fonts/inter.woff2") format("woff2")}</style>
</head>
<body>
  <img src="/hero.png" width="600" alt="Six stickers made from one selfie">
  <label for="email">Email</label><input id="email" type="email">
  <button type="button" onClick="upgrade()">Upgrade</button>
  <a href="/privacy">Privacy</a> <a href="/terms">Terms</a> <a href="/dmca">DMCA</a>
</body>
</html>`,
  'public/fonts/OFL.txt': 'SIL Open Font License 1.1\n',
  'public/fonts/inter.woff2': 'not-a-real-font',
  'app/privacy/page.tsx': 'export default () => <main><h1>Privacy Policy</h1><p>We collect your email address.</p></main>;',
  'app/terms/page.tsx': 'export default () => <main><h1>Terms of Service</h1></main>;',
  'app/dmca/page.tsx': 'export default () => <main><h1>DMCA</h1><p>Our designated agent is registered under 512(c).</p></main>;',
  'app/refunds/page.tsx': 'export default () => <main><h1>Refund policy</h1><p>14-day refund, no questions.</p></main>;',
  'supabase/migrations/0001.sql': `create table public.posts (id uuid primary key, user_id uuid not null, body text);
alter table public.posts enable row level security;
create policy "owner reads" on public.posts for select using (auth.uid() = user_id);`,
  'package.json': JSON.stringify({ name: 'fixed', private: true }, null, 2),
  '.gitignore': '.env\n!.env.example\n',
  '.env.example': 'OPENAI_API_KEY=\n',
  'LICENSE': 'MIT License\n',
};

/* ─────────────────────────────── the tests ─────────────────────────────── */

process.stdout.write(`\nvibe-check test suite · scanner v${VERSION}\n\n`);

process.stdout.write('check registry\n');

test('exposes 16 checks', () => {
  assert(CHECKS.length === 16, `expected 16 checks, got ${CHECKS.length}`);
});

test('every check declares id, title, law, applies and run()', () => {
  const ids = new Set();
  for (const ch of CHECKS) {
    assert(typeof ch.id === 'string' && /^[a-z0-9-]+$/.test(ch.id), `bad id: ${ch.id}`);
    assert(!ids.has(ch.id), `duplicate id: ${ch.id}`);
    ids.add(ch.id);
    for (const field of ['title', 'law', 'applies']) {
      assert(typeof ch[field] === 'string' && ch[field].length > 10, `${ch.id}: missing or thin "${field}"`);
    }
    assert(typeof ch.run === 'function', `${ch.id}: run is not a function`);
  }
});

test('every check returns a valid status on an empty project', () => {
  const { results } = scan('empty', { 'README.md': '# nothing here\n' });
  assert(results.length === 16, `expected 16 results, got ${results.length}`);
  for (const r of results) {
    assert(['pass', 'fail', 'review'].includes(r.status), `${r.id}: bad status "${r.status}"`);
    assert(typeof r.summary === 'string' && r.summary.length > 0, `${r.id}: empty summary`);
    assert(Array.isArray(r.evidence), `${r.id}: evidence is not an array`);
  }
});

test('no check promises legal safety', () => {
  const banned = /\b(you are compliant|fully compliant|legally safe|legally protected|guaranteed|we guarantee|no legal risk)\b/i;
  const { results } = scan('wording', BROKEN);
  for (const r of results) {
    for (const field of ['summary', 'fix', 'law', 'applies']) {
      assert(!banned.test(String(r[field] || '')), `${r.id}: over-promising wording in "${field}"`);
    }
  }
});

process.stdout.write('\nthe broken app — every planted issue is caught\n');

const broken = scan('broken', BROKEN);

test('google-fonts FAILs on a remote Google Fonts link', () => {
  const r = assertStatus(broken.results, 'google-fonts', 'fail');
  assert(r.evidence.some((e) => e.rel === 'index.html'), 'evidence does not cite index.html');
  assert(r.evidence[0].line > 0, 'evidence has no line number');
});

test('secrets-exposed FAILs on a live Stripe key and a committed .env', () => {
  const r = assertStatus(broken.results, 'secrets-exposed', 'fail');
  assert(r.evidence.some((e) => e.rel === 'src/pay.js'), 'did not cite src/pay.js');
  assert(/stripe/i.test(JSON.stringify(r.evidence)), 'did not name the key kind');
});

test('secrets-exposed never prints the key value', () => {
  const r = broken.results.find((x) => x.id === 'secrets-exposed');
  const blob = JSON.stringify(r);
  assert(!blob.includes('51QxPzLKd92mNfQw8TbVrXyZa4HcJ7nE2'), 'the secret value leaked into the report');
  assert(!blob.includes('aB3dEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf'), 'the OpenAI key leaked into the report');
});

test('no other check leaks the secret either — any output format', () => {
  // `const STRIPE_SECRET = "sk_live_…"` matches the payments pattern as
  // readily as the secrets pattern, so the scrub has to be global.
  const needles = ['51QxPzLKd92mNfQw8TbVrXyZa4HcJ7nE2', 'aB3dEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf'];
  const meta = { target: '.', fileCount: 6, ms: 1, when: 'test', version: VERSION };
  const renders = {
    json: JSON.stringify(broken.results),
    markdown: renderMarkdown(broken.results, meta),
    terminal: renderTerminal(broken.results, meta, { maxEvidence: 40, quiet: false }),
  };
  for (const [format, text] of Object.entries(renders)) {
    for (const needle of needles) {
      assert(!text.includes(needle), `secret value leaked into the ${format} report`);
    }
  }
});

test('redaction keeps the provider prefix so you know what to rotate', () => {
  const r = broken.results.find((x) => x.id === 'secrets-exposed');
  const blob = JSON.stringify(r.evidence);
  assert(blob.includes('sk_live_'), 'lost the prefix — the user cannot tell which key to rotate');
  assert(blob.includes('\u2022'), 'nothing was actually masked');
});

test('a browser-exposed env var name is shown in full — the name is not secret', () => {
  const { results } = scan('public-env', {
    'src/client.ts': 'export const k = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;',
  });
  const r = assertStatus(results, 'secrets-exposed', 'fail');
  assert(JSON.stringify(r.evidence).includes('NEXT_PUBLIC_STRIPE_SECRET_KEY'),
    'the variable name should be reported verbatim so it can be found and renamed');
});

test('ordinary evidence is never over-redacted', () => {
  const r = broken.results.find((x) => x.id === 'tracking-before-consent');
  const blob = JSON.stringify(r.evidence);
  assert(blob.includes('googletagmanager'), 'a long but harmless token was masked');
});

test('open-database FAILs when RLS is explicitly disabled', () => {
  const r = assertStatus(broken.results, 'open-database', 'fail');
  assert(r.evidence.some((e) => e.rel.endsWith('0001.sql')), 'did not cite the migration');
});

test('tracking-before-consent FAILs with analytics and replay and no gate', () => {
  assertStatus(broken.results, 'tracking-before-consent', 'fail');
});

test('cookie-consent-banner FAILs when trackers exist with no consent layer', () => {
  assertStatus(broken.results, 'cookie-consent-banner', 'fail');
});

test('privacy-policy-terms FAILs when neither document exists', () => {
  assertStatus(broken.results, 'privacy-policy-terms', 'fail');
});

test('accessibility-basics FAILs and finds all four defects', () => {
  const r = assertStatus(broken.results, 'accessibility-basics', 'fail');
  const labels = r.evidence.map((e) => e.snippet).join(' | ');
  for (const want of ['no alt attribute', 'no label', 'onClick on <div>', 'no lang attribute']) {
    assert(labels.includes(want), `missing finding "${want}" in: ${labels}`);
  }
});

test('dmca-agent FAILs on a file input with no DMCA language', () => {
  assertStatus(broken.results, 'dmca-agent', 'fail');
});

test('can-spam FAILs on a newsletter with no unsubscribe or address', () => {
  assertStatus(broken.results, 'can-spam', 'fail');
});

test('auto-renew-terms FAILs on a subscription with no disclosure', () => {
  assertStatus(broken.results, 'auto-renew-terms', 'fail');
});

test('the broken app reports at least 9 failures', () => {
  const t = tally(broken.results);
  assert(t.fail >= 9, `expected ≥9 FAILs, got ${t.fail}`);
});

test('every failure carries evidence or states an explicit absence', () => {
  for (const r of broken.results.filter((x) => x.status === 'fail')) {
    const explicitAbsence = /\bno\b|\bnot\b|\bnone\b|nowhere|anywhere/i.test(r.summary);
    assert(
      r.evidence.length > 0 || explicitAbsence,
      `${r.id}: FAIL with no evidence and no stated absence — "${r.summary}"`,
    );
  }
});

test('every failure offers a fix', () => {
  for (const r of broken.results.filter((x) => x.status === 'fail')) {
    assert(r.fix && r.fix.length > 40, `${r.id}: FAIL with no usable fix`);
  }
});

process.stdout.write('\nthe fixed app — the same checks clear\n');

const fixed = scan('fixed', FIXED);

test('google-fonts PASSes once the font is self-hosted', () => {
  assertStatus(fixed.results, 'google-fonts', 'pass');
});

test('secrets-exposed PASSes with only .env.example present', () => {
  assertStatus(fixed.results, 'secrets-exposed', 'pass');
});

test('accessibility-basics clears its static findings', () => {
  const r = assertStatus(fixed.results, 'accessibility-basics', 'review',
    'static findings should clear, leaving contrast/keyboard for a human');
  assert(/contrast|keyboard/i.test(r.summary), 'should explain what still needs a browser');
});

test('privacy-policy-terms clears when both documents exist', () => {
  assertStatus(fixed.results, 'privacy-policy-terms', 'review');
});

test('open-database no longer FAILs once RLS is enabled and scoped', () => {
  const r = fixed.results.find((x) => x.id === 'open-database');
  assert(r.status !== 'fail', `expected not-fail, got ${r.status}: ${r.summary}`);
});

test('dmca-agent clears when DMCA language is present', () => {
  const r = fixed.results.find((x) => x.id === 'dmca-agent');
  assert(r.status !== 'fail', `expected not-fail, got ${r.status}`);
});

test('the fixed app has no failures left', () => {
  const t = tally(fixed.results);
  assert(t.fail === 0, `expected 0 FAILs, got ${t.fail}: ${fixed.results.filter((r) => r.status === 'fail').map((r) => r.id).join(', ')}`);
});

process.stdout.write('\nfalse positives — the things that must NOT be flagged\n');

test('a commented-out tracker is not a live tracker', () => {
  const { results } = scan('commented-tracker', {
    'index.html': `<!doctype html>
<html lang="en"><head>
  <!-- <script src="https://www.googletagmanager.com/gtag/js?id=G-OLD1234567"></script> -->
</head><body><p>hello</p></body></html>`,
    'src/app.js': `// we removed gtag('config','G-ABCD1234XY') last week
/* also killed the hotjar snippet: static.hotjar.com */
export const hello = 1;`,
  });
  assertStatus(results, 'tracking-before-consent', 'pass', 'comments must not count as live tags');
  assertStatus(results, 'cookie-consent-banner', 'pass');
});

test('a comment naming a missing safeguard is not that safeguard', () => {
  const { results } = scan('todo-comment', {
    'src/mail.js': `import { Resend } from "resend";
// TODO: add an unsubscribe link and our postal address to the newsletter template
export const newsletter = (l) => new Resend(process.env.K).emails.send({ to: l, subject: "Newsletter", html: "<p>hi</p>" });`,
    'package.json': JSON.stringify({ dependencies: { resend: '^4' } }),
  });
  assertStatus(results, 'can-spam', 'fail', 'a TODO about unsubscribe is not an unsubscribe link');
});

test('a Firebase web API key is not reported as a leaked secret', () => {
  const { results } = scan('firebase-key', {
    'src/firebase.js': `export const firebaseConfig = {
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO34",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo",
};`,
    'firestore.rules': `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
  }
}`,
  });
  const r = assertStatus(results, 'secrets-exposed', 'pass', 'Firebase web keys are public by design');
  assert(/public identifier/i.test(r.summary), 'should explain why the Firebase key is not a leak');
});

test('a locked-down Firebase rules file does not FAIL', () => {
  const { results } = scan('firebase-locked', {
    'firestore.rules': `match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`,
  });
  const r = results.find((x) => x.id === 'open-database');
  assert(r.status !== 'fail', `expected not-fail, got ${r.status}: ${r.summary}`);
});

test('an open Firebase rule does FAIL', () => {
  const { results } = scan('firebase-open', {
    'firestore.rules': `match /{document=**} { allow read, write: if true; }`,
  });
  assertStatus(results, 'open-database', 'fail');
});

test('next/font/google PASSes — it self-hosts at build time', () => {
  const { results } = scan('next-font', {
    'app/layout.tsx': `import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
export default function L({ children }) { return <html lang="en" className={inter.className}>{children}</html>; }`,
  });
  const r = assertStatus(results, 'google-fonts', 'pass');
  assert(/build time/i.test(r.summary), 'should explain why next/font is fine');
});

test('"private": true in package.json is not a VAT signal', () => {
  const { results } = scan('private-pkg', {
    'package.json': JSON.stringify({ name: 'x', private: true, dependencies: { stripe: '^17' } }),
    'src/pay.js': 'import Stripe from "stripe";',
  });
  const r = results.find((x) => x.id === 'sales-tax-vat');
  assert(!/some tax handling is present/.test(r.summary), 'matched "vat" inside the word "private"');
});

test('COPPA does not FAIL a general-audience app', () => {
  const { results } = scan('general-audience', { 'index.html': '<html lang="en"><body><h1>B2B invoicing</h1></body></html>' });
  const r = results.find((x) => x.id === 'coppa-age-gate');
  assert(r.status !== 'fail', `COPPA should not fail without child-directed signals, got ${r.status}`);
  assert(/may not apply|not applicable|no child-directed/i.test(r.summary), 'should say it may not apply');
});

test('a child-directed app with no age gate does FAIL COPPA', () => {
  const { results } = scan('child-directed', {
    'index.html': `<html lang="en"><body><h1>Maths games for kids</h1><p>A kid-friendly classroom app for ages 6-10.</p></body></html>`,
  });
  assertStatus(results, 'coppa-age-gate', 'fail');
});

test('prose mentioning a font CDN is not a live font request', () => {
  const { results } = scan('font-prose', {
    'docs/guide.html': `<html lang="en"><body>
      <p>Avoid loading fonts from fonts.googleapis.com — self-host instead.</p>
      <p>The hostname <code>fonts.gstatic.com</code> is where the files live.</p>
    </body></html>`,
  });
  assertStatus(results, 'google-fonts', 'pass', 'a hostname in prose is not a <link>');
});

test('a real font link in any URL position still FAILs', () => {
  for (const markup of [
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">`,
    `<link rel="stylesheet" href="//fonts.googleapis.com/css2?family=Inter">`,
    `@import url("https://fonts.googleapis.com/css2?family=Inter");`,
  ]) {
    const { results } = scan('font-live-' + markup.length, {
      'index.html': `<html lang="en"><head>${markup}</head><body></body></html>`,
    });
    assertStatus(results, 'google-fonts', 'fail', `missed: ${markup}`);
  }
});

test('prose about RLS is not a disabled-RLS finding', () => {
  const { results } = scan('rls-prose', {
    'docs/notes.md': 'Never run `disable row level security` on a user table.',
    'src/db.ts': '// reminder: disable row level security is a trap',
  });
  const r = results.find((x) => x.id === 'open-database');
  assert(r.status !== 'fail', `prose should not FAIL, got ${r.status}: ${r.summary}`);
});

test('a real ALTER TABLE … DISABLE ROW LEVEL SECURITY still FAILs', () => {
  const { results } = scan('rls-real', {
    'db/0001.sql': 'alter table public.posts disable row level security;',
  });
  assertStatus(results, 'open-database', 'fail');
});

test('a fixture key in test code is reported, but as NEEDS REVIEW not FAIL', () => {
  const { results } = scan('test-fixture-key', {
    'src/app.ts': 'export const hello = 1;',
    'test/checkout.test.ts': `const KEY = "${FAKE_SK}";`,
  });
  const r = assertStatus(results, 'secrets-exposed', 'review',
    'a key in test code is usually a fixture — flag it, do not fail the launch');
  const blob = JSON.stringify(r.evidence);
  assert(blob.includes('test/checkout.test.ts'), 'should still cite the test file');
  assert(blob.includes('in test code'), 'should say the finding is in test code');
});

test('the same key in shipped code still FAILs', () => {
  const { results } = scan('shipped-key', {
    'src/checkout.ts': `const KEY = "${FAKE_SK}";`,
  });
  assertStatus(results, 'secrets-exposed', 'fail');
});

test('trackers in test code do not fail the production checks', () => {
  const { results } = scan('tracker-in-tests', {
    'src/app.ts': 'export const hello = 1;',
    'e2e/analytics.spec.ts': `test('fires gtag', () => { window.gtag('config', 'G-ABCD1234XY'); });`,
  });
  assertStatus(results, 'tracking-before-consent', 'pass', 'test code is not shipped to users');
});

test("vibe-check's own installed files are never scanned", () => {
  const { results, files } = scan('self-install', {
    'src/app.ts': 'export const hello = 1;',
    '.claude/skills/vibe-check/references/checks.md': 'Look for fonts.googleapis.com and sk_live_ keys.',
    '.cursor/rules/vibe-check.mdc': 'grep for "disable row level security" and gtag(',
    '.vibe-check/scan.mjs': 'const tracker = /googletagmanager|hotjar|sk_live_/;',
  });
  assert(files.some((f) => f.self), 'self paths were not recognised');
  for (const id of ['google-fonts', 'tracking-before-consent', 'open-database', 'secrets-exposed']) {
    const r = results.find((x) => x.id === id);
    assert(r.status !== 'fail', `${id} flagged vibe-check's own files: ${r.summary}`);
  }
});

test('node_modules and .git are never scanned', () => {
  const { files } = scan('ignored-dirs', {
    'node_modules/evil/index.js': `const k = "${FAKE_SK}";`,
    '.git/config': '[core]\n',
    'src/app.js': 'export const x = 1;',
  });
  assert(!files.some((f) => f.rel.startsWith('node_modules')), 'walked into node_modules');
  assert(!files.some((f) => f.rel.startsWith('.git/')), 'walked into .git');
});

test('a secret in a built bundle is still found', () => {
  const { results } = scan('built-bundle', {
    'dist/assets/index-a4f21c.js': `const a=1;const K="${FAKE_SK}";export{a};`,
    'src/app.js': 'export const x = 1;',
  });
  const r = assertStatus(results, 'secrets-exposed', 'fail');
  assert(r.evidence.some((e) => e.rel.startsWith('dist/')), 'did not cite the bundle');
});

test('an empty directory does not crash', () => {
  const dir = path.join(TMP, 'totally-empty');
  fs.mkdirSync(dir, { recursive: true });
  const results = runChecks(makeContext(dir, walk(dir)), {});
  assert(results.length === 16, `expected 16 results, got ${results.length}`);
});

process.stdout.write('\nrepo consistency\n');

test('every check id appears in the Cursor rule and AGENTS.md', () => {
  const cursor = fs.readFileSync(path.join(ROOT, '.cursor/rules/vibe-check.mdc'), 'utf8');
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  for (const ch of CHECKS) {
    assert(cursor.includes('`' + ch.id + '`'), `${ch.id} missing from .cursor/rules/vibe-check.mdc`);
    assert(agents.includes('`' + ch.id + '`'), `${ch.id} missing from AGENTS.md`);
  }
});

test('every check is documented in references/checks.md', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'skills/vibe-check/references/checks.md'), 'utf8');
  for (const ch of CHECKS) {
    assert(doc.includes('`' + ch.id + '`'), `${ch.id} missing from references/checks.md`);
  }
});

test('every check appears in the README table and the website', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const site = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
  for (const ch of CHECKS) {
    assert(readme.includes(ch.id), `${ch.id} missing from README.md`);
    assert(site.includes(ch.id), `${ch.id} missing from docs/index.html`);
  }
});

test('SKILL.md has valid frontmatter with name and description', () => {
  const md = fs.readFileSync(path.join(ROOT, 'skills/vibe-check/SKILL.md'), 'utf8');
  assert(md.startsWith('---\n'), 'SKILL.md must start with YAML frontmatter');
  const end = md.indexOf('\n---', 4);
  assert(end > 0, 'frontmatter is not closed');
  const fm = md.slice(4, end);
  const name = /^name:\s*(.+)$/m.exec(fm);
  const desc = /^description:\s*(.+)$/m.exec(fm);
  assert(name, 'no name in frontmatter');
  assert(/^[a-z0-9-]{1,64}$/.test(name[1].trim()), `name must be lowercase/digits/hyphens, max 64: "${name[1]}"`);
  assert(desc, 'no description in frontmatter');
  assert(desc[1].trim().length <= 1024, 'description exceeds the 1024-character limit');
  assert(desc[1].length > 80, 'description is too thin for the model to match on');
});

test('plugin.json and marketplace.json are valid and consistent', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(plugin.name), `bad plugin name: ${plugin.name}`);
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(market.name), `bad marketplace name: ${market.name}`);
  assert(market.owner && market.owner.name, 'marketplace.owner.name is required');
  assert(Array.isArray(market.plugins) && market.plugins.length > 0, 'marketplace.plugins must be a non-empty array');
  const entry = market.plugins.find((p) => p.name === plugin.name);
  assert(entry, `marketplace has no entry named "${plugin.name}"`);
  assert(entry.source === '.' || String(entry.source).startsWith('./'), `relative plugin source must be "." or start with "./": ${entry.source}`);
  assert(plugin.version === VERSION, `plugin.json version ${plugin.version} != scanner ${VERSION}`);
});

test('the version is consistent across the repo', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills/vibe-check/SKILL.md'), 'utf8');
  const install = fs.readFileSync(path.join(ROOT, 'docs/install.sh'), 'utf8');
  assert(skill.includes(`version: ${VERSION}`), `SKILL.md metadata.version != ${VERSION}`);
  assert(install.includes(`VERSION="${VERSION}"`), `install.sh VERSION != ${VERSION}`);
});

test('install.sh downloads every file the skill needs', () => {
  const install = fs.readFileSync(path.join(ROOT, 'docs/install.sh'), 'utf8');
  for (const f of ['SKILL.md', 'references/checks.md', 'references/report-format.md',
                   'references/manual-verification.md', 'scripts/scan.mjs']) {
    assert(install.includes(f), `install.sh never fetches ${f}`);
  }
});

/* ──────────────────────────────── results ─────────────────────────────── */

fs.rmSync(TMP, { recursive: true, force: true });

process.stdout.write('\n');
if (failures.length) {
  process.stdout.write(`\x1b[38;5;203m${failures.length} failed\x1b[0m, ${passed} passed\n\n`);
  process.exit(1);
}
process.stdout.write(`\x1b[38;5;154m${passed} passed\x1b[0m\n\n`);
