#!/usr/bin/env node
// Vibe Check scanner: fast static checks for common legal/compliance gaps in web apps.
// Zero dependencies. Node 18+.  Usage: node scan.mjs [dir] [--json] [--md] [--no-color]
// Educational check, not legal advice. https://github.com/vynemastudio/vibe-check
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const VERSION = '1.0.0';
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
if (flag('--help') || flag('-h')) {
  console.log(`vibe-check ${VERSION}\nusage: node scan.mjs [dir] [--json] [--md] [--no-color]\nExit code: 1 if any check FAILs, else 0.`);
  process.exit(0);
}
const root = path.resolve(args.find((a) => !a.startsWith('-')) || '.');
const color = !flag('--no-color') && !flag('--json') && !flag('--md') && process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const red = c('1;38;5;203'), lime = c('1;38;5;155'), amber = c('1;38;5;221'), dim = c('2'), bold = c('1'), cyan = c('38;5;117');
const bgRed = c('1;97;48;5;160'), bgLime = c('1;30;48;5;155'), bgAmber = c('1;30;48;5;221');

// ---------- collect files ----------
const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.output', '.svelte-kit', '.vercel', 'coverage', 'vendor', '.turbo', '.cache']);
const EXT = /\.(html?|jsx?|tsx?|mjs|cjs|vue|svelte|astro|css|scss|json|rules|sql|py|rb|php|go|ejs|hbs|liquid|md|toml|ya?ml)$/i;
const files = new Map();
(function walk(dir) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); continue; }
    if (!(EXT.test(e.name) || e.name.startsWith('.env'))) continue;
    if (/\.min\.(js|css)$|lock\.json$|\.lock$/.test(e.name)) continue;
    try { const st = fs.statSync(p); if (st.size > 1_500_000) continue; } catch { continue; }
    files.set(path.relative(root, p), fs.readFileSync(p, 'utf8').split(/\r?\n/));
  }
})(root);

function grep(rx, { only } = {}) {
  const out = [];
  for (const [f, lines] of files) {
    if (only && !only.test(f)) continue;
    lines.forEach((l, i) => { if (rx.test(l)) out.push({ file: f, line: i + 1, text: l.trim().slice(0, 140) }); });
  }
  return out;
}
const has = (rx, o) => grep(rx, o).length > 0;
const CODE = /\.(html?|jsx?|tsx?|mjs|cjs|vue|svelte|astro|ejs|hbs|liquid)$/i;
const CLIENT = /\.(html?|jsx?|tsx?|mjs|cjs|vue|svelte|astro|css|scss)$/i;

