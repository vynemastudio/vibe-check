#!/usr/bin/env node
/**
 * vibe-check — static pre-launch compliance scanner
 * Part of https://github.com/vynemastudio/vibe-check  (MIT, © Vynema Studio)
 *
 * Zero dependencies. Node 18+. Pure static analysis: it reads files, never
 * executes your app, never phones home, never writes anything.
 *
 * Educational tool, not legal advice. See SOURCES.md for every citation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const VERSION = '1.0.0';

/* ──────────────────────────── terminal styling ─────────────────────────── */

const noColorEnv = process.env.NO_COLOR !== undefined || process.env.TERM === 'dumb';
let COLOR = process.stdout.isTTY && !noColorEnv;
const truecolor = /truecolor|24bit/i.test(process.env.COLORTERM || '');
const ESC = String.fromCharCode(27);

const sgr = (code) => (s) => (COLOR ? `${ESC}[${code}m${s}${ESC}[0m` : String(s));
const rgb = (r, g, b, fallback) => (s) => {
  if (!COLOR) return String(s);
  return truecolor
    ? `${ESC}[38;2;${r};${g};${b}m${s}${ESC}[0m`
    : `${ESC}[${fallback}m${s}${ESC}[0m`;
};
const bg = (r, g, b, fallback) => (s) => {
  if (!COLOR) return String(s);
  return truecolor
    ? `${ESC}[48;2;${r};${g};${b}m${ESC}[38;2;11;14;19m${ESC}[1m${s}${ESC}[0m`
    : `${ESC}[${fallback}m${ESC}[30m${s}${ESC}[0m`;
};

const c = {
  bold: sgr(1),
  dim: sgr(2),
  italic: sgr(3),
  under: sgr(4),
  lime: rgb(197, 255, 74, 92),   // #C5FF4A
  white: rgb(245, 245, 242, 97), // #F5F5F2
  red: rgb(255, 92, 92, 91),     // alarm red
  amber: rgb(255, 199, 89, 93),
  grey: rgb(124, 133, 148, 90),
  limeBg: bg(197, 255, 74, 42),
  redBg: bg(255, 92, 92, 41),
  amberBg: bg(255, 199, 89, 43),
};

const STATUS = {
  fail:   { label: 'FAIL',         chip: () => c.redBg('  FAIL  '),   paint: c.red,   icon: '✗', rank: 0 },
  review: { label: 'NEEDS REVIEW', chip: () => c.amberBg(' REVIEW '), paint: c.amber, icon: '!', rank: 1 },
  pass:   { label: 'PASS',         chip: () => c.limeBg('  PASS  '),  paint: c.lime,  icon: '✓', rank: 2 },
};

const stripAnsi = (s) => String(s).replace(new RegExp(ESC + '\\[[0-9;]*m', 'g'), '');
const visibleLen = (s) => stripAnsi(s).length;
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - visibleLen(s)));

/* ──────────────────────────────── cli args ─────────────────────────────── */

const HELP = `
  vibe-check  v${VERSION}   —  pre-launch legal & compliance scanner

  USAGE
    node scan.mjs [path] [options]

  OPTIONS
    --json             machine-readable JSON report on stdout
    --md               markdown report on stdout
    --only <ids>       run only these checks (comma separated)
    --skip <ids>       skip these checks (comma separated)
    --list             list every check id and exit
    --no-color         disable ANSI colour
    --quiet            only show FAIL and NEEDS REVIEW
    --exit-zero        always exit 0 (default: exit 1 when a check FAILs)
    --max-evidence <n> evidence lines shown per check (default 6)
    -h, --help         this screen
    -v, --version      print version

  EXAMPLES
    node scan.mjs .
    node scan.mjs ../my-app --quiet
    node scan.mjs . --json > vibe-check.json

  Educational tool. Not legal advice.
`;

function parseArgs(argv) {
  const o = {
    root: '.', json: false, md: false, only: null, skip: null, quiet: false,
    list: false, exitZero: false, maxEvidence: 6,
  };
  const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--md') o.md = true;
    else if (a === '--quiet' || a === '-q') o.quiet = true;
    else if (a === '--list') o.list = true;
    else if (a === '--exit-zero') o.exitZero = true;
    else if (a === '--no-color') COLOR = false;
    else if (a === '--only') o.only = csv(argv[++i]);
    else if (a === '--skip') o.skip = csv(argv[++i]);
    else if (a === '--max-evidence') o.maxEvidence = Math.max(1, parseInt(argv[++i], 10) || 6);
    else if (a === '-h' || a === '--help') { process.stdout.write(HELP + '\n'); process.exit(0); }
    else if (a === '-v' || a === '--version') { process.stdout.write(VERSION + '\n'); process.exit(0); }
    else if (a.startsWith('-')) { process.stderr.write(`vibe-check: unknown option ${a}\n${HELP}\n`); process.exit(2); }
    else o.root = a;
  }
  if (o.json || o.md) COLOR = false;
  return o;
}

/* ─────────────────────────────── file walker ───────────────────────────── */

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', '.next', '.nuxt', '.svelte-kit',
  '.turbo', '.cache', '.parcel-cache', '.pnpm-store', 'coverage', 'vendor',
  '__pycache__', '.venv', 'venv', '.tox', '.mypy_cache', '.pytest_cache',
  '.idea', '.vscode', '.gradle', 'Pods', 'DerivedData', '.terraform',
  '.serverless', '.expo', 'target', '.dart_tool', '.angular', 'bower_components',
]);

// Compiled output is still scanned (secrets leak into bundles) but excluded
// from source-level checks so the same issue is never reported twice.
const BUILD_DIRS = new Set(['dist', 'build', 'out', '.output', '.vercel', '.netlify', '_site']);

const TEXT_EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts',
  '.html', '.htm', '.vue', '.svelte', '.astro', '.ejs', '.hbs', '.handlebars',
  '.liquid', '.pug', '.jade', '.twig', '.erb', '.haml', '.njk',
  '.css', '.scss', '.sass', '.less', '.styl',
  '.json', '.jsonc', '.json5', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf',
  '.md', '.mdx', '.markdown', '.txt', '.rst',
  '.sql', '.prisma', '.graphql', '.gql', '.rules',
  '.php', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.cs', '.swift', '.dart',
  '.sh', '.bash', '.zsh', '.env', '.example', '.template', '.sample', '.local',
  '.xml', '.svg', '.webmanifest', '.gitignore', '.dockerignore',
]);

const ALWAYS_READ = new Set([
  '.env', '.gitignore', '.dockerignore', '.npmrc', 'Dockerfile', 'Procfile',
  'LICENSE', 'LICENCE', 'NOTICE', 'AGENTS.md', 'CLAUDE.md', 'robots.txt',
  'firestore.rules', 'storage.rules', 'database.rules.json',
]);

// Test code is not shipped to your users, so a tracker or fixture key in here
// is a different concern from one in production code. Excluded from source
// checks; secrets found here are reported, but as NEEDS REVIEW rather than FAIL.
const TEST_PATH = /(^|\/)(test|tests|__tests__|__mocks__|spec|e2e|cypress|playwright|fixtures?|mocks?|stories)(\/|$)|\.(test|spec|stories|fixture)\.[a-z]+$|(^|\/)(jest|vitest|playwright|cypress)\.config\./i;

// vibe-check's own files, wherever the installer put them. A tool that flags
// its own pattern list is just noise.
const SELF_PATH = /(^|\/)(skills\/vibe-check|\.vibe-check|\.claude\/skills\/vibe-check|\.cursor\/vibe-check)(\/|$)|(^|\/)\.cursor\/rules\/vibe-check\.mdc$/;

const FONT_EXT = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
const MAX_SOURCE_BYTES = 1_500_000;
const MAX_BUILD_BYTES = 5_000_000;
const MAX_FILES = 20_000;

function isTexty(name) {
  if (ALWAYS_READ.has(name)) return true;
  if (name.startsWith('.env')) return true;
  return TEXT_EXT.has(path.extname(name).toLowerCase());
}

function walk(root) {
  const files = [];
  const stats = { dirs: 0, skippedLarge: 0, binary: 0, fonts: [] };
  const stack = [{ abs: root, rel: '', build: false }];

  while (stack.length) {
    const { abs, rel, build } = stack.pop();
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { continue; }
    stats.dirs++;
    for (const e of entries) {
      const childAbs = path.join(abs, e.name);
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        stack.push({ abs: childAbs, rel: childRel, build: build || BUILD_DIRS.has(e.name) });
        continue;
      }
      if (!e.isFile() || files.length >= MAX_FILES) continue;

      const ext = path.extname(e.name).toLowerCase();
      if (FONT_EXT.includes(ext)) stats.fonts.push(childRel);
      if (!isTexty(e.name)) { stats.binary++; continue; }

      let size = 0;
      try { size = fs.statSync(childAbs).size; } catch { continue; }
      if (size > (build ? MAX_BUILD_BYTES : MAX_SOURCE_BYTES)) { stats.skippedLarge++; continue; }
      files.push({
        abs: childAbs, rel: childRel, build, size, name: e.name, ext,
        test: TEST_PATH.test(childRel),
        self: SELF_PATH.test(childRel),
      });
    }
  }
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return { files, stats };
}

/* ─────────────────────────── comment masking ───────────────────────────── */

/**
 * Blank out comment bodies while preserving length and line numbers, so a
 * `// TODO: add an unsubscribe link` never counts as evidence that the link
 * exists. Problem-hunting checks that genuinely care about commented-out code
 * (secrets) opt back in with `{ comments: true }`.
 */
const HASH_COMMENT_EXT = new Set([
  '.yml', '.yaml', '.sh', '.bash', '.zsh', '.py', '.rb', '.toml', '.ini',
  '.cfg', '.conf', '.env', '.gitignore', '.dockerignore', '.example',
  '.template', '.sample', '.local', '.npmrc',
]);

function maskComments(t, ext) {
  const sql = ext === '.sql';
  const hash = HASH_COMMENT_EXT.has(ext);
  const out = t.split('');
  const n = t.length;
  let i = 0;
  // 0 code · 1 single-quote · 2 double-quote · 3 template · 4 line · 5 block · 6 html
  let st = 0;
  let atLineStart = true;

  const blank = (from, to) => {
    for (let k = from; k < to && k < n; k++) if (out[k] !== '\n') out[k] = ' ';
  };

  while (i < n) {
    const ch = t[i];
    const next = t[i + 1];

    if (st === 4) {                                  // line comment
      if (ch === '\n') { st = 0; atLineStart = true; i++; continue; }
      out[i] = ' '; i++; continue;
    }
    if (st === 5) {                                  // /* block */
      if (ch === '*' && next === '/') { blank(i, i + 2); st = 0; i += 2; continue; }
      if (ch !== '\n') out[i] = ' ';
      i++; continue;
    }
    if (st === 6) {                                  // <!-- html -->
      if (ch === '-' && next === '-' && t[i + 2] === '>') { blank(i, i + 3); st = 0; i += 3; continue; }
      if (ch !== '\n') out[i] = ' ';
      i++; continue;
    }
    if (st === 1 || st === 2 || st === 3) {          // inside a string
      if (ch === '\\') { i += 2; continue; }
      if (st === 1 && ch === "'") st = 0;
      else if (st === 2 && ch === '"') st = 0;
      else if (st === 3 && ch === '`') st = 0;
      else if (ch === '\n' && st !== 3) st = 0;      // recover from unbalanced quote
      i++; continue;
    }

    // ── code state ──
    if (ch === '\n') { atLineStart = true; i++; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }

    if (ch === '/' && next === '/' && t[i - 1] !== ':' && t[i - 1] !== '/' && t[i - 1] !== '\\') {
      blank(i, i + 2); st = 4; i += 2; continue;
    }
    if (ch === '/' && next === '*') { blank(i, i + 2); st = 5; i += 2; continue; }
    if (ch === '<' && next === '!' && t[i + 2] === '-' && t[i + 3] === '-') {
      blank(i, i + 4); st = 6; i += 4; continue;
    }
    if (sql && ch === '-' && next === '-') { blank(i, i + 2); st = 4; i += 2; continue; }
    if (hash && atLineStart && ch === '#' && next !== '!') { out[i] = ' '; st = 4; i++; continue; }
    if (ch === "'") st = 1;
    else if (ch === '"') st = 2;
    else if (ch === '`') st = 3;

    atLineStart = false;
    i++;
  }
  return out.join('');
}

