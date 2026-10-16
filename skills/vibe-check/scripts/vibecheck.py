#!/usr/bin/env python3
"""vibecheck.py - automated subset of the Vibe Check skill (VC01, VC02, VC03, VC07, VC08).
usage: python3 vibecheck.py <app_dir> [--no-color]
The full audit (all 16 checks, with judgement) is done by an AI agent following SKILL.md.
Educational check, not legal advice."""
import os,re,sys
root=sys.argv[1] if len(sys.argv)>1 else '.'; color='--no-color' not in sys.argv and sys.stdout.isatty()
R,G,Y,D,B,X=(('\033[31m','\033[32m','\033[33m','\033[2m','\033[1m','\033[0m') if color else ('',)*6)
EXT=('.html','.htm','.js','.jsx','.ts','.tsx','.css','.vue','.svelte','.json','.rules')
files={}
for d,_,fs in os.walk(root):
  if any(p in d for p in ('node_modules','.git','.next','dist')):continue
  for f in fs:
    if f.endswith(EXT) or f.startswith('.env'):
      p=os.path.join(d,f);files[os.path.relpath(p,root)]=open(p,errors='ignore').read().splitlines()
def grep(rx,flags=re.I):
  return [(f,i+1,l.strip()) for f,L in files.items() for i,l in enumerate(L) if re.search(rx,l,flags)]
res=[]
# VC01 Google Fonts from Google servers
h=sorted(grep(r'fonts\.(googleapis|gstatic)\.com'),key=lambda r:'preconnect' in r[2])
res.append(('VC01','Google Fonts loaded from Google servers',h,'If you have EU visitors: GDPR. Munich court (2022) awarded EUR100 damages to one visitor.','Self-host the .woff2 files; remove the googleapis link.'))
# VC02 session replay before consent
rec=grep(r'(rrweb|hotjar|fullstory|logrocket|clarity\.ms|mouseflow|smartlook)[^\n]*|\brecord\(\{')
gate=grep(r'consent(Given|Granted)?\s*(===?|&&|\))|onConsent|hasConsent\(|addEventListener\([\'"]consent')
starts=[r for r in rec if re.search(r'record\(\{',r[2])]
gated=[s for s in starts if any(g[0]==s[0] and 0<=s[1]-g[1]<=6 for g in gate)]
masked=bool(grep(r'maskAllInputs:\s*true'))
fail=[s for s in starts if s not in gated] or ([s for s in starts] if starts and not masked else [])
res.append(('VC02','Session replay starts before consent',fail,'California CIPA lawsuits: $5,000 per violation (Cal. Penal Code 637.2).','Load recorder only after opt-in; mask all inputs.'))
# VC03 auto-renew checkout terms
sub=grep(r'subscription|renew|per month|/mo\b|recurring|free trial')
pay=[r for r in grep(r'<button[^>]*(checkout|subscribe|pay|start)',re.I)]
disc=grep(r'renews? automatically|auto-?renews?[^<]{0,60}until you cancel')
hidden=[d for d in disc if re.search(r'font-size:\s*([0-9]|1[01])px|color:\s*#(e|f|d)[0-9a-f]{2,5}\b|display:\s*none|class="[^"]*fine',d[2],re.I)]
consent=grep(r'type="checkbox"[^>]*(renew|consent|agree)|id="renew-consent"')
cancel=grep(r'cancel (anytime|online)|billing portal|/cancel|cancelSubscription')
f3=[]
if sub and pay:
  if not disc or hidden or not consent or not cancel: f3=(hidden or pay)
res.append(('VC03','Auto-renew terms hidden at checkout',f3,'California ARL: undisclosed renewals can be treated as an unconditional gift (B&P 17603).','Show renewal price, frequency and cancel path above the button; add consent + online cancel.'))
# VC07 secrets in frontend
s7=grep(r'sk_live_|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|service_role|-----BEGIN [A-Z ]*PRIVATE KEY',0)
res.append(('VC07','Secret keys in frontend',s7,'Leaked keys get abused fast; breach notice duties may apply.','Move calls server-side and rotate the key.'))
# VC08 open DB rules
s8=grep(r'allow read, write: if true|"\.(read|write)":\s*true',0)
res.append(('VC08','Database rules open to everyone',s8,'Anyone can read or write user data.','Require auth + ownership rules / enable RLS.'))
name=os.path.basename(os.path.abspath(root))
print(f"{B}VIBE CHECK{X} {D}v1.0{X}  scanning {name}/ ({len(files)} files)\n")
nf=0
for cid,title,hits,risk,fix in res:
  if hits:
    nf+=1;f,l,s=hits[0];print(f"{R}{B}FAIL{X}  {cid} {title}");print(f"      {D}{f}:{l}{X}  {s[:70]}");print(f"      {Y}risk{X} {risk}");print(f"      {G}fix{X}  {fix}\n")
for cid,title,hits,_,_ in res:
  if not hits:print(f"{G}{B}PASS{X}  {cid} {title}")
print(f"\n{B}{nf} FAIL{X} · {len(res)-nf} PASS  (automated checks; run the full skill for all 16)")
print(f"{D}Educational check, not legal advice.{X}")
sys.exit(1 if nf else 0)