let gitTracked = null;
try { gitTracked = execSync('git ls-files', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n'); } catch {}

const results = [];
const add = (id, title, status, evidence, risk, fix) => results.push({ id, title, status, evidence: evidence.slice(0, 4), risk, fix });

// VC01 Google Fonts
{
  const h = grep(/fonts\.(googleapis|gstatic)\.com/i, { only: CLIENT }).sort((a, b) => /preconnect/.test(a.text) - /preconnect/.test(b.text));
  add('VC01', "Google Fonts loaded from Google's servers", h.length ? 'FAIL' : 'PASS', h,
    'If you have EU visitors: each page view sends their IP to Google. A Munich court (LG München I, 2022) awarded €100 damages to one visitor under GDPR.',
    'Self-host the .woff2 files (@fontsource/*, next/font/google) and remove the googleapis <link>/@import and preconnect.');
}

// VC02 Session replay before consent
{
  const REPLAY = /rrweb|hotjar|fullstory|logrocket|clarity\.ms|mouseflow|smartlook|openreplay|inspectlet|luckyorange/i;
  const start = grep(/\b(rrweb\.)?record\(\s*\{|hj\(|FS\.init|LogRocket\.init|clarity\(|_hjSettings|smartlook\(|posthog\.init/i, { only: CODE });
  const replayFiles = new Set(grep(REPLAY, { only: CODE }).map((r) => r.file));
  const inits = start.filter((s) => replayFiles.has(s.file) || REPLAY.test(s.text) || /record\(/.test(s.text));
  const gated = (s) => { const L = files.get(s.file); for (let i = Math.max(0, s.line - 8); i < s.line; i++) if (/consent|onConsent|hasConsent|cookieyes|Cookiebot|OneTrust|klaro/i.test(L[i])) return true; return false; };
  const masked = has(/maskAllInputs\s*:\s*true|maskInputOptions|data-hj-suppress|maskAllText/i);
  const ungated = inits.filter((s) => !gated(s));
  let status = 'PASS', ev = [];
  if (ungated.length) { status = 'FAIL'; ev = ungated; }
  else if (inits.length && !masked) { status = 'FAIL'; ev = inits; }
  else if (!inits.length && replayFiles.size) { status = 'NEEDS REVIEW'; ev = grep(REPLAY, { only: CODE }); }
  add('VC02', 'Session replay starts before consent', status, ev,
    'If you have California visitors: plaintiffs sue under CIPA (Cal. Penal Code §637.2: $5,000 per violation); courts are split. In the EU/UK, non-essential trackers need prior opt-in.',
    'Start the recorder only after explicit opt-in (Accept/Reject equally prominent) and mask all inputs (maskAllInputs: true).');
}

// VC03 Auto-renew terms at checkout
{
  const sub = grep(/subscription|renews?|per month|\/mo\b|\/month|recurring|free trial|interval\s*:/i);
  const btn = grep(/<button[^>]*>[^<]*(checkout|subscribe|pay|start|upgrade|buy|trial)|<button[^>]*(checkout|subscribe|pay|upgrade)/i, { only: CODE });
  const disc = grep(/renews?\s+automatically|auto-?renews?|until you cancel/i, { only: CODE });
  const hidden = disc.filter((d) => /font-size:\s*([0-9]|1[01])px|color:\s*#(f|e|d)[0-9a-f]{2}([0-9a-f]{3})?\b|display:\s*none|opacity:\s*0?\.[0-4]|class="[^"]*(fine|tiny|sr-only|muted)/i.test(d.text));
  const consent = has(/type=["']checkbox["'][^>]*(renew|consent|agree)|id=["']renew-consent/i);
  const cancel = has(/cancel (anytime|online)|billing[- ]portal|\/cancel|cancelSubscription|customer[_-]?portal|billingPortal/i);
  let status = 'PASS', ev = [];
  if (sub.length && btn.length) {
    if (hidden.length) { status = 'FAIL'; ev = hidden.concat(btn); }
    else if (!disc.length || !consent || !cancel) { status = 'FAIL'; ev = btn.concat(sub.filter((s) => CODE.test(s.file))); }
  } else if (sub.length && has(/stripe|paddle|lemonsqueezy|mode:\s*['"]subscription/i)) { status = 'NEEDS REVIEW'; ev = sub; }
  add('VC03', 'Auto-renew terms hidden at checkout', status, ev,
    'If you sell subscriptions to California consumers: renewals charged without clear terms and affirmative consent can be treated as an unconditional gift (B&P §17603); online sign-ups must be cancellable online since 1 Jul 2025.',
    'Show price, frequency, "renews until you cancel" and the cancel path right above the button; add an unticked consent checkbox and a one-click online cancel (e.g. Stripe Customer Portal).');
}

// VC05 CAN-SPAM
{
  const mail = grep(/sendgrid|resend|postmark|mailgun|nodemailer|@aws-sdk\/client-ses|mailchimp|loops\.so|sendEmail\(|sendMail\(/i, { only: /\.(jsx?|tsx?|mjs|cjs|py|rb|php|go|json)$/ });
  const unsub = has(/unsubscribe|List-Unsubscribe/i);
  const status = !mail.length ? 'PASS' : unsub ? 'NEEDS REVIEW' : 'FAIL';
  add('VC05', 'Marketing email without unsubscribe/postal address', status, mail,
    'If you send commercial email: CAN-SPAM allows FTC civil penalties up to $53,088 per violating email.',
    'Add an unsubscribe link plus List-Unsubscribe headers and a physical postal address (PO box OK) to marketing emails.');
}

// VC06 DMCA
{
  const up = grep(/type=["']file["']|multer|formidable|busboy|presigned|putObject|storage\.from\(|uploadthing|cloudinary|createUploadUrl/i, { only: CODE });
  const dmca = has(/dmca|designated agent|copyright agent/i);
  add('VC06', 'User uploads without a DMCA designated agent', !up.length ? 'PASS' : dmca ? 'PASS' : 'NEEDS REVIEW', dmca ? [] : up,
    'If users can upload content: without a $6 agent registration with the U.S. Copyright Office you lose the §512(c) safe harbor. There is no fine, but you can be sued over users\' uploads.',
    'Register an agent at copyright.gov/dmca-directory and add a /dmca page with the agent contact and takedown process.');
}

// VC07 Secrets
{
  const s = grep(/sk_live_[0-9a-zA-Z]{10,}|sk-(proj-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|service_role|-----BEGIN [A-Z ]*PRIVATE KEY|xox[bp]-[0-9A-Za-z-]{10,}|ghp_[A-Za-z0-9]{36}|(NEXT_PUBLIC|VITE|REACT_APP|EXPO_PUBLIC)_[A-Z_]*(SECRET|SERVICE_ROLE|OPENAI|ANTHROPIC|PRIVATE)[A-Z_]*\s*=/);
  const envs = (gitTracked || []).filter((f) => /(^|\/)\.env(\.[a-z]+)?$/i.test(f) && !/\.(example|sample|template)$/i.test(f)).map((f) => ({ file: f, line: 1, text: '.env file committed to git' }));
  const ev = envs.concat(s);
  add('VC07', 'Secret keys in frontend or committed .env', ev.length ? 'FAIL' : 'PASS', ev,
    'Leaked keys get abused within hours (bills, data theft); a breach can trigger notification duties (all US states; GDPR Art. 33, 72 hours).',
    'Rotate the key now, move the call server-side, add .env* to .gitignore and run a secret scanner (gitleaks) in CI.');
}

// VC08 Open DB rules
{
  const s = grep(/allow\s+read\s*,\s*write\s*:\s*if\s+true|allow\s+(read|write)\s*:\s*if\s+true|"\.(read|write)"\s*:\s*true|disable row level security/i);
  const tables = grep(/create table/i, { only: /\.sql$/ });
  const rls = has(/enable row level security/i);
  const status = s.length ? 'FAIL' : tables.length && !rls ? 'NEEDS REVIEW' : 'PASS';
  add('VC08', 'Database rules open to everyone', status, s.length ? s : status === 'PASS' ? [] : tables,
    'Anyone on the internet can read or write your users\' data; a leak can trigger breach-notification duties.',
    'Require auth and ownership in Firebase rules; enable Supabase RLS with per-user policies on every table.');
}

// VC09 Privacy policy / terms
{
  const collects = has(/type=["']email["']|<form|signup|sign-up|createUser|auth\.|gtag|analytics|record\(/i, { only: CODE });
  const fileNames = [...files.keys()].join('\n');
  const privacy = /privacy/i.test(fileNames) || has(/href=["'][^"']*privacy/i);
  const terms = /terms|tos/i.test(fileNames) || has(/href=["'][^"']*(terms|tos)\b/i);
  const status = !collects ? 'PASS' : !privacy ? 'FAIL' : !terms ? 'NEEDS REVIEW' : 'PASS';
  add('VC09', 'Privacy policy and terms linked', status, [],
    'If you collect personal info from California residents, CalOPPA (B&P §22575) requires a conspicuously posted privacy policy; GDPR Art. 13 and the app stores require one too.',
    'Add /privacy and /terms, link them in the footer and at signup, and list the data, processors and trackers the app really uses.');
}

// VC10 Cookie / tracker consent (non-replay trackers)
{
  const t = grep(/googletagmanager\.com|gtag\(|fbq\(|connect\.facebook\.net|analytics\.tiktok|snap\.licdn|plausible|mixpanel\.init|amplitude\.init|segment\.com\/analytics|posthog\.init/i, { only: CODE });
  const consent = has(/consent|cookiebot|onetrust|klaro|cookieyes|iubenda/i, { only: CODE });
  const cookieless = t.every((x) => /plausible/i.test(x.text));
  const status = !t.length || cookieless ? 'PASS' : consent ? 'NEEDS REVIEW' : 'FAIL';
  add('VC10', 'Analytics/ad trackers load before cookie consent', status, status === 'PASS' ? [] : t,
    'If you have EU/UK visitors: non-essential cookies and trackers need prior opt-in (ePrivacy Art. 5(3), GDPR).',
    'Use a consent banner with Accept and Reject equally easy, and load trackers only after Accept (or Google Consent Mode v2 defaults to denied).');
}

// VC12 Accessibility basics
{
  const ev = [];
  for (const [f, L] of files) {
    if (!CODE.test(f)) continue;
    L.forEach((l, i) => {
      if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(l)) ev.push({ file: f, line: i + 1, text: l.trim().slice(0, 140), why: 'img without alt' });
      if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(l)) ev.push({ file: f, line: i + 1, text: l.trim().slice(0, 140), why: 'zoom disabled' });
      if (/<html(?![^>]*\blang=)[^>]*>/i.test(l)) ev.push({ file: f, line: i + 1, text: l.trim().slice(0, 140), why: 'html without lang' });
    });
  }
  const outline = grep(/outline\s*:\s*(none|0)\b/i, { only: /\.(s?css|html?|jsx?|tsx?|vue|svelte)$/ });
  const status = ev.length ? 'FAIL' : outline.length ? 'NEEDS REVIEW' : 'PASS';
  add('VC12', 'Accessibility basics (WCAG 2.2 AA)', status, ev.length ? ev : outline,
    'ADA Title III demand letters target small US sites; the European Accessibility Act covers many consumer e-commerce services from 28 Jun 2025.',
    'Add alt text, labels and visible focus styles, keep zoom enabled, set <html lang>, then run axe or Lighthouse.');
}

// VC13 AI disclosure
{
  const ai = grep(/from ['"](openai|@anthropic-ai\/sdk|@google\/generative-ai|@google\/genai|ai|@ai-sdk\/[a-z]+|langchain)['"]|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis|chat\.completions|messages\.create|generateText\(|streamText\(|useChat\(/i, { only: CODE });
  const disclosed = has(/(chatting|talking|speaking) (with|to) (an? )?AI|AI[- ]generated|AI assistant|powered by AI|this is an AI/i, { only: CODE });
  const status = !ai.length ? 'PASS' : disclosed ? 'NEEDS REVIEW' : 'FAIL';
  add('VC13', 'AI chatbot / AI content not disclosed', status, ai,
    'EU AI Act Art. 50 (from 2 Aug 2026): tell people they are interacting with AI and mark synthetic content. California B&P §17941 bars undisclosed bots used to drive a sale.',
    'Label the chat UI ("You\'re chatting with an AI assistant") and label AI-generated images and text.');
}

const order = { FAIL: 0, 'NEEDS REVIEW': 1, PASS: 2 };
results.sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id));
const n = (s) => results.filter((r) => r.status === s).length;
const summary = { fail: n('FAIL'), review: n('NEEDS REVIEW'), pass: n('PASS') };
const SKILL_ONLY = 'VC04 COPPA, VC11 CCPA, VC14 refunds, VC15 tax/VAT and VC16 licences need judgement: run the full skill.';
const DISC = 'Educational check, not legal advice. Laws change and depend on your facts. Confirm with a qualified lawyer before relying on this.';
const appName = path.basename(root);

if (flag('--json')) {
  console.log(JSON.stringify({ tool: 'vibe-check', version: VERSION, app: appName, files: files.size, summary, results, note: SKILL_ONLY, disclaimer: DISC }, null, 2));
} else if (flag('--md')) {
  const o = [`## Vibe Check: \`${appName}/\` (${files.size} files)`, '', `**${summary.fail} FAIL · ${summary.review} NEEDS REVIEW · ${summary.pass} PASS** (automated checks)`, ''];
  for (const r of results) {
    const icon = r.status === 'FAIL' ? '🔴' : r.status === 'PASS' ? '🟢' : '🟡';
    o.push(`### ${icon} ${r.status} · ${r.id} ${r.title}`);
    if (r.status !== 'PASS') {
      for (const e of r.evidence) o.push(`- \`${e.file}:${e.line}\` ${e.why ? `(${e.why}) ` : ''}\`${e.text.replace(/`/g, "'")}\``);
      o.push(`- **Risk:** ${r.risk}`, `- **Fix:** ${r.fix}`);
    }
    o.push('');
  }
  o.push(`_${SKILL_ONLY}_`, '', `> ${DISC}`);
  console.log(o.join('\n'));
} else {
  const W = 64, line = dim('─'.repeat(W));
  const tag = (s) => (s === 'FAIL' ? bgRed(' FAIL ') : s === 'PASS' ? bgLime(' PASS ') : bgAmber(' REVIEW '));
  console.log('');
  console.log(`  ${lime('▲ VIBE CHECK')} ${dim('v' + VERSION)}   ${dim('scanning')} ${bold(appName + '/')} ${dim(`(${files.size} files)`)}`);
  console.log('  ' + line);
  for (const r of results) {
    console.log(`  ${tag(r.status)}  ${dim(r.id)}  ${r.status === 'PASS' ? r.title : bold(r.title)}`);
    if (r.status === 'PASS') continue;
    for (const e of r.evidence.slice(0, 2)) console.log(`            ${cyan(e.file + ':' + e.line)}  ${dim(e.text.slice(0, 60))}`);
    console.log(`            ${amber('risk')}  ${r.risk}`);
    console.log(`            ${lime('fix ')}  ${r.fix}`);
    console.log('');
  }
  console.log('  ' + line);
  console.log(`  ${red(summary.fail + ' FAIL')}  ${dim('·')}  ${amber(summary.review + ' NEEDS REVIEW')}  ${dim('·')}  ${lime(summary.pass + ' PASS')}`);
  console.log(`  ${dim(SKILL_ONLY)}`);
  console.log(`  ${dim(DISC)}\n`);
}
process.exit(summary.fail ? 1 : 0);
