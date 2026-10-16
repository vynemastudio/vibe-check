# Contributing

Thanks for wanting to help. This project has one unusual constraint, so please
read the first section before anything else.

## The rule that matters most: no unsourced legal claims

vibe-check tells people things about the law. If we get a number wrong, someone
makes a worse decision than they would have without us. So:

- **Every legal figure, date, case or citation must have a link in
  [SOURCES.md](SOURCES.md).** Primary source where one exists (statute,
  regulation, official FAQ, court record); practitioner analysis for dates and
  current status.
- **Write conditionally.** "If you have EU visitors, this may…" — not "You must…".
  Nearly every law here is jurisdictional or threshold-based.
- **Never promise safety.** No "compliant", "legally safe", "covered",
  "protected". We report observations about code.
- **No scare numbers.** If a consequence is "you lose a defence", say that — do
  not borrow a bigger-sounding figure from an adjacent doctrine. (See the
  "Things we deliberately do not claim" section of SOURCES.md for the ones we
  have already ruled out.)
- If you are not sure a claim is right, open an issue instead of a PR. A good
  question is more useful here than a confident patch.

**Corrections are the most valuable contribution.** If a figure is stale or a
citation is wrong, please open an issue with a link. We will fix it fast.

## What we would love

- **Corrections** to anything legal, with sources.
- **New detection patterns** for existing checks — another session-replay
  vendor, another consent library, another secret format.
- **Fewer false positives.** If vibe-check flagged something that was fine,
  that is a bug. A minimal repro is gold.
- **New checks**, if they are mechanically detectable and matter before launch.
  Open an issue first so we can agree on scope and sources.
- **Framework coverage** — the checks lean web; Svelte, Astro, Nuxt, Rails,
  Laravel and Django patterns are welcome.

## What we will probably decline

- Dependencies. `scan.mjs` is zero-dependency Node and stays that way.
- Checks that cannot be evidenced from the source tree. If it needs a browser or
  a dashboard, it belongs in
  `skills/vibe-check/references/manual-verification.md`, not in the scanner.
- Anything that sends code, findings or telemetry anywhere. The scanner makes no
  network requests, and that is a feature.
- Checks whose only output is "NEEDS REVIEW, always". That is noise.

## Working on it

```bash
git clone https://github.com/vynemastudio/vibe-check
cd vibe-check
node scripts/scan.mjs .             # scan this repo
npm test                            # run the test suite
```

No build step and no install step. Node 18 or newer.

### Adding a detection pattern

Patterns live in the `RX` object near the top of
`skills/vibe-check/scripts/scan.mjs`. Add yours, then run the tests.

Two things to know about how matching works:

1. **`find()` reads comment-stripped source by default.** A commented-out
   tracker is not a live tracker, and `// TODO: add an unsubscribe link` must
   never count as evidence that the link exists. Pass `{ comments: true }` only
   where a commented-out match still matters — currently just the secrets check.
2. **Build output is scanned but segregated.** Files under `dist/`, `build/`,
   `out/` and similar are tagged `build: true` and excluded from source-level
   checks, so one issue is never reported twice. Pass `{ build: true }` to
   include them.

### Adding a check

Add an object to the `CHECKS` array with `id`, `title`, `law`, `applies` and
`run(ctx)`. `run` returns `{ status, summary, evidence, fix }` where `status` is
`'pass' | 'fail' | 'review'`.

Then — this is the part that matters — document it in
`skills/vibe-check/references/checks.md` with its citation, add the citation to
`SOURCES.md`, add a row to the tables in `.cursor/rules/vibe-check.mdc` and
`AGENTS.md`, add it to the checks list in `README.md` and `docs/index.html`, and
add a test. A check that exists in the scanner but not in the agent instructions
is half a check.

### Tests

```bash
npm test
```

`test/run.mjs` builds fixture apps in a temp directory, scans them, and asserts
on the statuses. Tests are zero-dependency too — plain Node, no runner. Add a
fixture for anything you change: one that should FAIL, and one that should PASS
after the fix.

## Commit and PR style

Small, focused commits with a plain description of the change. In the PR, say:

- what changed
- for a legal change, the source link
- for a pattern change, what it now catches and what it no longer catches

## Code of conduct

Be decent. Assume the other person is trying to help someone ship safely.

## Licence

By contributing you agree your contribution is licensed under the
[MIT License](LICENSE).