/* ──────────────────────────── scan context api ─────────────────────────── */

function makeContext(root, walked) {
  const cache = new Map();
  const NUL = String.fromCharCode(0);

  const text = (f) => {
    if (cache.has(f.rel)) return cache.get(f.rel);
    let t = '';
    try { t = fs.readFileSync(f.abs, 'utf8'); } catch { t = ''; }
    if (t.indexOf(NUL) !== -1) t = '';           // binary masquerading as text
    cache.set(f.rel, t);
    return t;
  };

  // Comment-stripped view, cached separately. This is what find() reads by
  // default: a commented-out tracker is not a live tracker, and a comment
  // naming a missing safeguard is not that safeguard.
  const masked = new Map();
  const codeText = (f) => {
    if (masked.has(f.rel)) return masked.get(f.rel);
    const m = maskComments(text(f), f.ext);
    masked.set(f.rel, m);
    return m;
  };

  // What source-level checks see by default: your shipped code. Build output,
  // test code and vibe-check's own files are reachable via opts when a check
  // genuinely wants them.
  const source = walked.files.filter((f) => !f.build && !f.test && !f.self);
  const nonSelf = walked.files.filter((f) => !f.self);

  /** find(pattern, opts) → [{ rel, line, snippet, match, file }] */
  function find(pattern, opts = {}) {
    const flags = pattern instanceof RegExp
      ? (pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
      : 'gi';
    const src = pattern instanceof RegExp ? pattern.source : pattern;
    const re = new RegExp(src, flags);
    const pool = opts.files || (opts.build ? nonSelf : source);
    const out = [];
    const limit = opts.limit ?? 400;

    for (const f of pool) {
      if (opts.exts && !opts.exts.includes(f.ext)) continue;
      if (opts.include && !opts.include.test(f.rel)) continue;
      if (opts.exclude && opts.exclude.test(f.rel)) continue;
      const t = opts.comments ? text(f) : codeText(f);
      if (!t) continue;
      re.lastIndex = 0;
      if (!re.test(t)) continue;                  // fast reject on whole file
      const lines = t.split('\n');
      for (let i = 0; i < lines.length; i++) {
        re.lastIndex = 0;
        const m = re.exec(lines[i]);
        if (!m) continue;
        out.push({
          rel: f.rel, line: i + 1, match: m[0], file: f,
          snippet: lines[i].trim().slice(0, 150),
        });
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  const has = (pattern, opts) => find(pattern, { ...opts, limit: 1 }).length > 0;
  const fileNamed = (re) => walked.files.filter((f) => re.test(f.rel) && !f.self);

  let pkg = null;
  const pkgFile = walked.files.find((f) => f.rel === 'package.json');
  if (pkgFile) { try { pkg = JSON.parse(text(pkgFile)); } catch { pkg = null; } }
  const deps = pkg
    ? Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies })
    : [];
  const dep = (needle) => deps.some((d) => d === needle || d.includes(needle));

  // null = git unavailable / not a repo; true/false = definitive answer.
  let tracked;
  const isTracked = (rel) => {
    if (tracked === undefined) {
      try {
        const out = execFileSync('git', ['-C', root, 'ls-files'], {
          encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000,
          maxBuffer: 32 * 1024 * 1024,
        });
        tracked = new Set(out.split('\n').filter(Boolean));
      } catch { tracked = null; }
    }
    return tracked === null ? null : tracked.has(rel);
  };

  const withTests = walked.files.filter((f) => !f.build && !f.self);

  return {
    root, files: walked.files, source, nonSelf, withTests, stats: walked.stats,
    text, codeText, find, has, fileNamed, pkg, deps, dep, isTracked,
    skipped: {
      test: walked.files.filter((f) => f.test && !f.self).length,
      self: walked.files.filter((f) => f.self).length,
    },
  };
}

/* ───────────────────────────── signal library ──────────────────────────── */

const CODE_EXT = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts',
  '.html', '.htm', '.vue', '.svelte', '.astro', '.ejs', '.hbs', '.liquid',
  '.php', '.py', '.rb', '.go', '.erb', '.njk', '.twig'];
const MARKUP_EXT = ['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro',
  '.ejs', '.hbs', '.liquid', '.erb', '.njk', '.twig', '.php'];

const RX = {
  // ── analytics / pixels / session replay ──
  tracker: /(google-analytics\.com|googletagmanager\.com|gtag\s*\(|\bUA-\d{4,}-\d|\bG-[A-Z0-9]{8,}\b|connect\.facebook\.net|fbevents\.js|\bfbq\s*\(|static\.hotjar\.com|\bhj\s*\(|fullstory\.com|\bFS\.identify|logrocket|clarity\.ms|\bclarity\s*\(|mouseflow|smartlook|\bposthog\b|mixpanel|cdn\.segment\.(com|io)|analytics\.track\s*\(|analytics\.tiktok\.com|\bttq\b|sc-static\.net|snaptr\s*\(|snap\.licdn\.com|\b_linkedin_partner_id|ads-twitter\.com|\btwq\s*\(|static\.ads-twitter|heap\.io|\bheap\.track|amplitude|plausible\.io|umami|datadoghq.*rum|vercel\/analytics|@next\/third-parties)/i,
  sessionReplay: /(hotjar|fullstory|logrocket|clarity\.ms|microsoft\/clarity|mouseflow|smartlook|session_recording|sessionRecording|replaysSessionSampleRate|replaysOnErrorSampleRate|rrweb|sessionReplaySampleRate|Replay\s*\(\s*\)|openreplay)/i,
  consentLib: /(cookieconsent|CookieConsent|vanilla-cookieconsent|react-cookie-consent|@klaro|klaro|osano|onetrust|OneTrust|OptanonWrapper|cookiebot|Cookiebot|termly|iubenda|usercentrics|orejime|tarteaucitron|cookieyes|@c15t|c15t|consentmanager|civicuk|axeptio|didomi|Didomi|cookiefirst|silktide)/i,
  consentGate: /(gtag\s*\(\s*['"]consent['"]|dataLayer\.push\s*\(\s*\{\s*['"]?consent|hasConsent|consentGranted|consentGiven|hasAnalyticsConsent|cookieConsent|getConsent|consentState|analyticsEnabled|trackingAllowed|canTrack|allowTracking|consent_mode|denied['"]\s*,?\s*analytics_storage|analytics_storage)/i,
  masking: /(maskAllInputs|maskTextSelector|maskInputOptions|data-hj-suppress|hjSuppress|fs-exclude|fs-mask|data-private|ph-no-capture|data-clarity-mask|data-clarity-unmask|dd-privacy|maskUserInput|privacyLevel|inputIgnore|defaultPrivacyLevel)/i,

  // ── fonts ──
  // Requires a real URL context (href/src/url()/@import///) so that prose or
  // documentation mentioning the hostname is not reported as a live request.
  googleFontsRemote: /(["'(=]|\/\/|@import\s+)(https?:)?\/\/fonts\.(googleapis|gstatic)\.com|(href|src)\s*=\s*["'][^"']*fonts\.(googleapis|gstatic)\.com/i,
  nextFontGoogle: /from\s+['"]next\/font\/google['"]|require\(\s*['"]next\/font\/google['"]/,
  otherRemoteFonts: /(["'(=]|\/\/|@import\s+)(https?:)?\/\/(use\.typekit\.net|fast\.fonts\.net|cloud\.typography\.com|fonts\.bunny\.net|api\.fontshare\.com)/i,

  // ── secrets ──
  publicEnvPrefix: /\b(NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_|EXPO_PUBLIC_|GATSBY_|NUXT_PUBLIC_|VUE_APP_|SVELTE_PUBLIC_)/,
  jwt: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,

  // ── databases ──
  rlsDisabled: /alter\s+table\s+[^;]{1,120}?disable\s+row\s+level\s+security/i,
  rlsEnabled: /enable\s+row\s+level\s+security/i,
  policyTrue: /(using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\))/i,
  firebaseOpen: /(allow\s+read\s*,\s*write\s*:\s*if\s+true|allow\s+read\s*,\s*write\s*;|allow\s+read\s*,\s*write\s*:\s*if\s+request\.time\s*<|"\.read"\s*:\s*true|"\.write"\s*:\s*true|allow\s+write\s*:\s*if\s+true|allow\s+read\s*:\s*if\s+true)/i,
  mongoOpen: /(0\.0\.0\.0\/0|mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@)/,

  // ── policies & links ──
  privacyPolicy: /(privacy[-_ ]?policy|\/privacy\b|privacyPolicy|Privacy Policy)/i,
  termsOfService: /(terms[-_ ]?(of[-_ ])?(service|use|and[-_ ]conditions)|\/terms\b|\/tos\b|termsOfService|Terms of Service|Terms & Conditions)/i,
  doNotSell: /(do[-_ ]?not[-_ ]?sell|Your Privacy Choices|privacy-choices|limit the use of my sensitive|opt[-_ ]?out[-_ ]?of[-_ ]?sale)/i,
  gpc: /(globalPrivacyControl|Sec-GPC|sec-gpc)/i,
  refundPolicy: /(refund|money[-_ ]?back|cancellation policy|right of withdrawal|14[-\s]day)/i,

  // ── uploads / UGC ──
  uploads: /(<input[^>]*type\s*=\s*['"]?file|type\s*=\s*\{?['"]file['"]|\bmulter\b|\bformidable\b|uploadthing|UploadButton|UploadDropzone|react-dropzone|useDropzone|supabase[\s\S]{0,40}\.storage|\.from\(['"][^'"]+['"]\)\.upload|PutObjectCommand|S3Client|cloudinary|@vercel\/blob|put\s*\(\s*['"]?[^'"]*['"]?\s*,\s*file|presigned|getSignedUrl|FileUpload|image\/\*)/i,
  ugcText: /(comment|review|post|forum|thread|reply|message|discussion)s?\s*(table|model|schema|collection)|createComment|addComment|newPost|submitReview/i,
  dmca: /(DMCA|designated agent|copyright agent|17 U\.S\.C|512\(c\)|notice[- ]and[- ]takedown|repeat infringer)/i,

  // ── children ──
  childDirected: /(for kids|kid[-\s]?friendly|kids['’]? app|children['’]?s (app|site|content|game)|child[-\s]?directed|toddler|preschool|elementary school|K-?12|classroom|our students|ages? 4-|ages? 5-|ages? 6-|ages? 7-|ages? 8-|ages? 9-|ages? 10-|ages? 11-|ages? 12-|COPPA|parental consent|parent dashboard)/i,
  ageGate: /(date[-_ ]?of[-_ ]?birth|dateOfBirth|birth[-_ ]?date|birthday|\bdob\b|age[-_ ]?gate|ageGate|ageVerif|verifyAge|minimum age|minAge|over 13|under 13|at least 13|13 (years|or older)|18\+|I am over)/i,

  // ── email ──
  emailSender: /(\bresend\b|Resend\(|nodemailer|@sendgrid|sendgrid|@aws-sdk\/client-ses|SESClient|SendEmailCommand|postmark|mailgun|mailchimp|@mailchimp|loops\.so|LoopsClient|brevo|sendinblue|customer\.?io|\bmailjet\b|smtp\.|createTransport|sendMail|sendEmail)/i,
  marketingEmail: /(newsletter|marketing email|campaign|broadcast|drip|mailing list|subscribe to (our )?(email|newsletter)|audience|contactList|mailing_list)/i,
  unsubscribe: /(unsubscribe|opt[-_ ]?out|manage (your )?(email )?preferences|List-Unsubscribe|email preferences)/i,
  postalAddress: /(\d{1,6}\s+[A-Z][A-Za-z.'-]+\s+(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Suite|Ste\.?|Floor|Fl\.?|PO Box|P\.O\. Box)|\bPO Box\s*\d+|[A-Z]{2}\s+\d{5}(-\d{4})?\b|mailing address|postal address|registered office)/,

  // ── subscriptions ──
  subscription: /(mode\s*:\s*['"]subscription['"]|['"]subscription['"]\s*,?\s*$|stripe\.subscriptions|createSubscription|\brecurring\b|interval\s*:\s*['"](day|week|month|year)['"]|trial_period_days|trialPeriodDays|price_[A-Za-z0-9]{10,}|lemonsqueezy|lemon_squeezy|\bpaddle\b|revenuecat|chargebee|recurly|\bper month\b|\/mo\b|\/month\b|billed (monthly|annually|yearly))/i,
  autoRenewDisclosure: /(auto[-\s]?renew|automatically renew|renews automatically|will renew|recurring charge|until (you )?cancel|cancel any ?time|renewal date|recurring billing)/i,
  onlineCancel: /(cancelSubscription|cancel_subscription|billingPortal|billing[-_ ]?portal|createBillingPortalSession|customer_portal|\/cancel\b|cancelAtPeriodEnd|cancel_at_period_end|manage subscription|manage billing)/i,

  // ── AI ──
  llmUse: /(@anthropic-ai\/sdk|anthropic|api\.openai\.com|openai|@google\/gener|generativeai|GoogleGenerativeAI|@mistralai|replicate|ollama|together\.ai|groq|bedrock-runtime|vertexai|langchain|llamaindex|from\s+['"]ai['"]|streamText|generateText|useChat|createOpenAI|chat\/completions|gpt-[0-9]|claude-[a-z0-9]|gemini-[0-9])/i,
  chatUi: /(useChat|\/api\/chat|ChatWindow|ChatWidget|Chatbot|chat[-_ ]?bot|MessageList|messages\.map|ChatMessage|assistant['"]?\s*:|role\s*:\s*['"]assistant)/i,
  aiDisclosure: /(AI[-\s]?generated|generated by AI|powered by AI|AI assistant|you(['’]re| are) (chatting|talking) (with|to) an AI|this is an AI|automated assistant|not a human|I am an AI|AI[-\s]?powered|may (produce|contain) (inaccurate|errors|mistakes)|can make mistakes|AI chatbot|virtual assistant)/i,

  // ── payments / tax ──
  payments: /(stripe|@stripe\/|STRIPE_|paddle|lemonsqueezy|lemon_squeezy|braintree|\bpaypal\b|razorpay|paystack|mollie|checkout\.session|PaymentIntent|payment_intent|polar\.sh|@polar-sh)/i,
  taxHandling: /(automatic_tax|automaticTax|tax_behavior|taxBehavior|tax_rates|taxRates|stripe tax|\bvat\b|\bVAT\b|\bgst\b|\bGST\b|sales tax|taxjar|avalara|TaxId|tax_id_collection|vatNumber|vat_number)/,

  // ── eu audience ──
  euSignal: /(\beuro?\b|EUR|€|\bGDPR\b|\bDSGVO\b|\bEEA\b|\beu[-_]?(country|countries|region)|de-DE|fr-FR|es-ES|it-IT|nl-NL|pl-PL|\.eu\b|europe|Impressum|datenschutz|politique de confidentialité)/i,
};

/* ──────────────────────────────── helpers ──────────────────────────────── */

function dedupe(findings) {
  const seen = new Set();
  const out = [];
  for (const f of findings) {
    const k = `${f.rel}:${f.line}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

const b64urlDecode = (s) => {
  try {
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch { return ''; }
};

const POLICY_FILE = /(privacy|terms|tos|legal|imprint|impressum|eula|refund|cookie)/i;

/**
 * Mask credential-shaped runs so a secret's value never reaches the report,
 * the terminal or the JSON. Keeps up to 8 leading characters, which is enough
 * to recognise the provider (`sk_live_…`, `AKIAIOSF…`) and decide what to
 * rotate, and drops the rest. Short, non-credential text (`-----BEGIN RSA
 * PRIVATE KEY-----`) passes through so the finding stays readable.
 */
/**
 * Provider-shaped credential patterns, as [regex, label, severity].
 * Shared by the secrets check and by scrubSecrets(), which is the global
 * safety net on the way out.
 */
const SECRET_PATTERNS = [
    [/sk_live_[0-9a-zA-Z]{16,}/, 'Stripe live secret key', 'hard'],
    [/rk_live_[0-9a-zA-Z]{16,}/, 'Stripe live restricted key', 'hard'],
    [/sk_test_[0-9a-zA-Z]{16,}/, 'Stripe test secret key', 'soft'],
    [/whsec_[0-9a-zA-Z]{16,}/, 'Stripe webhook signing secret', 'hard'],
    [/sk-ant-api\d{2}-[A-Za-z0-9_\-]{20,}/, 'Anthropic API key', 'hard'],
    [/sk-proj-[A-Za-z0-9_\-]{20,}/, 'OpenAI project key', 'hard'],
    [/\bsk-[A-Za-z0-9]{32,}\b/, 'OpenAI-style secret key', 'hard'],
    [/AKIA[0-9A-Z]{16}/, 'AWS access key id', 'hard'],
    [/ghp_[A-Za-z0-9]{36}/, 'GitHub personal access token', 'hard'],
    [/github_pat_[A-Za-z0-9_]{22,}/, 'GitHub fine-grained token', 'hard'],
    [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token', 'hard'],
    [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token', 'hard'],
    [/SG\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}/, 'SendGrid API key', 'hard'],
    [/re_[A-Za-z0-9]{20,}/, 'Resend API key', 'hard'],
    [/SK[0-9a-fA-F]{32}/, 'Twilio API key', 'hard'],
    [/AC[0-9a-fA-F]{32}/, 'Twilio account SID', 'soft'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'Private key block', 'hard'],
    [/(postgres(ql)?|mysql|mongodb(\+srv)?|redis|rediss):\/\/[^:@\s'"]+:[^@\s'"]{3,}@/, 'Database URL with inline password', 'hard'],
    [/dop_v1_[a-f0-9]{64}/, 'DigitalOcean token', 'hard'],
    [/shpat_[a-fA-F0-9]{32}/, 'Shopify access token', 'hard'],
    [/glpat-[A-Za-z0-9_\-]{20,}/, 'GitLab token', 'hard'],
    [/npm_[A-Za-z0-9]{36}/, 'npm token', 'hard'],
];

function redact(value) {
  return String(value).replace(/[A-Za-z0-9_\-]{12,}/g, (run) =>
    run.slice(0, Math.min(8, run.length - 4)) + '\u2022'.repeat(10));
}

/**
 * Last line of defence before anything is printed. Any check can incidentally
 * quote a line that happens to hold a credential — `const STRIPE_SECRET =
 * "sk_live_…"` matches the payments pattern as readily as the secrets one — so
 * every evidence snippet is scrubbed on the way out, in every output format.
 * Only provider-shaped credentials are masked, so ordinary evidence stays
 * readable.
 */
function scrubSecrets(text) {
  let out = String(text);
  for (const [re] of SECRET_PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), redact);
  }
  // Any JWT, whatever its payload.
  out = out.replace(new RegExp(RX.jwt.source, 'g'), redact);
  return out;
}

/* ───────────────────────────────── checks ─────────────────────────────── */

const CHECKS = [

/* 1 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'google-fonts',
  title: 'Google Fonts served from Google servers',
  law: 'GDPR Art. 6 · LG München I, 20 Jan 2022, 3 O 17493/20',
  applies: 'If any EU/EEA visitor can load your pages.',
  run(ctx) {
    const remote = dedupe(ctx.find(RX.googleFontsRemote, { exts: [...CODE_EXT, '.css', '.scss', '.sass', '.less'] }));
    const nextFont = dedupe(ctx.find(RX.nextFontGoogle));
    const otherRemote = dedupe(ctx.find(RX.otherRemoteFonts, { exts: [...CODE_EXT, '.css', '.scss', '.less'] }));

    const evidence = [...remote, ...otherRemote];
    if (remote.length) {
      return {
        status: 'fail',
        summary: `${remote.length} reference${remote.length === 1 ? '' : 's'} to Google's font CDN. Every EU visitor's IP address is sent to Google before they can consent.`,
        evidence,
        fix: [
          'Self-host the font files so no third-party request happens:',
          '  1. npx fontsource-cli add inter   # or download from fonts.google.com',
          '  2. Copy the .woff2 files into /public/fonts/',
          '  3. Replace the <link> with a local @font-face { src: url("/fonts/…woff2") }',
          '  4. Delete every fonts.googleapis.com / fonts.gstatic.com reference',
          '  5. Keep the OFL/Apache licence file next to the fonts (see third-party-licences)',
          'Next.js: next/font/google already self-hosts at build time — that is fine.',
        ].join('\n'),
      };
    }
    if (otherRemote.length) {
      return {
        status: 'review',
        summary: `Fonts load from a third-party CDN (${otherRemote.length} reference${otherRemote.length === 1 ? '' : 's'}). Same IP-disclosure analysis as the Munich Google Fonts case may apply.`,
        evidence,
        fix: 'Self-host the font files, or confirm the CDN is covered by your consent banner and a data-processing agreement.',
      };
    }
    if (nextFont.length) {
      return {
        status: 'pass',
        summary: 'Uses next/font/google, which downloads and self-hosts fonts at build time — no runtime request to Google.',
        evidence: nextFont,
        fix: '',
      };
    }
    return { status: 'pass', summary: 'No remote font-CDN requests found.', evidence: [], fix: '' };
  },
},

/* 2 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'tracking-before-consent',
  title: 'Analytics, pixels or session replay firing before consent',
  law: 'ePrivacy Dir. Art. 5(3) + GDPR · CIPA §631/§632 (Cal. Penal Code; §637.2 allows $5,000 per violation)',
  applies: 'If you have EU visitors (consent) or California visitors (wiretapping theories).',
  run(ctx) {
    const trackers = dedupe(ctx.find(RX.tracker, { exts: CODE_EXT }));
    if (!trackers.length) {
      return { status: 'pass', summary: 'No third-party analytics, advertising pixels or session-replay SDKs found.', evidence: [], fix: '' };
    }

    const consent = dedupe([
      ...ctx.find(RX.consentLib, { exts: [...CODE_EXT, '.json'] }),
      ...ctx.find(RX.consentGate, { exts: CODE_EXT }),
    ]);
    const replay = dedupe(ctx.find(RX.sessionReplay, { exts: CODE_EXT }));
    const masking = dedupe(ctx.find(RX.masking, { exts: CODE_EXT }));

    const fixLines = [
      'Gate every non-essential tag behind an explicit opt-in:',
      '',
      '  // only load after the visitor has actually clicked "Accept"',
      '  if (getConsent("analytics") === "granted") {',
      '    loadAnalytics();',
      '  }',
      '',
      'Google tags: ship Consent Mode v2 defaults denied, then update on accept:',
      "  gtag('consent','default',{ analytics_storage:'denied', ad_storage:'denied' });",
      "  gtag('consent','update',{ analytics_storage:'granted' });   // on accept",
    ];
    if (replay.length && !masking.length) {
      fixLines.push(
        '',
        'Session replay is recording form fields. Turn on input masking:',
        '  Hotjar    → add data-hj-suppress to sensitive fields',
        '  FullStory → class="fs-exclude" / fs-mask',
        '  Clarity   → data-clarity-mask="true"',
        '  PostHog   → class="ph-no-capture", or session_recording.maskAllInputs = true',
        '  Sentry    → Replay({ maskAllText: true, maskAllInputs: true })',
      );
    }

    if (!consent.length) {
      const what = replay.length ? 'Session replay and analytics' : 'Analytics or advertising tags';
      return {
        status: 'fail',
        summary: `${what} load with no consent mechanism anywhere in the codebase (${trackers.length} tag reference${trackers.length === 1 ? '' : 's'}). In the EU non-essential tags may not run before opt-in; in California, recording visitors with a third party has driven a wave of CIPA claims.`,
        evidence: [...trackers, ...replay].slice(0, 40),
        fix: fixLines.join('\n'),
      };
    }
    if (replay.length && !masking.length) {
      return {
        status: 'fail',
        summary: `Session replay found with no input-masking directive. Keystrokes typed into forms (passwords, card numbers, health details) may be captured and shared with the replay vendor.`,
        evidence: [...replay, ...trackers].slice(0, 40),
        fix: fixLines.join('\n'),
      };
    }
    return {
      status: 'review',
      summary: `Consent machinery exists (${consent[0].rel}) alongside ${trackers.length} tracking reference${trackers.length === 1 ? '' : 's'}. A static scan cannot prove the tags actually wait for opt-in.`,
      evidence: [...consent.slice(0, 3), ...trackers].slice(0, 40),
      fix: 'Verify in a real browser: open DevTools → Network, hard-reload with a fresh profile, and confirm zero requests to analytics/pixel hosts (and zero non-essential cookies) before you click Accept. Then confirm Reject actually blocks them.',
    };
  },
},

/* 3 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'cookie-consent-banner',
  title: 'Cookie / tracking consent banner for EU visitors',
  law: 'ePrivacy Dir. Art. 5(3) as implemented in national law; GDPR for the consent standard',
  applies: 'If you set any non-essential cookie or read any non-essential local storage for EU/EEA visitors.',
  run(ctx) {
    const consentLib = dedupe(ctx.find(RX.consentLib, { exts: [...CODE_EXT, '.json'] }));
    const consentCode = dedupe(ctx.find(RX.consentGate, { exts: CODE_EXT }));
    const trackers = dedupe(ctx.find(RX.tracker, { exts: CODE_EXT }));
    const eu = dedupe(ctx.find(RX.euSignal, { exts: [...CODE_EXT, '.md', '.json'] }));

    if (consentLib.length || consentCode.length) {
      return {
        status: 'review',
        summary: 'A consent mechanism is present. Check it meets the GDPR consent standard: reject is as easy as accept, nothing pre-ticked, granular categories, and withdrawal is always reachable.',
        evidence: [...consentLib, ...consentCode].slice(0, 10),
        fix: 'Audit the banner: (1) "Reject all" has equal visual weight to "Accept all"; (2) no non-essential tag fires before a choice; (3) categories are opt-in individually; (4) a persistent link re-opens preferences; (5) the choice is logged with a timestamp.',
      };
    }
    if (!trackers.length) {
      return {
        status: 'pass',
        summary: 'No non-essential tracking detected, so a consent banner may not be required. (Strictly necessary cookies — your own session cookie — need no consent.)',
        evidence: [],
        fix: '',
      };
    }
    return {
      status: 'fail',
      summary: `Tracking tags found but no consent banner or consent library anywhere${eu.length ? '; the project also shows EU-facing signals' : ''}.`,
      evidence: [...trackers.slice(0, 8), ...eu.slice(0, 4)],
      fix: [
        'Add a consent layer before any non-essential tag runs. Zero-cost options:',
        '  npm i vanilla-cookieconsent     # self-hosted, no vendor account',
        '  npm i @c15t/react               # open-source consent management',
        'Requirements that matter more than the library you pick:',
        '  • nothing non-essential loads until the visitor opts in',
        '  • "Reject all" is one click and as prominent as "Accept all"',
        '  • the decision is stored and re-openable from a footer link',
      ].join('\n'),
    };
  },
},

/* 4 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'secrets-exposed',
  title: 'Secrets, API keys or credentials reachable by the public',
  law: 'Not a statute — a breach vector. Can trigger GDPR Art. 32 / CCPA data-breach liability and provider terms termination.',
  applies: 'Always. Every project has keys, and the browser is not a place to keep them.',
  run(ctx) {
    const hard = [];
    const soft = [];


    for (const [re, label, sev] of SECRET_PATTERNS) {
      const hits = dedupe(ctx.find(re, {
        files: ctx.withTests.concat(ctx.files.filter((f) => f.build && !f.self)),
        comments: true,
        exclude: /\.(md|mdx)$/i,
      }));
      // Deliberately drop h.snippet: the source line contains the secret.
      for (const h of hits) {
        // A key in a test fixture is usually a fixture. Worth flagging, not
        // worth failing a launch over.
        const bucket = sev === 'hard' && !h.file.test ? hard : soft;
        bucket.push({
          rel: h.rel, line: h.line, redacted: redact(h.match),
          label: h.file.test ? `${label} (in test code)` : label,
        });
      }
    }

    const credentialPool = ctx.withTests.concat(ctx.files.filter((f) => f.build && !f.self));
    const notProse = /\.(md|mdx|rst|txt)$/i;

    // Supabase service_role JWTs — decode the payload to be sure.
    for (const h of ctx.find(RX.jwt, { files: credentialPool, comments: true, exclude: notProse })) {
      const token = h.match;
      const payload = b64urlDecode(token.split('.')[1] || '');
      if (/service_role/.test(payload)) {
        (h.file.test ? soft : hard).push({
          rel: h.rel, line: h.line, redacted: redact(token),
          label: 'Supabase service_role JWT (bypasses every RLS policy)'
            + (h.file.test ? ' (in test code)' : ''),
        });
      }
    }

    // Public-prefixed env vars that carry something secret-shaped.
    for (const h of ctx.find(
      /(NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_|EXPO_PUBLIC_|GATSBY_|NUXT_PUBLIC_|VUE_APP_)[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|_PWD|CLIENT_SECRET|API_SECRET|ACCESS_TOKEN|REFRESH_TOKEN|WEBHOOK_SECRET)[A-Z0-9_]*/,
      { files: credentialPool, comments: true, exclude: notProse },
    )) {
      (h.file.test ? soft : hard).push({
        rel: h.rel, line: h.line, redacted: h.match,
        label: 'Secret-shaped value behind a browser-exposed env prefix'
          + (h.file.test ? ' (in test code)' : ''),
      });
    }

    // Committed .env files with real-looking values.
    for (const f of ctx.files) {
      if (f.self) continue;
      const base = path.basename(f.rel);
      if (!base.startsWith('.env')) continue;
      if (/\.(example|sample|template|dist)$/i.test(base) || base === '.env.example') continue;
      const t = ctx.text(f);
      const filled = t.split('\n').filter((l) => /^[A-Z][A-Z0-9_]*\s*=\s*\S/.test(l.trim()) && !/=\s*(''|""|<|your|xxx|changeme|replace)/i.test(l));
      if (!filled.length) continue;
      const trackedState = ctx.isTracked(f.rel);
      const entry = {
        rel: f.rel, line: 1, snippet: `${filled.length} populated variable${filled.length === 1 ? '' : 's'}`,
        label: trackedState === true ? 'Committed to git' : trackedState === false ? 'Present on disk (not tracked by git)' : 'Present on disk',
      };
      (trackedState === true ? hard : soft).push(entry);
    }

    // Firebase web API keys are *designed* to be public — never flag them as leaks.
    const firebaseKey = ctx.has(/AIza[0-9A-Za-z_\-]{35}/, { files: credentialPool, comments: true });

    const gitignore = ctx.files.find((f) => f.rel === '.gitignore');
    const envIgnored = gitignore ? /^\s*\*?\.env/m.test(ctx.text(gitignore)) : false;

    const fix = [
      'If any value above is live, treat it as compromised:',
      '  1. Rotate / revoke the key in the provider dashboard NOW — rotation first, cleanup second.',
      '  2. Move it server-side: an API route, server action, or edge function holds the key;',
      '     the browser calls your endpoint, never the provider.',
      '  3. Only publishable/anon keys belong behind NEXT_PUBLIC_ / VITE_ / etc.',
      '  4. git rm --cached .env && echo ".env*" >> .gitignore && echo "!.env.example" >> .gitignore',
      '  5. History still contains it: purge with git-filter-repo (and force-push), or rotate and move on.',
      '  6. Add a guard so it cannot come back: `npx gitleaks detect` or a pre-commit hook.',
    ].join('\n');

    if (hard.length) {
      const kinds = [...new Set(hard.map((h) => h.label))];
      return {
        status: 'fail',
        summary: `${hard.length} exposed credential${hard.length === 1 ? '' : 's'} found (${kinds.slice(0, 3).join('; ')}${kinds.length > 3 ? `; +${kinds.length - 3} more kinds` : ''}).`,
        evidence: hard.map((h) => ({
          rel: h.rel, line: h.line,
          snippet: `${h.label} — ${(h.redacted || h.snippet || '').slice(0, 90)}`,
        })),
        fix,
      };
    }
    if (soft.length) {
      return {
        status: 'review',
        summary: `${soft.length} lower-risk credential signal${soft.length === 1 ? '' : 's'} (test keys or untracked local .env). Confirm none of these reach production or git.`,
        evidence: soft.map((h) => ({
          rel: h.rel, line: h.line,
          snippet: `${h.label} — ${(h.redacted || h.snippet || '').slice(0, 90)}`,
        })),
        fix,
      };
    }
    return {
      status: 'pass',
      summary: `No exposed secrets matched.${firebaseKey ? ' (A Firebase web API key was seen — that one is a public identifier by design, not a leak; your protection is Firestore rules.)' : ''}${envIgnored ? ' .env is gitignored.' : ''}`,
      evidence: [],
      fix: '',
    };
  },
},

/* 5 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'open-database',
  title: 'Database left world-readable / world-writable',
  law: 'Not a statute — the single most common cause of vibe-coded data breaches. Breach duties then follow (GDPR Art. 33, state breach-notification laws).',
  applies: 'Always, if the browser talks to your database directly — Supabase, Firebase, Mongo Realm or similar.',
  run(ctx) {
    const problems = [];

    const disabled = dedupe(ctx.find(RX.rlsDisabled, { exts: ['.sql', '.ts', '.js', '.mjs', '.prisma'] }));
    disabled.forEach((h) => problems.push({ ...h, label: 'Row Level Security explicitly disabled' }));

    const openPolicy = dedupe(ctx.find(RX.policyTrue, { exts: ['.sql'] }));
    openPolicy.forEach((h) => problems.push({ ...h, label: 'Policy with using(true) — matches every row for everyone' }));

    const ruleFiles = ctx.fileNamed(/(firestore\.rules|storage\.rules|database\.rules\.json|firebase\.rules)$/i);
    for (const f of ruleFiles) {
      const t = ctx.text(f);
      const lines = t.split('\n');
      lines.forEach((l, i) => {
        if (RX.firebaseOpen.test(l)) {
          problems.push({ rel: f.rel, line: i + 1, snippet: l.trim().slice(0, 140), label: 'Firebase rule grants public access' });
        }
      });
    }

    const mongo = dedupe(ctx.find(/0\.0\.0\.0\/0/, { exts: ['.tf', '.tfvars', '.yml', '.yaml', '.json'] }));
    mongo.forEach((h) => problems.push({ ...h, label: 'Network access open to 0.0.0.0/0' }));

    // Supabase project with tables but no RLS enabled anywhere.
    const usesSupabase = ctx.dep('@supabase') || ctx.has(/supabase/i, { exts: [...CODE_EXT, '.toml', '.json'] });
    const createsTables = ctx.has(/create\s+table/i, { exts: ['.sql'] });
    const enablesRls = ctx.has(RX.rlsEnabled, { exts: ['.sql'] });
    const noRlsAnywhere = usesSupabase && createsTables && !enablesRls;
    if (noRlsAnywhere) {
      const t = ctx.find(/create\s+table/i, { exts: ['.sql'], limit: 6 });
      t.forEach((h) => problems.push({ ...h, label: 'Table created with no "enable row level security" anywhere in migrations' }));
    }

    const fix = [
      'Supabase — deny by default, then allow narrowly:',
      '  alter table public.posts enable row level security;',
      '  create policy "owner reads own rows" on public.posts',
      '    for select using (auth.uid() = user_id);',
      '  create policy "owner writes own rows" on public.posts',
      '    for insert with check (auth.uid() = user_id);',
      '  -- never ship using(true) on a table holding user data',
      '',
      'Firebase — replace any open rule:',
      '  match /users/{uid} {',
      '    allow read, write: if request.auth != null && request.auth.uid == uid;',
      '  }',
      '',
      'Then verify from the outside: with only the anon/public key, try to read a row',
      'you do not own. It must fail. Supabase users: run the Security Advisor.',
    ].join('\n');

    if (problems.length) {
      const definite = problems.filter((p) => !/no "enable row level security"/.test(p.label));
      return {
        status: definite.length ? 'fail' : 'review',
        summary: definite.length
          ? `${problems.length} rule${problems.length === 1 ? '' : 's'} expose data to anyone with your public key.`
          : 'Tables are created but no migration ever enables Row Level Security — with Supabase that means the anon key can read (and often write) those tables.',
        evidence: problems.map((p) => ({ ...p, snippet: `${p.label} — ${p.snippet}` })),
        fix,
      };
    }
    return {
      status: usesSupabase || ruleFiles.length ? 'review' : 'pass',
      summary: usesSupabase || ruleFiles.length
        ? 'No open rules found in the files on disk, but policies usually live in the hosted dashboard. Verify there.'
        : 'No browser-facing database configuration found to check.',
      evidence: [],
      fix: usesSupabase || ruleFiles.length ? fix : '',
    };
  },
},

/* 6 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'privacy-policy-terms',
  title: 'Privacy policy and terms published',
  law: 'CalOPPA, Cal. B&P Code §22575 et seq. (privacy policy; 30-day cure after notice, up to $2,500 per violation under the UCL; separately, where the CCPA applies, CCPA fines are up to $2,663 per violation / $7,988 per intentional violation). GDPR Arts. 13–14 if you have EU users.',
  applies: 'Any commercial site or app that collects any personally identifiable information from consumers — including an email address.',
  run(ctx) {
    const policyFiles = ctx.fileNamed(POLICY_FILE).filter((f) => !f.build);
    const privacyRefs = dedupe(ctx.find(RX.privacyPolicy, { exts: [...MARKUP_EXT, '.md', '.mdx', '.ts', '.tsx', '.js', '.jsx'] }));
    const termsRefs = dedupe(ctx.find(RX.termsOfService, { exts: [...MARKUP_EXT, '.md', '.mdx', '.ts', '.tsx', '.js', '.jsx'] }));

    const hasPrivacyPage = policyFiles.some((f) => /privacy/i.test(f.rel));
    const hasTermsPage = policyFiles.some((f) => /(terms|tos|eula)/i.test(f.rel));

    const missing = [];
    if (!hasPrivacyPage && !privacyRefs.length) missing.push('privacy policy');
    if (!hasTermsPage && !termsRefs.length) missing.push('terms of service');

    const fix = [
      'Publish both, link them from the footer of every page, and link the privacy',
      'policy from every form that collects data.',
      '',
      'A privacy policy must state, at minimum:',
      '  • the categories of personal information you collect',
      '  • the categories of third parties you disclose it to (name your processors:',
      '    Stripe, Supabase, Resend, your analytics vendor…)',
      '  • how a user reviews, corrects and deletes their data, and how to contact you',
      '  • how you announce material changes, and the policy\'s effective date',
      '  • CalOPPA: how you respond to Do Not Track signals',
      '  • GDPR (if EU users): legal basis per purpose, retention, transfers, rights',
      '',
      'Write it from your actual data flows. A generated template that names services',
      'you do not use — or omits ones you do — is its own compliance problem.',
    ].join('\n');

    if (missing.length === 2) {
      return { status: 'fail', summary: 'No privacy policy and no terms of service found anywhere in the project.', evidence: [], fix };
    }
    if (missing.length === 1) {
      return {
        status: 'fail',
        summary: `No ${missing[0]} found.`,
        evidence: [...privacyRefs.slice(0, 3), ...termsRefs.slice(0, 3)],
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'Both documents exist. Confirm they describe what the code actually does — every processor you send data to, and nothing you do not use.',
      evidence: [
        ...policyFiles.slice(0, 6).map((f) => ({ rel: f.rel, line: 1, snippet: 'policy document' })),
        ...privacyRefs.slice(0, 2), ...termsRefs.slice(0, 2),
      ],
      fix,
    };
  },
},

/* 7 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'ccpa-do-not-sell',
  title: '"Do Not Sell or Share My Personal Information" opt-out',
  law: 'CCPA as amended by the CPRA, Cal. Civ. Code §1798.135; CPPA regulations. Fines up to $2,663 per violation / $7,988 per intentional violation (from 1 Jan 2025)',
  applies: 'If you meet a CCPA threshold (roughly: >$26.6M gross annual revenue, or buying/selling/sharing the personal info of 100,000+ California consumers or households, or ≥50% of revenue from selling personal info) AND you sell or share personal information — which includes sharing for cross-context behavioural advertising.',
  run(ctx) {
    const adPixels = dedupe(ctx.find(/(connect\.facebook\.net|fbevents|\bfbq\s*\(|analytics\.tiktok|\bttq\b|snaptr|_linkedin_partner_id|ads-twitter|\btwq\s*\(|googlesyndication|doubleclick|google_tag_params|gtag\s*\(\s*['"]config['"]\s*,\s*['"]AW-)/i, { exts: CODE_EXT }));
    const link = dedupe(ctx.find(RX.doNotSell, { exts: [...MARKUP_EXT, '.md', '.mdx', '.ts', '.tsx', '.js', '.jsx'] }));
    const gpc = dedupe(ctx.find(RX.gpc, { exts: CODE_EXT }));

    const fix = [
      'If the thresholds apply and you share data for ad targeting:',
      '  1. Add a conspicuous footer link on every page, labelled exactly',
      '     "Do Not Sell or Share My Personal Information"',
      '     (or use the standard "Your Privacy Choices" link + icon).',
      '  2. Make the opt-out work without an account and without a login wall.',
      '  3. Honour Global Privacy Control automatically — it is a valid opt-out signal:',
      '       if (navigator.globalPrivacyControl) disableAdTech();',
      '  4. Propagate the signal downstream (e.g. Google restricted data processing,',
      '     Meta Limited Data Use).',
      '  5. Describe the right and the method in your privacy policy.',
      '',
      'Under the thresholds? Keep the finding on file with a dated note of why it does',
      'not apply yet, and re-check when you grow.',
    ].join('\n');

    if (adPixels.length && !link.length) {
      return {
        status: 'fail',
        summary: `Advertising/cross-context pixels found (${adPixels.length} reference${adPixels.length === 1 ? '' : 's'}) with no opt-out link. Sharing identifiers with an ad platform is "sharing" under the CPRA${gpc.length ? '' : ', and nothing in the code honours Global Privacy Control'}.`,
        evidence: adPixels,
        fix,
      };
    }
    if (!adPixels.length && !link.length) {
      return {
        status: 'pass',
        summary: 'No advertising or cross-context behavioural pixels found, so the opt-out link may not be required. Re-check the moment you add an ad pixel.',
        evidence: [],
        fix: '',
      };
    }
    return {
      status: 'review',
      summary: 'An opt-out link exists. Confirm it is on every page, works without login, and actually stops downstream sharing — including honouring Global Privacy Control.',
      evidence: [...link.slice(0, 6), ...gpc.slice(0, 3), ...adPixels.slice(0, 6)],
      fix,
    };
  },
},

/* 8 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'dmca-agent',
  title: 'DMCA designated agent for user-uploaded content',
  law: '17 U.S.C. §512(c)(2) — designating an agent with the U.S. Copyright Office is a threshold condition for the §512(c) safe harbour',
  applies: 'If users can upload or post material that you store and serve (images, video, audio, documents, or text).',
  run(ctx) {
    const uploads = dedupe(ctx.find(RX.uploads, { exts: [...CODE_EXT, '.json'] }));
    const ugc = dedupe(ctx.find(RX.ugcText, { exts: [...CODE_EXT, '.sql', '.prisma'] }));
    const dmcaRefs = dedupe(ctx.find(RX.dmca, { exts: [...MARKUP_EXT, '.md', '.mdx', '.ts', '.tsx', '.js', '.jsx'] }));

    const fix = [
      'Without a designated agent on file you simply do not have the §512(c) safe',
      'harbour — which means an infringement claim over something a user uploaded',
      'lands on you directly. Fixing it costs $6 and about ten minutes:',
      '',
      '  1. Register at https://dmca.copyright.gov (online directory only — the old',
      '     paper designations no longer count). Fee: $6 per designation.',
      '  2. Publish the same agent details on your site, e.g. /dmca or inside your',
      '     terms: agent name, address, phone, email.',
      '  3. Write a notice-and-takedown process and actually follow it.',
      '  4. Adopt and enforce a repeat-infringer policy, and say so in your terms.',
      '  5. Diarise renewal — a designation must be kept current (re-confirm every',
      '     three years; update promptly whenever the details change).',
      '',
      'Note: a missing agent is not itself a fine. The exposure is losing the',
      'defence, so ordinary copyright damages become available against you.',
    ].join('\n');

    if (!uploads.length && !ugc.length) {
      return { status: 'pass', summary: 'No user upload or user-generated-content paths found, so §512(c) may not be in play.', evidence: [], fix: '' };
    }
    if (!dmcaRefs.length) {
      return {
        status: 'fail',
        summary: `Users can submit content (${uploads.length} upload path${uploads.length === 1 ? '' : 's'}${ugc.length ? `, ${ugc.length} UGC model reference${ugc.length === 1 ? '' : 's'}` : ''}) but there is no DMCA agent, takedown process or repeat-infringer policy anywhere in the project.`,
        evidence: [...uploads, ...ugc].slice(0, 30),
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'DMCA language exists. Confirm the agent is actually registered in the Copyright Office directory, the published details match, and the registration is current.',
      evidence: [...dmcaRefs.slice(0, 6), ...uploads.slice(0, 6)],
      fix,
    };
  },
},

/* 9 ─────────────────────────────────────────────────────────────────────── */
{
  id: 'coppa-age-gate',
  title: 'COPPA age gate for under-13 users',
  law: '15 U.S.C. §§6501–6506; COPPA Rule, 16 C.F.R. Part 312 (amended rule published 22 Apr 2025; full compliance required by 22 Apr 2026). Civil penalty up to $53,088 per violation (16 C.F.R. §1.98)',
  applies: 'ONLY IF your site/app/service is directed to children under 13, OR you have actual knowledge that you collect personal information from a child under 13. General-audience products are out of scope until one of those is true.',
  run(ctx) {
    const childSignals = dedupe(ctx.find(RX.childDirected, { exts: [...CODE_EXT, '.md', '.mdx', '.json'] }));
    const gate = dedupe(ctx.find(RX.ageGate, { exts: [...CODE_EXT, '.sql', '.prisma', '.md'] }));

    const fix = [
      'COPPA only bites if the service is child-directed or you gain actual knowledge',
      'of an under-13 user. Decide which you are, then:',
      '',
      'General audience, want to stay out of scope:',
      '  • Collect date of birth (not "are you over 13?") in a neutral way, before',
      '    any account or data collection, and do not let the user retry on failure.',
      '  • Block or divert under-13 signups, and store the decision.',
      '  • Say in your terms that the service is not for children under 13.',
      '  • Have a documented route to delete an account once you learn a user is <13.',
      '',
      'Actually child-directed:',
      '  • Get verifiable parental consent BEFORE any collection (16 C.F.R. §312.5 —',
      '    the 2025 amendments added new approved methods, including knowledge-based',
      '    authentication and a text-plus-confirmation method).',
      '  • Separate consent is required before disclosing a child\'s data to third',
      '    parties for advertising.',
      '  • Post a direct notice to parents plus an online notice, keep a written data',
      '    retention policy, retain only as long as needed, and give parents review/',
      '    deletion rights.',
      '  • Turn off behavioural ad tech and third-party analytics on child-directed',
      '    surfaces — this is the most common COPPA enforcement theory.',
      '  • Full compliance with the amended Rule was required by 22 April 2026.',
    ].join('\n');

    if (childSignals.length && !gate.length) {
      return {
        status: 'fail',
        summary: `Child-directed signals found (${childSignals.length} reference${childSignals.length === 1 ? '' : 's'}) with no age collection or parental-consent flow anywhere.`,
        evidence: childSignals.slice(0, 20),
        fix,
      };
    }
    if (childSignals.length) {
      return {
        status: 'review',
        summary: 'Child-directed signals and an age-collection mechanism both exist. Confirm the flow is neutral, unskippable, and that parental consent is verifiable where required.',
        evidence: [...childSignals.slice(0, 8), ...gate.slice(0, 8)],
        fix,
      };
    }
    if (gate.length) {
      return {
        status: 'pass',
        summary: 'No child-directed signals found and the project already collects age/date of birth. Keep the under-13 block and the deletion path documented.',
        evidence: gate.slice(0, 6),
        fix: '',
      };
    }
    return {
      status: 'review',
      summary: 'No child-directed signals found, so COPPA may not apply — but there is also no age collection, so you have no way to notice an under-13 signup. Confirm the service is not directed to children and that you have no actual knowledge of under-13 users.',
      evidence: [],
      fix,
    };
  },
},

/* 10 ────────────────────────────────────────────────────────────────────── */
{
  id: 'can-spam',
  title: 'Commercial email: unsubscribe link and physical postal address',
  law: 'CAN-SPAM Act, 15 U.S.C. §7704; FTC Rule 16 C.F.R. Part 316. Each non-compliant message can draw a civil penalty up to $53,088 (FTC inflation-adjusted figure, in force since 17 Jan 2025 and unchanged for 2026).',
  applies: 'Any email whose primary purpose is commercial. Purely transactional/relationship messages (receipts, password resets) are exempt from the unsubscribe requirement but must still not have deceptive headers.',
  run(ctx) {
    const senders = dedupe(ctx.find(RX.emailSender, { exts: [...CODE_EXT, '.json'] }));
    if (!senders.length) {
      return { status: 'pass', summary: 'No email-sending integration found.', evidence: [], fix: '' };
    }
    const marketing = dedupe(ctx.find(RX.marketingEmail, { exts: [...CODE_EXT, '.md', '.mdx'] }));
    const unsub = dedupe(ctx.find(RX.unsubscribe, { exts: [...CODE_EXT, '.md', '.mdx', '.html', '.txt'] }));
    const addr = dedupe(ctx.find(RX.postalAddress, { exts: [...CODE_EXT, '.md', '.mdx', '.html', '.txt'] }));

    const missing = [];
    if (!unsub.length) missing.push('unsubscribe mechanism');
    if (!addr.length) missing.push('physical postal address');

    const fix = [
      'Every commercial message needs all of these:',
      '  • a clear, working opt-out link that keeps working for at least 30 days',
      '    after you send',
      '  • honour the opt-out within 10 business days, with no fee, no login, and no',
      '    information required beyond the email address',
      '  • your valid physical postal address (a street address, a registered PO box,',
      '    or a registered private mailbox)',
      '  • accurate From/Reply-To and a non-deceptive subject line',
      '  • an ad disclosure where the message is an advertisement',
      '',
      'In your email template footer:',
      '  <p>You received this because you signed up at example.com.',
      '     <a href="{{unsubscribe_url}}">Unsubscribe</a><br>',
      '     Vynema Studio, 123 Example Street, Suite 4, City, ST 12345</p>',
      '',
      'Also add the one-click header for bulk mail:',
      '  List-Unsubscribe: <https://example.com/u/{{token}}>, <mailto:unsub@example.com>',
      '  List-Unsubscribe-Post: List-Unsubscribe=One-Click',
      '',
      'EU/UK recipients additionally need consent (or a narrow soft opt-in) before',
      'marketing email, under ePrivacy/PECR — stricter than CAN-SPAM.',
    ].join('\n');

    if (missing.length) {
      return {
        status: missing.length === 2 && marketing.length ? 'fail' : missing.length === 2 ? 'fail' : 'review',
        summary: `Email sending is wired up${marketing.length ? ' and the project references marketing/newsletter sends' : ''}, but no ${missing.join(' and no ')} appears in any template.${missing.length === 1 ? '' : ' If any message is commercial rather than purely transactional, each send is a separate violation.'}`,
        evidence: [...senders.slice(0, 8), ...marketing.slice(0, 6)],
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'Unsubscribe text and a postal address both appear. Confirm they are in every commercial template, that the link works unauthenticated, and that opt-outs are processed within 10 business days.',
      evidence: [...unsub.slice(0, 5), ...addr.slice(0, 3), ...senders.slice(0, 4)],
      fix,
    };
  },
},

/* 11 ────────────────────────────────────────────────────────────────────── */
{
  id: 'auto-renew-terms',
  title: 'Auto-renewing subscription: disclosure, affirmative consent, easy cancellation',
  law: 'California ARL, Cal. B&P Code §17600 et seq. (as amended by AB 2863, applying to contracts entered, amended or extended on/after 1 Jul 2025). §17603: goods sent without the required affirmative consent are an unconditional gift. Federal ROSCA, 15 U.S.C. §8403, still applies — the FTC\'s "click-to-cancel" Negative Option Rule was vacated in July 2025 and is being re-proposed, so do not rely on it being gone.',
  applies: 'If you charge on a recurring basis, or convert a free trial into a paid plan.',
  run(ctx) {
    const subs = dedupe(ctx.find(RX.subscription, { exts: [...CODE_EXT, '.json', '.md'] }));
    if (!subs.length) {
      return { status: 'pass', summary: 'No recurring-billing or free-trial-conversion code found.', evidence: [], fix: '' };
    }
    const disclosure = dedupe(ctx.find(RX.autoRenewDisclosure, { exts: [...CODE_EXT, '.md', '.mdx'] }));
    const cancel = dedupe(ctx.find(RX.onlineCancel, { exts: [...CODE_EXT, '.md', '.mdx'] }));

    const missing = [];
    if (!disclosure.length) missing.push('auto-renewal disclosure at the point of sale');
    if (!cancel.length) missing.push('self-serve online cancellation');

    const fix = [
      'Put all of this immediately next to the pay button — not in the terms, not',
      'behind a link, and visually set apart from everything else:',
      '  • that the plan renews automatically until cancelled',
      '  • the recurring amount and the billing frequency',
      '  • the length of any free/discounted period and the price it becomes',
      '  • the deadline to cancel before the next charge, and how to cancel',
      '',
      'Then:',
      '  1. Take affirmative consent for the recurring charge SEPARATELY from the',
      '     purchase itself — an unticked checkbox next to those terms. California',
      '     §17603 deems goods sent without it an unconditional gift the consumer',
      '     may keep without paying.',
      '  2. Send an acknowledgement after purchase containing the terms and the',
      '     cancellation method, in a form the customer can keep.',
      '  3. Offer cancellation in the same medium used to subscribe — if they signed',
      '     up online, one online path must cancel, with no call and no retention',
      '     maze. Stripe: billingPortal.sessions.create({ customer }).',
      '  4. Send renewal reminders. AB 2863 requires them, including an annual',
      '     reminder, identifying the product, the amount and frequency, and how to',
      '     cancel. Reminders are mandatory for free-to-paid conversions and for',
      '     terms longer than a year.',
      '  5. Trials that auto-convert: disclose the conversion price and date up front.',
      '',
      'Other states (NY GBL §527-a, Illinois, Oregon, Colorado, Virginia, Washington,',
      'Delaware and more) have their own auto-renewal statutes. Build to the',
      'strictest you are exposed to.',
    ].join('\n');

    if (missing.length) {
      return {
        status: 'fail',
        summary: `Recurring billing found (${subs.length} reference${subs.length === 1 ? '' : 's'}) with no ${missing.join(' and no ')}.`,
        evidence: subs.slice(0, 20),
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'Renewal language and a cancellation path both exist. Confirm the disclosure sits adjacent to the pay button, consent to the recurring charge is separate and unticked, and cancellation needs no human contact.',
      evidence: [...disclosure.slice(0, 6), ...cancel.slice(0, 6)],
      fix,
    };
  },
},

/* 12 ────────────────────────────────────────────────────────────────────── */
{
  id: 'accessibility-basics',
  title: 'Accessibility basics (alt text, labels, language, focus, keyboard)',
  law: 'ADA Titles II/III (US private-sector web claims are brought under Title III; DOJ\'s 2024 Title II rule set WCAG 2.1 AA for state/local government, with deadlines extended in Apr 2026 to 26 Apr 2027 / 26 Apr 2028). European Accessibility Act applies to consumer e-commerce in the EU since 28 Jun 2025 (EN 301 549 → WCAG 2.1 AA; micro-enterprises providing services are exempt). Current W3C recommendation: WCAG 2.2.',
  applies: 'Any public-facing web product. US private-sector lawsuits do not wait for a regulation to exist.',
  run(ctx) {
    const problems = [];
    const markup = ctx.source.filter((f) => MARKUP_EXT.includes(f.ext));

    for (const f of markup) {
      const t = ctx.text(f);
      if (!t) continue;
      const lines = t.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const add = (label) => problems.push({ rel: f.rel, line: i + 1, snippet: l.trim().slice(0, 130), label });

        // <img> with no alt attribute at all
        for (const m of l.matchAll(/<img\b[^>]*>/gi)) {
          if (!/\balt\s*=/.test(m[0])) add('<img> with no alt attribute');
        }
        // form control with neither aria-label nor id (so no <label for>)
        for (const m of l.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
          const tag = m[0];
          if (/type\s*=\s*['"{]?(hidden|submit|button|image|reset)/i.test(tag)) continue;
          if (/aria-label|aria-labelledby|\bid\s*=|\btitle\s*=/.test(tag)) continue;
          add(`<${m[1].toLowerCase()}> with no label, id, or aria-label`);
        }
        // positive tabindex breaks natural focus order
        if (/tabindex\s*=\s*['"{]?[1-9]/i.test(l)) add('positive tabindex overrides focus order');
        // click handler on a non-interactive element
        for (const m of l.matchAll(/<(div|span|li|td|p|img)\b[^>]*\bon[Cc]lick[^>]*>/g)) {
          if (!/\brole\s*=|\btabIndex\s*=|\btabindex\s*=/.test(m[0])) {
            add(`onClick on <${m[1]}> with no role and no tabIndex — unreachable by keyboard`);
          }
        }
        // focus ring removed with no replacement in the same file
        if (/outline\s*:\s*(none|0)\b/i.test(l) && !/focus-visible/.test(t)) {
          add('focus outline removed with no :focus-visible replacement');
        }
      }

      // <html> without lang
      const htmlTag = /<html\b[^>]*>/i.exec(t);
      if (htmlTag && !/\blang\s*=/.test(htmlTag[0])) {
        const line = t.slice(0, htmlTag.index).split('\n').length;
        problems.push({ rel: f.rel, line, snippet: htmlTag[0].slice(0, 130), label: '<html> with no lang attribute' });
      }
    }

    const fix = [
      'Fix the findings above, then do the two things a scanner cannot:',
      '',
      '  • KEYBOARD: unplug the mouse. Tab through every page. You must be able to',
      '    reach and operate every control, always see where focus is, escape every',
      '    modal, and never get trapped.',
      '  • CONTRAST: body text needs ≥ 4.5:1 against its background, large text and',
      '    UI borders ≥ 3:1. Check your real tokens, including hover, disabled and',
      '    placeholder states, and dark mode. Low-contrast grey-on-charcoal is the',
      '    single most common vibe-coded failure.',
      '',
      'Patterns for the findings:',
      '  <img src="/chart.png" alt="Revenue grew from $2k to $9k over six months">',
      '  <img src="/divider.svg" alt="">            {/* decorative: empty alt */}',
      '  <label htmlFor="email">Email</label><input id="email" type="email">',
      '  <button aria-label="Close dialog"><XIcon aria-hidden="true" /></button>',
      '  <html lang="en">',
      '  :focus-visible { outline: 2px solid #C5FF4A; outline-offset: 2px; }',
      '',
      'Then run a real audit — static text analysis catches maybe a third of issues:',
      '  npx @axe-core/cli http://localhost:3000',
      '  npx lighthouse http://localhost:3000 --only-categories=accessibility',
      'Target WCAG 2.2 Level AA.',
    ].join('\n');

    if (problems.length) {
      const kinds = [...new Set(problems.map((p) => p.label.replace(/<[a-z]+>/, '<element>')))];
      return {
        status: 'fail',
        summary: `${problems.length} static accessibility defect${problems.length === 1 ? '' : 's'} across ${new Set(problems.map((p) => p.rel)).size} file${new Set(problems.map((p) => p.rel)).size === 1 ? '' : 's'} (${kinds.slice(0, 3).join('; ')}${kinds.length > 3 ? '; …' : ''}).`,
        evidence: problems.map((p) => ({ ...p, snippet: `${p.label} — ${p.snippet}` })),
        fix,
      };
    }
    return {
      status: 'review',
      summary: `Static markup checks are clean across ${markup.length} file${markup.length === 1 ? '' : 's'}. Colour contrast, focus order, keyboard traps and screen-reader semantics still need a real browser pass — they cannot be verified from source.`,
      evidence: [],
      fix,
    };
  },
},

/* 13 ────────────────────────────────────────────────────────────────────── */
{
  id: 'ai-disclosure',
  title: 'AI chatbot / AI-generated content disclosure',
  law: 'EU AI Act Art. 50 (Reg. (EU) 2024/1689) — transparency duties apply from 2 Aug 2026 and were NOT postponed by the Digital Omnibus; the Art. 50(2) machine-readable marking duty had a grace period to 2 Dec 2026 for systems already on the market. California B.O.T. Act, B&P Code §17941 (bot disclosure in commercial/electoral contexts; UCL penalties up to $2,500 per violation).',
  applies: 'If a user can interact with an AI system directly, or you publish AI-generated or AI-manipulated content.',
  run(ctx) {
    const llm = dedupe(ctx.find(RX.llmUse, { exts: [...CODE_EXT, '.json'] }));
    if (!llm.length) {
      return { status: 'pass', summary: 'No LLM or generative-AI integration found.', evidence: [], fix: '' };
    }
    const chat = dedupe(ctx.find(RX.chatUi, { exts: CODE_EXT }));
    const disclosure = dedupe(ctx.find(RX.aiDisclosure, { exts: [...CODE_EXT, '.md', '.mdx'] }));

    const fix = [
      'Make the AI visible where the interaction happens, not only in the terms:',
      '',
      '  • Chat/voice/agent surfaces: state that the user is interacting with an AI',
      '    system, at the start and persistently in the UI. EU AI Act Art. 50(1).',
      '    Example: a header reading "AI assistant — answers may be inaccurate".',
      '  • Synthetic output (text, image, audio, video): label it as AI-generated or',
      '    AI-manipulated where it is published, and mark it machine-readably',
      '    (C2PA/Content Credentials, or metadata + a visible label). Art. 50(2)/(4).',
      '  • Deepfakes and AI-manipulated likenesses: label clearly and prominently.',
      '  • Emotion recognition or biometric categorisation: inform the people exposed.',
      '  • Never let the bot claim to be human. California §17941 makes concealing a',
      '    bot\'s artificial identity unlawful when used to incentivise a transaction',
      '    or influence a vote; disclosing that it is a bot is the safe harbour.',
      '  • Colorado, Utah and other states have their own AI/chatbot disclosure rules;',
      '    New York and others regulate AI companions. Check your markets.',
      '',
      'Also disclose AI use in your privacy policy (what is sent to which model',
      'provider, whether it trains on your users\' data, retention) and check your',
      'model provider\'s usage policies and attribution terms.',
    ].join('\n');

    if (chat.length && !disclosure.length) {
      return {
        status: 'fail',
        summary: `A user-facing AI chat surface exists (${chat.length} reference${chat.length === 1 ? '' : 's'}) with no disclosure text anywhere that the user is talking to an AI.`,
        evidence: [...chat, ...llm].slice(0, 30),
        fix,
      };
    }
    if (!disclosure.length) {
      return {
        status: 'review',
        summary: 'Generative AI is used but no disclosure language exists. If any output is shown to users, it may need an AI-generated label and machine-readable marking.',
        evidence: llm.slice(0, 20),
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'Disclosure language exists. Confirm it is visible in the AI surface itself (not only the terms), and that published synthetic content is also marked machine-readably.',
      evidence: [...disclosure.slice(0, 6), ...llm.slice(0, 6)],
      fix,
    };
  },
},

/* 14 ────────────────────────────────────────────────────────────────────── */
{
  id: 'refund-policy',
  title: 'Refund / cancellation policy published',
  law: 'No single US federal mandate, but: FTC Act §5 (unfair or deceptive practices) if you charge without disclosing your terms; EU Consumer Rights Directive 2011/83/EU gives a 14-day withdrawal right for distance sales, with a specific express-waiver flow for digital content delivered immediately; card-network rules require a visible refund policy.',
  applies: 'If you take money. EU and UK buyers also have statutory withdrawal rights regardless of your policy.',
  run(ctx) {
    const payments = dedupe(ctx.find(RX.payments, { exts: [...CODE_EXT, '.json'] }));
    if (!payments.length) {
      return { status: 'pass', summary: 'No payment integration found.', evidence: [], fix: '' };
    }
    const refund = dedupe(ctx.find(RX.refundPolicy, { exts: [...CODE_EXT, '.md', '.mdx'] }));

    const fix = [
      'Publish a refund policy, link it from checkout, and restate it in the receipt.',
      'Say plainly: what is refundable, the window, how to request, how long it takes,',
      'and what happens to access on refund. "No refunds" is a policy too — but it',
      'must be disclosed before payment, and it does not override EU/UK statutory',
      'rights or chargeback rules.',
      '',
      'Selling to EU/UK consumers:',
      '  • 14-day right of withdrawal applies to distance sales by default.',
      '  • For digital content delivered immediately you must obtain the consumer\'s',
      '    express prior consent to begin AND their acknowledgement that they thereby',
      '    lose the withdrawal right — otherwise the right survives.',
      '    e.g. an unticked checkbox: "Start my access now. I understand I lose my',
      '    14-day right to withdraw once access begins."',
    ].join('\n');

    if (!refund.length) {
      return {
        status: 'review',
        summary: 'Payments are wired up but no refund or cancellation policy was found. Taking money without disclosed refund terms invites chargebacks and §5 exposure, and EU/UK buyers have statutory withdrawal rights regardless.',
        evidence: payments.slice(0, 12),
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'Refund language exists. Confirm it is visible before payment, matches what you actually do, and handles the EU/UK withdrawal waiver for instant digital delivery.',
      evidence: [...refund.slice(0, 6), ...payments.slice(0, 4)],
      fix,
    };
  },
},

/* 15 ────────────────────────────────────────────────────────────────────── */
{
  id: 'sales-tax-vat',
  title: 'Sales tax / VAT on digital goods (advisory note)',
  law: 'EU: place-of-supply rules for B2C digital services — VAT is due in the customer\'s member state, collected via the One Stop Shop. The €10,000 cross-border threshold is available to EU-established sellers only; a non-EU seller registers from the first B2C sale. US: economic nexus after South Dakota v. Wayfair (2018) — thresholds vary by state and many states tax SaaS and digital products.',
  applies: 'If you sell anything to consumers across a border. This check is informational — it never fails your build.',
  noteOnly: true,
  run(ctx) {
    const payments = dedupe(ctx.find(RX.payments, { exts: [...CODE_EXT, '.json'] }));
    if (!payments.length) {
      return { status: 'pass', summary: 'No payment integration found, so nothing to collect tax on yet.', evidence: [], fix: '' };
    }
    const tax = dedupe(ctx.find(RX.taxHandling, { exts: [...CODE_EXT, '.json', '.md'] }));

    const fix = [
      'This is a tax question, not a code question — but the code decides whether you',
      'can answer it. Two things to get right now, while the volume is small:',
      '',
      '  1. Turn on automatic tax in your payment provider and store the evidence of',
      '     the customer\'s location with every transaction (Stripe:',
      '     automatic_tax: { enabled: true }, plus tax_id_collection for B2B).',
      '  2. Decide whether you are the seller of record. A merchant-of-record',
      '     platform (Paddle, Lemon Squeezy, Polar, Gumroad) takes on the VAT/sales',
      '     tax registration and remittance; raw Stripe does not.',
      '',
      'Then confirm with an accountant: EU VAT registration and OSS filing, UK VAT,',
      'and the US states where your sales cross the economic-nexus threshold.',
    ].join('\n');

    return {
      status: 'review',
      summary: `Payments are wired up${tax.length ? ' and some tax handling is present' : ' with no visible tax handling'}. Cross-border digital sales usually create VAT/sales-tax obligations from the first sale — worth answering before launch, not after.`,
      evidence: [...tax.slice(0, 5), ...payments.slice(0, 5)],
      fix,
    };
  },
},

/* 16 ────────────────────────────────────────────────────────────────────── */
{
  id: 'third-party-licences',
  title: 'Third-party licences: code, fonts, images, AI models',
  law: 'Copyright plus the terms of each licence. Copyleft terms (GPL/AGPL) can reach your own source; font EULAs often restrict webfont embedding; stock-image licences restrict redistribution; model providers set output and attribution terms.',
  applies: 'Always — you almost certainly shipped someone else\'s work.',
  run(ctx) {
    const problems = [];

    const hasLicence = ctx.files.some((f) => /^(LICENSE|LICENCE|COPYING)(\.|$)/i.test(path.basename(f.rel)));
    if (!hasLicence) {
      problems.push({ rel: 'LICENSE', line: 1, snippet: 'no LICENSE / LICENCE / COPYING file at the project root', label: 'Your own licence is undeclared' });
    }

    // Self-hosted fonts with no licence file beside them.
    const fonts = ctx.stats.fonts.filter((p) => !/node_modules/.test(p));
    if (fonts.length) {
      const fontDirs = [...new Set(fonts.map((p) => path.dirname(p)))];
      for (const d of fontDirs) {
        const hasLic = ctx.files.some((f) =>
          f.rel.startsWith(d === '.' ? '' : d) && /(ofl|licen[cs]e|copying)/i.test(path.basename(f.rel)));
        if (!hasLic) {
          problems.push({
            rel: d === '.' ? fonts[0] : d, line: 1,
            snippet: `${fonts.filter((p) => path.dirname(p) === d).length} font file(s), no licence file in this directory`,
            label: 'Self-hosted font with no licence file',
          });
        }
      }
    }

    // Copyleft dependencies worth a human look.
    const copyleft = ctx.deps.filter((d) => /^(ghostscript|highcharts|font-?awesome-?pro|sharp-?libvips)/i.test(d));
    copyleft.forEach((d) => problems.push({ rel: 'package.json', line: 1, snippet: d, label: 'Dependency with restrictive or commercial terms' }));

    const llm = ctx.has(RX.llmUse, { exts: [...CODE_EXT, '.json'] });

    const fix = [
      'Make one file — CREDITS.md or THIRD-PARTY-NOTICES.md — and keep it honest:',
      '',
      '  1. Code: npx license-checker-rspack --summary   (or `npm ls --all`)',
      '     Look for GPL / AGPL / SSPL / CC-BY-NC / "commercial licence required".',
      '     AGPL in a hosted web app is the one that surprises people.',
      '  2. Fonts: a desktop font licence rarely permits @font-face embedding. Keep',
      '     the licence file next to the files you ship (Google Fonts are OFL or',
      '     Apache-2.0 — ship the licence text with the .woff2 files).',
      '  3. Images, icons, audio: keep the source URL and licence for each. "Found it',
      '     on Google Images" is not a licence. Check whether attribution or a',
      '     no-redistribution term applies to icon sets and stock photos.',
      '  4. Templates and UI kits: many free tiers forbid resale or require a link.',
      hasLicence ? '' : '  5. Add your own LICENSE file — without one, nobody may legally reuse your code.',
      llm ? '  6. AI models: check your provider\'s usage policies and output terms, and whether generated assets can be used commercially. Record which model produced any shipped asset.' : '',
    ].filter(Boolean).join('\n');

    if (problems.length) {
      return {
        status: 'review',
        summary: `${problems.length} licence gap${problems.length === 1 ? '' : 's'} to close. Licence problems are quiet until they are expensive.`,
        evidence: problems.map((p) => ({ ...p, snippet: `${p.label} — ${p.snippet}` })),
        fix,
      };
    }
    return {
      status: 'review',
      summary: 'No obvious licence gaps in the files on disk. A full audit still needs the dependency tree and your asset provenance, which a source scan cannot see.',
      evidence: [],
      fix,
    };
  },
},

];

/* ──────────────────────────────── runner ───────────────────────────────── */

function runChecks(ctx, opts) {
  const results = [];
  for (const check of CHECKS) {
    if (opts.only && !opts.only.includes(check.id)) continue;
    if (opts.skip && opts.skip.includes(check.id)) continue;
    let r;
    try {
      r = check.run(ctx);
    } catch (err) {
      r = {
        status: 'review',
        summary: `This check could not complete: ${err && err.message ? err.message : String(err)}. Review it by hand.`,
        evidence: [], fix: '',
      };
    }
    results.push({
      id: check.id,
      title: check.title,
      law: check.law,
      applies: check.applies,
      noteOnly: !!check.noteOnly,
      status: r.status,
      summary: scrubSecrets(r.summary),
      evidence: dedupe(r.evidence || []).map((e) => ({
        rel: e.rel, line: e.line, snippet: scrubSecrets(e.snippet || ''),
      })),
      fix: r.fix || '',
    });
  }
  results.sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank || a.id.localeCompare(b.id));
  return results;
}

function tally(results) {
  const t = { fail: 0, review: 0, pass: 0 };
  for (const r of results) t[r.status]++;
  return t;
}

/* ───────────────────────────── terminal report ─────────────────────────── */

function termWidth() {
  const w = process.stdout.columns || 80;
  return Math.max(62, Math.min(w - 2, 96));
}

function truncate(s, width) {
  if (visibleLen(s) <= width) return s;
  return stripAnsi(s).slice(0, Math.max(1, width - 1)).replace(/[\s,(]+$/, '') + '…';
}

/**
 * Fix text is authored, not reflowed. Prose reflows with a hanging indent;
 * anything that looks like code or a shell command is printed verbatim so a
 * snippet is always copy-pasteable.
 */
const LOOKS_LIKE_CODE = /[<>{}();=]|^\s*(npx|npm|npm i|pnpm|yarn|git|node|curl|alter|create|match|allow|if |gtag|dataLayer|List-Unsubscribe|--|\/\/|#)/i;

function renderFix(fix, width, indent) {
  const raw = String(fix).split('\n');
  const indentOf = (l) => (l.match(/^\s*/) || [''])[0].length;
  const out = [];

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (!line.trim()) { out.push(''); continue; }

    // Code and shell lines are never reflowed — a snippet must stay pasteable.
    if (LOOKS_LIKE_CODE.test(line)) { out.push(indent + truncate(line, width)); continue; }

    // Gather the continuation lines that belong to this paragraph, so a
    // bullet wrapped across source lines re-wraps as one unit.
    const lead = indentOf(line);
    const isBullet = /^[•\-*]|^\d+[.)]/.test(line.trim());
    const parts = [line.trim()];
    let hang = lead + (isBullet ? 2 : 0);
    while (i + 1 < raw.length) {
      const nxt = raw[i + 1];
      if (!nxt.trim() || LOOKS_LIKE_CODE.test(nxt)) break;
      const nLead = indentOf(nxt);
      const nBullet = /^[•\-*]|^\d+[.)]/.test(nxt.trim());
      const continues = nLead > lead || (nLead === lead && !nBullet && !isBullet);
      if (!continues) break;
      if (nLead > lead) hang = nLead;
      parts.push(nxt.trim());
      i++;
    }

    const body = wrap(parts.join(' '), Math.max(24, width - hang), '');
    body.forEach((l, k) => out.push(indent + ' '.repeat(k === 0 ? lead : hang) + l));
  }
  return out;
}

function wrap(text, width, indent = '') {
  const out = [];
  for (const para of String(text).split('\n')) {
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!line) { line = word; continue; }
      if (visibleLen(line) + 1 + visibleLen(word) <= width) line += ' ' + word;
      else { out.push(line); line = word; }
    }
    if (line) out.push(line);
  }
  return out.map((l) => indent + l);
}

function renderTerminal(results, meta, opts) {
  const W = termWidth();
  const L = [];
  const t = tally(results);
  const rule = (ch = '─') => c.grey(ch.repeat(W));

  // ── header ──
  L.push('');
  L.push('  ' + c.limeBg(' VIBE CHECK ') + '  ' + c.bold(c.white('pre-launch legal & compliance scan')));
  L.push('  ' + c.grey(`v${VERSION}  ·  Vynema Studio  ·  educational tool, not legal advice`));
  L.push('');
  L.push('  ' + c.grey(`${meta.target}  ·  ${meta.fileCount} files scanned  ·  ${meta.ms} ms`));
  L.push('');
  L.push('  ' + rule('━'));
  L.push('');

  // ── at a glance ──
  const idW = Math.max(...results.map((r) => r.id.length)) + 2;
  for (const r of results) {
    const s = STATUS[r.status];
    L.push('  ' + s.chip() + ' ' + c.grey(pad(r.id, idW)) + ' ' + c.white(truncate(r.title, W - idW - 13)));
  }
  L.push('');
  L.push('  ' + rule('━'));

  // ── detail blocks ──
  const detailed = results.filter((r) => (opts.quiet ? r.status !== 'pass' : true));
  for (const r of detailed) {
    const s = STATUS[r.status];
    L.push('');
    if (r.status === 'pass') {
      L.push('  ' + s.paint(s.icon) + ' ' + c.grey(pad(s.label, 14)) + c.white(r.title));
      for (const line of wrap(c.grey(r.summary), W - 6, '      ')) L.push(line);
      continue;
    }
    L.push('  ' + s.chip() + '  ' + c.bold(c.white(r.title)) + '  ' + c.grey(`[${r.id}]`));
    L.push('');
    for (const line of wrap(r.law, W - 8, '     ')) L.push(c.grey(line));
    L.push('');
    for (const line of wrap(r.summary, W - 8, '     ')) L.push(s.paint(line));

    if (r.evidence.length) {
      L.push('');
      L.push('     ' + c.grey('EVIDENCE'));
      const shown = r.evidence.slice(0, opts.maxEvidence);
      const locW = Math.min(46, Math.max(...shown.map((e) => `${e.rel}:${e.line}`.length)) + 2);
      for (const e of shown) {
        const loc = `${e.rel}:${e.line}`;
        L.push('       ' + c.white(pad(loc.length > 46 ? '…' + loc.slice(-45) : loc, locW)) +
          c.grey(String(e.snippet || '').slice(0, Math.max(12, W - locW - 10))));
      }
      if (r.evidence.length > shown.length) {
        L.push('       ' + c.grey(`… and ${r.evidence.length - shown.length} more (use --max-evidence ${r.evidence.length} or --json)`));
      }
    }

    if (r.applies) {
      L.push('');
      L.push('     ' + c.grey('APPLIES'));
      for (const line of wrap(r.applies, W - 10, '       ')) L.push(c.grey(line));
    }

    if (r.fix) {
      L.push('');
      L.push('     ' + c.lime('FIX'));
      for (const line of renderFix(r.fix, W - 7, '     ')) L.push(line ? c.white(line) : '');
    }
    L.push('');
    L.push('  ' + rule());
  }

  // ── summary ──
  const total = results.length;
  const barW = Math.min(44, W - 20);
  const seg = (n) => Math.round((n / Math.max(1, total)) * barW);
  let bar = c.red('█'.repeat(seg(t.fail))) + c.amber('█'.repeat(seg(t.review))) + c.lime('█'.repeat(seg(t.pass)));
  const grown = seg(t.fail) + seg(t.review) + seg(t.pass);
  if (grown < barW) bar += c.grey('░'.repeat(barW - grown));

  L.push('');
  L.push('  ' + c.bold(c.white('SUMMARY')));
  L.push('');
  L.push('  ' + bar);
  L.push('  ' +
    (t.fail ? c.red(`${t.fail} FAIL`) : c.grey('0 FAIL')) + c.grey('   ·   ') +
    (t.review ? c.amber(`${t.review} NEEDS REVIEW`) : c.grey('0 NEEDS REVIEW')) + c.grey('   ·   ') +
    (t.pass ? c.lime(`${t.pass} PASS`) : c.grey('0 PASS')));
  L.push('');

  if (t.fail) {
    L.push('  ' + c.red(c.bold(`Not ready to ship. ${t.fail} check${t.fail === 1 ? '' : 's'} found a concrete gap with evidence above.`)));
    L.push('  ' + c.grey('Start at the top — the list is ordered worst-first.'));
  } else if (t.review) {
    L.push('  ' + c.lime(c.bold('No blocking failures.')) + c.white(` ${t.review} item${t.review === 1 ? '' : 's'} need a human decision.`));
  } else {
    L.push('  ' + c.lime(c.bold('Clean run.')) + c.white(' Every mechanical check passed.'));
  }

  L.push('');
  L.push('  ' + rule('━'));
  L.push('');
  for (const line of wrap(
    'Educational, not legal advice. vibe-check is a static scanner: it reads your files and reports patterns. It cannot read your contracts, your data flows, your markets or your risk appetite, and a clean run is not a compliance certificate. Laws change and vary by jurisdiction — for anything consequential, talk to a qualified lawyer in the places you operate.',
    W - 4, '  ')) L.push(c.grey(line));
  L.push('');
  L.push('  ' + c.grey('Every citation is sourced in SOURCES.md  ·  github.com/vynemastudio/vibe-check'));
  L.push('  ' + c.grey('Made by Vynema Studio  ·  @vynemastudio on Instagram'));
  L.push('');

  return L.join('\n');
}

/* ───────────────────────────── markdown report ─────────────────────────── */

function renderMarkdown(results, meta) {
  const t = tally(results);
  const badge = { fail: '🔴 **FAIL**', review: '🟡 **NEEDS REVIEW**', pass: '🟢 **PASS**' };
  const L = [];

  L.push('# vibe-check report');
  L.push('');
  L.push(`**Target:** \`${meta.target}\` · **Files scanned:** ${meta.fileCount} · **Scanner:** vibe-check v${VERSION} · **Run:** ${meta.when}`);
  L.push('');
  L.push(`**${t.fail} FAIL · ${t.review} NEEDS REVIEW · ${t.pass} PASS**`);
  L.push('');
  L.push('> Educational, not legal advice. A static scanner cannot read your contracts, data flows or markets, and a clean run is not a compliance certificate. For anything consequential, talk to a qualified lawyer in the places you operate.');
  L.push('');
  L.push('## At a glance');
  L.push('');
  L.push('| Status | Check | What it is about |');
  L.push('| :-- | :-- | :-- |');
  for (const r of results) {
    L.push(`| ${badge[r.status]} | \`${r.id}\` | ${r.title} |`);
  }
  L.push('');
  L.push('## Findings');

  for (const r of results) {
    L.push('');
    L.push(`### ${badge[r.status]} — ${r.title}`);
    L.push('');
    L.push(`**Check id:** \`${r.id}\``);
    L.push('');
    L.push(`**Legal basis:** ${r.law}`);
    L.push('');
    L.push(`**When it applies:** ${r.applies}`);
    L.push('');
    L.push(r.summary);
    if (r.evidence.length) {
      L.push('');
      L.push('**Evidence**');
      L.push('');
      for (const e of r.evidence.slice(0, 20)) {
        L.push(`- \`${e.rel}:${e.line}\` — ${String(e.snippet || '').replace(/\|/g, '\\|').slice(0, 160)}`);
      }
      if (r.evidence.length > 20) L.push(`- …and ${r.evidence.length - 20} more`);
    }
    if (r.fix) {
      L.push('');
      L.push('**Fix**');
      L.push('');
      L.push('```text');
      L.push(r.fix);
      L.push('```');
    }
  }

  L.push('');
  L.push('---');
  L.push('');
  L.push('Generated by [vibe-check](https://github.com/vynemastudio/vibe-check) — a free pre-launch compliance scanner by Vynema Studio. Every citation is sourced in [SOURCES.md](https://github.com/vynemastudio/vibe-check/blob/main/SOURCES.md).');
  L.push('');
  return L.join('\n');
}

/* ───────────────────────────────── main ────────────────────────────────── */

function main(argv) {
  const opts = parseArgs(argv);

  if (opts.list) {
    for (const ch of CHECKS) process.stdout.write(`${ch.id}\t${ch.title}\n`);
    return 0;
  }

  const root = path.resolve(opts.root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    process.stderr.write(`vibe-check: not a directory: ${opts.root}\n`);
    return 2;
  }

  const t0 = Date.now();
  const walked = walk(root);
  const ctx = makeContext(root, walked);
  const results = runChecks(ctx, opts);
  const ms = Date.now() - t0;

  const rel = path.relative(process.cwd(), root) || '.';
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const tilde = home && root.startsWith(home) ? '~' + root.slice(home.length) : root;
  const meta = {
    target: rel.startsWith('..') ? tilde : rel,
    absolute: root,
    fileCount: walked.files.length,
    ms,
    when: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    version: VERSION,
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      tool: 'vibe-check', version: VERSION, meta, summary: tally(results),
      disclaimer: 'Educational, not legal advice. Static analysis only; a clean run is not a compliance certificate.',
      results: results.map((r) => ({
        ...r,
        evidence: r.evidence.map((e) => ({ file: e.rel, line: e.line, snippet: e.snippet })),
      })),
    }, null, 2) + '\n');
  } else if (opts.md) {
    process.stdout.write(renderMarkdown(results, meta));
  } else {
    process.stdout.write(renderTerminal(results, meta, opts) + '\n');
  }

  const t = tally(results);
  if (opts.exitZero) return 0;
  return t.fail > 0 ? 1 : 0;
}

export { CHECKS, walk, makeContext, runChecks, renderMarkdown, renderTerminal, tally, main, redact, scrubSecrets };

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
