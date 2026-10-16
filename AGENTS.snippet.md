<!-- vibe-check:start -->
## Vibe Check (pre-launch compliance audit)
When asked to "vibe check" this app, or to run a compliance, legal or pre-launch check:
1. Run `node .agents/vibe-check/scripts/scan.mjs . --md` from the repo root (Node 18+, no dependencies).
2. Confirm each cited file:line, then follow `.agents/vibe-check/SKILL.md` and all 16 checks in `.agents/vibe-check/references/CHECKS.md`.
3. Report PASS / FAIL / NEEDS REVIEW with evidence and fixes. Use conditional wording and only the verified figures in `references/SOURCES.md`; never sum penalties or claim the app is "compliant".
4. End with: "Educational check, not legal advice. Laws change and depend on your facts. Confirm with a qualified lawyer before relying on this."
<!-- vibe-check:end -->
