import { useState, useEffect, useRef } from "react";
import { Activity, Wallet, Trophy, Brain, BarChart3 } from "lucide-react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');

:root {
  --bg: #0c0c0f;
  --card: #131318;
  --border: #22222e;
  --border2: #2c2c3e;
  --text: #f0f0f5;
  --text2: #8888a0;
  --text3: #44445a;
  --lime: #b9f751;
  --lime-dim: rgba(185,247,81,0.09);
  --lime-glow: rgba(185,247,81,0.2);
  --red: #ff5470;
  --purple: #9b7fff;
  --blue: #5b8fff;
  --gold: #ffb84d;
  --sans: 'Figtree', sans-serif;
  --serif: 'Instrument Serif', serif;
}

* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { background:var(--bg); color:var(--text); font-family:var(--sans); overflow-x:hidden; }

body::after {
  content:''; position:fixed; inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events:none; z-index:9999; opacity:0.5;
}

.eyebrow {
  font-size:11px; font-weight:700; letter-spacing:0.12em;
  text-transform:uppercase; color:var(--lime); margin-bottom:14px;
}
.land-cta {
  padding:14px 38px; background:var(--lime); color:#0c0c0f;
  border:none; border-radius:16px; font-size:15px; font-weight:800;
  font-family:var(--sans); cursor:pointer;
  box-shadow:0 4px 28px var(--lime-glow); transition:all .2s;
}
.land-cta:hover { transform:translateY(-2px); box-shadow:0 8px 36px rgba(185,247,81,.35); }

.dn-arrow {
  display:flex; flex-direction:column; align-items:center; gap:5px;
  cursor:pointer; background:none; border:none; font-family:var(--sans);
}
.dn-arrow-lbl { font-size:11px; font-weight:600; color:var(--text3); letter-spacing:.05em; transition:color .15s; }
.dn-arrow:hover .dn-arrow-lbl { color:var(--text2); }
.dn-arrow-icon { font-size:20px; color:var(--lime); display:block; animation:bounce 1.6s ease-in-out infinite; }
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

.step-headline {
  font-family:var(--serif); font-size:clamp(30px,5vw,46px);
  letter-spacing:-.025em; line-height:1.08; margin-bottom:12px; max-width:540px;
}
.step-headline em { font-style:italic; color:var(--lime); }
.step-body { font-size:15px; color:var(--text2); line-height:1.7; max-width:400px; margin-bottom:40px; }

/* ═══════════════════════ HERO ═══════════════════════ */
#s0 {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:40px 24px 60px; text-align:center; position:relative;
}
#s0::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 70% 50% at 50% 30%, rgba(185,247,81,.06) 0%, transparent 70%);
  pointer-events:none;
}
.land-paw { font-size:54px; margin-bottom:16px; display:block; animation:float 3s ease-in-out infinite; }
.land-title { font-family:var(--serif); font-size:clamp(40px,8vw,62px); letter-spacing:-.025em; line-height:1.02; margin-bottom:14px; }
.land-title em { font-style:italic; color:var(--lime); }
.land-sub { font-size:17px; color:var(--text2); max-width:400px; margin:0 auto 36px; line-height:1.65; }
.land-stats {
  display:inline-flex; margin-top:48px;
  background:var(--card); border:1px solid var(--border); border-radius:18px; overflow:hidden;
}
.lstat { padding:16px 28px; text-align:center; }
.lstat+.lstat { border-left:1px solid var(--border); }
.lstat-val { font-size:22px; font-weight:900; color:var(--lime); letter-spacing:-.02em; }
.lstat-lab { font-size:11px; color:var(--text3); margin-top:3px; font-weight:600; }
.hero-arrow { margin-top:44px; }

/* ═══════════════════════ INTRO ═══════════════════════ */
#s-intro {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:80px 40px; border-top:1px solid var(--border); position:relative; overflow:hidden;
}
#s-intro::before {
  content:''; position:absolute; right:-200px; top:50%;
  width:500px; height:500px; border-radius:50%;
  background:radial-gradient(circle, rgba(185,247,81,.04) 0%, transparent 70%);
  transform:translateY(-50%); pointer-events:none;
}
.intro-grid {
  display:grid; grid-template-columns:1fr 1fr;
  gap:80px; max-width:900px; width:100%; align-items:center;
  margin-bottom:60px;
}
.intro-left .eyebrow { text-align:left; }
.intro-headline {
  font-family:var(--serif); font-size:clamp(32px,4vw,46px);
  letter-spacing:-.025em; line-height:1.08; margin-bottom:16px; text-align:left;
}
.intro-headline em { font-style:italic; color:var(--lime); }
.intro-body { font-size:15px; color:var(--text2); line-height:1.7; text-align:left; }

.signal-path { position:relative; width:100%; padding:10px 0; }
.sp-node {
  display:flex; align-items:center; gap:16px;
  position:relative; margin-bottom:0;
}
.sp-node-dot {
  width:36px; height:36px; border-radius:50%; flex-shrink:0;
  border:2px solid var(--border2); background:var(--card);
  display:flex; align-items:center; justify-content:center;
  font-size:14px; position:relative; z-index:2;
  transition:all .3s; cursor:default;
}
.sp-node.lit .sp-node-dot {
  border-color:var(--lime); background:rgba(185,247,81,.1);
  box-shadow:0 0 16px rgba(185,247,81,.25);
  color:var(--lime);
}
.sp-node-label { font-size:13px; font-weight:600; color:var(--text3); transition:color .3s; }
.sp-node.lit .sp-node-label { color:var(--text); }
.sp-node-num { margin-left:auto; font-size:10px; font-weight:700; color:var(--text3); font-family:monospace; transition:color .3s; }
.sp-node.lit .sp-node-num { color:var(--lime); }

.sp-wire {
  width:2px; height:24px; margin-left:17px;
  background:var(--border); position:relative; overflow:hidden;
}
.sp-wire-pulse {
  position:absolute; top:-100%; left:0; right:0;
  height:50%; background:linear-gradient(to bottom, transparent, var(--lime), transparent);
  animation:wirePulse 2s ease-in-out infinite;
}
@keyframes wirePulse { 0%{top:-100%} 100%{top:200%} }
.sp-wire.lit { background:rgba(185,247,81,.3); }

/* ═══════════════════════ STEP 1 ═══════════════════════ */
#s1 {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center;
  padding:80px 24px; border-top:1px solid var(--border); position:relative; overflow:hidden;
}
#s1::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 60% 40% at 50% 60%, rgba(185,247,81,.03) 0%, transparent 70%);
  pointer-events:none;
}

.feed-panel {
  width:100%; max-width:520px; margin-bottom:44px;
  background:rgba(13,13,20,.8);
  border:1px solid var(--border2);
  border-radius:18px; overflow:hidden;
  box-shadow:0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(185,247,81,.04);
  backdrop-filter:blur(20px);
}
.feed-bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 16px; background:rgba(19,19,24,.9); border-bottom:1px solid var(--border);
}
.feed-bar-left { display:flex; align-items:center; gap:8px; }
.fdot { width:8px; height:8px; border-radius:50%; }
.fdot-r{background:#ff5f57} .fdot-y{background:#ffbd2e} .fdot-g{background:#28ca41}
.feed-title { font-size:11px; color:var(--text3); font-weight:600; margin-left:4px; }
.feed-live {
  display:flex; align-items:center; gap:5px;
  padding:3px 8px; background:rgba(185,247,81,.08);
  border:1px solid rgba(185,247,81,.2); border-radius:20px;
}
.feed-live-dot {
  width:5px; height:5px; border-radius:50%; background:var(--lime);
  animation:livePulse 1.2s ease-in-out infinite;
}
@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
.feed-live-lbl { font-size:9px; font-weight:700; color:var(--lime); letter-spacing:.06em; }

.feed-counter {
  padding:16px 20px; border-bottom:1px solid var(--border);
  display:flex; align-items:baseline; gap:8px;
}
.feed-counter-num { font-size:32px; font-weight:900; color:var(--lime); letter-spacing:-.04em; font-variant-numeric:tabular-nums; }
.feed-counter-label { font-size:12px; color:var(--text3); font-weight:600; }

.feed-rows { padding:0; max-height:220px; overflow:hidden; position:relative; }
.feed-rows::before, .feed-rows::after {
  content:''; position:absolute; left:0; right:0; z-index:2; pointer-events:none;
}
.feed-rows::before { top:0; height:40px; background:linear-gradient(to bottom, rgba(13,13,20,.9), transparent); }
.feed-rows::after { bottom:0; height:60px; background:linear-gradient(to top, rgba(13,13,20,.95), transparent); }

.feed-row {
  display:flex; align-items:center; gap:10px;
  padding:9px 20px; border-bottom:1px solid rgba(255,255,255,.03);
  font-size:11px; animation:feedSlideIn .3s ease;
}
@keyframes feedSlideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
.feed-wallet { font-family:monospace; color:var(--text3); flex:1; }
.feed-price { color:var(--text2); width:40px; text-align:right; }
.feed-size { font-weight:700; color:var(--text); width:50px; text-align:right; }
.feed-side {
  padding:2px 8px; border-radius:5px; font-size:9px; font-weight:800;
  letter-spacing:.06em; width:36px; text-align:center; flex-shrink:0;
}
.feed-side.buy { background:rgba(185,247,81,.1); color:var(--lime); border:1px solid rgba(185,247,81,.2); }
.feed-side.sell { background:rgba(255,84,112,.08); color:var(--red); border:1px solid rgba(255,84,112,.18); }

/* ═══════════════════════ STEP 2 ═══════════════════════ */
#s2 {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center;
  padding:80px 24px; border-top:1px solid var(--border); position:relative; overflow:hidden;
}
#s2::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 60% 50% at 70% 50%, rgba(91,143,255,.03) 0%, transparent 70%);
  pointer-events:none;
}

.dossier-grid {
  display:grid; grid-template-columns:repeat(3,1fr);
  gap:14px; max-width:860px; width:100%; margin-bottom:44px;
}
.dossier-card {
  background:var(--card); border:1px solid var(--border);
  border-radius:18px; padding:20px; position:relative; overflow:hidden;
  transition:transform .2s, border-color .2s, box-shadow .2s;
  cursor:default; text-align:left;
}
.dossier-card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(0,0,0,.4); }
.dossier-card.sharp:hover { border-color:rgba(185,247,81,.3); box-shadow:0 16px 48px rgba(185,247,81,.06); }
.dossier-card.casual:hover { border-color:rgba(91,143,255,.3); box-shadow:0 16px 48px rgba(91,143,255,.06); }
.dossier-card.noise:hover { border-color:rgba(255,84,112,.2); }
.dossier-card::after {
  content:''; position:absolute; top:-30px; right:-30px;
  width:80px; height:80px; border-radius:50%; filter:blur(28px); opacity:.12; pointer-events:none;
}
.dossier-card.sharp::after { background:var(--lime); }
.dossier-card.casual::after { background:var(--blue); }
.dossier-card.noise::after { background:var(--red); }

.dossier-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.dossier-info { flex:1; min-width:0; }
.dossier-addr { font-size:9px; font-family:monospace; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px; }
.dossier-tier {
  display:inline-flex; align-items:center;
  padding:2px 7px; border-radius:4px;
  font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.06em;
}
.tier-sharp { background:rgba(185,247,81,.1); color:var(--lime); border:1px solid rgba(185,247,81,.2); }
.tier-casual { background:rgba(91,143,255,.1); color:var(--blue); border:1px solid rgba(91,143,255,.2); }
.tier-noise { background:rgba(255,84,112,.08); color:var(--red); border:1px solid rgba(255,84,112,.15); }

.dossier-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px 10px; margin-bottom:14px; }
.dstat-val { font-size:15px; font-weight:900; letter-spacing:-.03em; }
.dstat-val.lime{color:var(--lime)} .dstat-val.blue{color:var(--blue)} .dstat-val.text{color:var(--text)} .dstat-val.red{color:var(--red);opacity:.8}
.dstat-lbl { font-size:9px; color:var(--text3); font-weight:600; margin-top:1px; }

.sparkline-lbl {
  font-size:9px; color:var(--text3); font-weight:700; text-transform:uppercase;
  letter-spacing:.06em; margin-bottom:6px;
  display:flex; align-items:center; justify-content:space-between;
}
.sparkline-unit { font-size:8px; color:var(--text3); font-weight:600; opacity:.6; }
.sparkline-wrap { background:rgba(0,0,0,.25); border:1px solid var(--border); border-radius:10px; padding:10px 6px 6px; }

/* ═══════════════════════ STEP 3 — bar chart ═══════════════════════ */
#s3 {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center;
  padding:80px 24px 60px; border-top:1px solid var(--border); position:relative; overflow:hidden;
}
#s3::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 50% 40% at 50% 30%, rgba(255,184,77,.04) 0%, transparent 70%);
  pointer-events:none;
}

.bar-outer { width:100%; max-width:680px; display:flex; align-items:flex-start; gap:0; }
.bar-chart-inner { flex:1; min-width:0; }

.bar-col-headers {
  display:flex; align-items:center; gap:10px;
  margin-bottom:10px; padding-bottom:8px;
  border-bottom:1px solid var(--border);
}
.bar-col-header-wallet {
  width:110px; flex-shrink:0;
  font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
  color:var(--text3); text-align:left;
}
.bar-col-header-chart {
  flex:1;
  font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
  color:var(--text3); text-align:left; padding-left:4px;
}

.bar-rows { display:flex; flex-direction:column; gap:10px; }
.bar-row { display:flex; align-items:center; gap:10px; }
.bar-row.dq { opacity:.35; }

.bar-meta { width:110px; flex-shrink:0; text-align:left; }
.bar-addr { font-size:9px; font-family:monospace; }

.bar-track {
  flex:1; height:36px; background:rgba(255,255,255,.03);
  border-radius:8px; overflow:hidden; position:relative;
  border:1px solid var(--border);
}
.bar-fill {
  height:100%; border-radius:8px;
  display:flex; align-items:center; justify-content:flex-end;
  padding-right:10px;
  transition:width 1.1s cubic-bezier(.4,0,.2,1);
}
.bar-fill-label { font-size:11px; font-weight:900; white-space:nowrap; }

.threshold-note {
  margin-top:18px; font-size:11px; color:var(--text3);
  display:flex; align-items:center; gap:6px; justify-content:center;
}
.threshold-dot { width:6px; height:6px; border-radius:50%; background:var(--lime); display:inline-block; flex-shrink:0; }

/* ═══════════════════════ STEP 4 ═══════════════════════ */
#s4 {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center;
  padding:80px 24px; border-top:1px solid var(--border); position:relative; overflow:hidden;
}
.s4-bg-lime { position:absolute; right:-50px; top:50%; transform:translateY(-50%); width:350px; height:350px; border-radius:50%; background:rgba(185,247,81,.04); filter:blur(60px); pointer-events:none; }
.s4-bg-red { position:absolute; left:-50px; top:50%; transform:translateY(-50%); width:300px; height:300px; border-radius:50%; background:rgba(255,84,112,.04); filter:blur(60px); pointer-events:none; }

.gauge-wrap { width:100%; max-width:480px; margin-bottom:44px; }
.gauge-card {
  background:var(--card); border:1px solid var(--border);
  border-radius:20px; padding:32px 28px 28px;
}
.gauge-svg-wrap { position:relative; width:260px; margin:0 auto 8px; }
.gauge-svg-wrap svg { width:260px; height:150px; overflow:visible; }
.gauge-label-no { position:absolute; left:0; bottom:4px; font-size:11px; font-weight:800; color:var(--red); }
.gauge-label-yes { position:absolute; right:0; bottom:4px; font-size:11px; font-weight:800; color:var(--lime); }

.gauge-pct { font-size:36px; font-weight:900; color:var(--lime); letter-spacing:-.04em; margin-bottom:2px; }
.gauge-verdict { font-size:12px; color:var(--text3); font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:20px; }

.gauge-wallets { display:flex; gap:8px; justify-content:center; margin-bottom:20px; }
.gw-dot {
  width:42px; height:42px; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:800; position:relative; border:2px solid;
  animation:popIn .4s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes popIn { from{opacity:0;transform:scale(.4)} to{opacity:1;transform:scale(1)} }
.gw-dot.y{background:rgba(185,247,81,.12);border-color:rgba(185,247,81,.3);color:var(--lime)}
.gw-dot.n{background:rgba(255,84,112,.09);border-color:rgba(255,84,112,.25);color:var(--red)}
.gw-tag {
  position:absolute; bottom:-6px; right:-6px;
  width:14px; height:14px; border-radius:50%;
  font-size:7px; font-weight:900; display:flex; align-items:center; justify-content:center;
  border:2px solid var(--bg);
}
.gw-tag.y{background:var(--lime);color:#0c0c0f} .gw-tag.n{background:var(--red);color:#fff}

.gauge-note {
  padding:10px 14px; background:var(--lime-dim);
  border:1px solid rgba(185,247,81,.18); border-radius:10px;
  font-size:12px; font-weight:600; color:var(--lime);
}

/* ═══════════════════════ STEP 5 ═══════════════════════ */
#s5 {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center;
  padding:80px 24px; border-top:1px solid var(--border); position:relative; overflow:hidden;
}
.starfield { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.star {
  position:absolute; border-radius:50%; background:rgba(255,255,255,.5);
  animation:twinkle linear infinite;
}
@keyframes twinkle { 0%,100%{opacity:.2} 50%{opacity:.7} }

.constellation-wrap {
  width:100%; max-width:520px; margin-bottom:44px;
  background:rgba(8,8,16,.7); border:1px solid var(--border2);
  border-radius:20px; padding:28px 24px;
  backdrop-filter:blur(12px);
}
.constellation-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text3); margin-bottom:22px; text-align:left; }
.constellation-svg { width:100%; }

.cdot-circle { transition:r .3s, opacity .3s; cursor:default; }
.ellipse-ring { animation:ellipsePulse 3s ease-in-out infinite; }
@keyframes ellipsePulse { 0%,100%{opacity:.5} 50%{opacity:.9} }

.div-levels { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:20px; }
.div-lvl { padding:13px; border-radius:12px; border:1px solid; text-align:center; cursor:default; transition:transform .15s; }
.div-lvl:hover { transform:translateY(-2px); }
.div-lvl.lo{background:rgba(185,247,81,.06);border-color:rgba(185,247,81,.2)}
.div-lvl.md{background:rgba(255,184,77,.06);border-color:rgba(255,184,77,.2)}
.div-lvl.hi{background:rgba(255,84,112,.06);border-color:rgba(255,84,112,.2)}
.div-lvl-n { font-size:12px; font-weight:800; margin-bottom:3px; }
.div-lvl.lo .div-lvl-n{color:var(--lime)} .div-lvl.md .div-lvl-n{color:var(--gold)} .div-lvl.hi .div-lvl-n{color:var(--red)}
.div-lvl-d { font-size:10px; color:var(--text3); line-height:1.45; }

/* ═══════════════════════ FINAL ═══════════════════════ */
#s-final {
  min-height:60vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center;
  padding:80px 24px; border-top:1px solid var(--border); position:relative;
}
#s-final::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 60% 60% at 50% 50%, rgba(185,247,81,.04) 0%, transparent 70%);
  pointer-events:none;
}
.final-title { font-family:var(--serif); font-size:clamp(36px,6vw,54px); letter-spacing:-.025em; line-height:1.05; margin-bottom:14px; }
.final-title em { font-style:italic; color:var(--lime); }
.final-sub { font-size:15px; color:var(--text2); max-width:340px; line-height:1.65; margin-bottom:32px; }

/* ─── SCROLL PROGRESS ─── */
.scroll-progress {
  position:fixed; left:16px; top:50%; transform:translateY(-50%);
  display:flex; flex-direction:column; gap:8px; z-index:100;
}
.sp-pip {
  width:5px; height:5px; border-radius:50%;
  background:var(--border2); transition:all .3s; cursor:pointer;
}
.sp-pip.active { background:var(--lime); box-shadow:0 0 8px rgba(185,247,81,.5); transform:scale(1.4); }

/* ─── INTERSECTION REVEAL ─── */
.reveal { opacity:0; transform:translateY(24px); transition:opacity .6s ease, transform .6s ease; }
.reveal.visible { opacity:1; transform:translateY(0); }

@media(max-width:640px){
  .intro-grid{grid-template-columns:1fr;gap:36px}
  .dossier-grid{grid-template-columns:1fr}
  .scroll-progress{display:none}
}
`;

const DOSSIER_WALLETS = [
  { addr: "0x4f2a...8c1d", tier: "sharp", color: "#b9f751", sparkData: [0, 3, 5, 8, 7, 12, 14, 18, 20, 26, 30, 34], stats: { markets: 94, winRate: "71%", roi: "+34%", volume: "$312k" } },
  { addr: "0xa2c5...77ef", tier: "casual", color: "#5b8fff", sparkData: [0, 2, 1, 4, 3, 5, 4, 6, 5, 7, 6, 6], stats: { markets: 23, winRate: "48%", roi: "+6%", volume: "$31k" } },
  { addr: "0xbb11...22cc", tier: "noise", color: "#ff5470", sparkData: [0, 2, 4, 3, 5, 2, 0, -3, -5, -8, -11, -14], stats: { markets: 8, winRate: "31%", roi: "-14%", volume: "$7k" } },
];

const FEED_POOL = [
  { w: "0x4f2a...8c1d", p: 0.63, s: 4200, b: true },
  { w: "0x9b3e...2a4f", p: 0.71, s: 1800, b: true },
  { w: "0xf71c...dd3a", p: 0.38, s: 900, b: false },
  { w: "0x3d8b...1190", p: 0.68, s: 3100, b: true },
  { w: "0xa2c5...77ef", p: 0.51, s: 500, b: true },
  { w: "0xbb11...22cc", p: 0.29, s: 2200, b: false },
  { w: "0x77dd...99fa", p: 0.65, s: 700, b: true },
  { w: "0xcc44...11be", p: 0.34, s: 1100, b: false },
];

const SECTIONS = ["s0", "s-intro", "s1", "s2", "s3", "s4", "s5", "s-final"];

const WINNER_WALLETS = [
  { addr: "0x4f2a...8c1d", roi: 34, qualified: true },
  { addr: "0x9b3e...2a4f", roi: 22, qualified: true },
  { addr: "0x3d8b...1190", roi: 18, qualified: true },
  { addr: "0xf71c...dd3a", roi: 6, qualified: false },
  { addr: "0xa2c8...88fb", roi: 3, qualified: false },
];
const THRESHOLD = 15;
const MAX_ROI = 40;
const GREEN_STYLE = { color: "#b9f751", bg: "rgba(185,247,81,.08)", border: "rgba(185,247,81,.25)" };
const RED_STYLE = { color: "#ff5470", bg: "rgba(255,84,112,.08)", border: "rgba(255,84,112,.2)" };

function Identicon({ seed, size = 38, color = "#b9f751" }: { seed: string; size?: number; color?: string }) {
  const hash = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pixels = Array.from({ length: 15 }, (_, i) => !!(hash >> i & 1));
  const grid: boolean[] = [];
  for (let r = 0; r < 5; r++) {
    const row = [pixels[r * 3], pixels[r * 3 + 1], pixels[r * 3 + 2], pixels[r * 3 + 1], pixels[r * 3]];
    grid.push(...row);
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1.5px", padding: "5px", background: "#080810", borderRadius: "10px", width: size, height: size, flexShrink: 0, border: "1px solid #22222e" }}>
      {grid.map((on, i) => (
        <div key={i} style={{ borderRadius: "1px", background: on ? color + "33" : "transparent" }} />
      ))}
    </div>
  );
}

function Sparkline({ data, color, height = 90 }: { data: number[]; color: string; height?: number }) {
  const PAD = { top: 10, right: 10, bottom: 26, left: 36 };
  const W = 220, H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const min = Math.min(...data), max = Math.max(...data);
  const yMin = Math.floor(min / 5) * 5;
  const yMax = Math.ceil(max / 5) * 5;
  const yRange = yMax - yMin || 10;
  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const yOf = (v: number) => PAD.top + (1 - (v - yMin) / yRange) * innerH;
  const pts = data.map((v, i) => `${xOf(i)},${yOf(v)}`);
  const linePath = "M " + pts.join(" L ");
  const areaPath = linePath + ` L ${xOf(data.length - 1)},${H - PAD.bottom} L ${xOf(0)},${H - PAD.bottom} Z`;
  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];
  const xLabelData = [
    { idx: 0, label: "Jan" },
    { idx: Math.floor((data.length - 1) / 2), label: "Jun" },
    { idx: data.length - 1, label: "Dec" },
  ];
  const gradId = `spGrad_${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: H, display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={yOf(tick)} x2={W - PAD.right} y2={yOf(tick)} stroke="#22222e" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 3"} />
          <text x={PAD.left - 5} y={yOf(tick)} textAnchor="end" dominantBaseline="middle" fill="#44445a" fontSize="7.5" fontFamily="Figtree,sans-serif" fontWeight="600">{tick > 0 ? `+${tick}%` : `${tick}%`}</text>
        </g>
      ))}
      {yMin <= 0 && yMax >= 0 && (
        <line x1={PAD.left} y1={yOf(0)} x2={W - PAD.right} y2={yOf(0)} stroke="#3a3a4a" strokeWidth="1.5" />
      )}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${color}55)` }} />
      {data.map((v, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2" fill={color} opacity="0.6" stroke="var(--bg)" strokeWidth="1" />
      ))}
      <circle cx={xOf(data.length - 1)} cy={yOf(data[data.length - 1])} r="3.5" fill={color} stroke="var(--bg)" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${color}99)` }} />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#22222e" strokeWidth="1" />
      {xLabelData.map(({ idx, label }) => (
        <text key={idx} x={xOf(idx)} y={H - PAD.bottom + 13} textAnchor="middle" fill="#44445a" fontSize="8" fontFamily="Figtree,sans-serif" fontWeight="600">{label}</text>
      ))}
    </svg>
  );
}

function GaugeSVG({ pct, animated }: { pct: number; animated: boolean }) {
  const cx = 130, cy = 130, r = 100;
  const toRad = (d: number) => d * Math.PI / 180;
  const arc = (start: number, end: number) => {
    const s = { x: cx + r * Math.cos(toRad(start)), y: cy + r * Math.sin(toRad(start)) };
    const e = { x: cx + r * Math.cos(toRad(end)), y: cy + r * Math.sin(toRad(end)) };
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    const sweep = end > start ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
  };
  const needleAngle = -180 + (pct / 100) * 180;
  const nx = cx + (r - 14) * Math.cos(toRad(needleAngle));
  const ny = cy + (r - 14) * Math.sin(toRad(needleAngle));
  return (
    <svg width="260" height="150" viewBox="0 0 260 150" overflow="visible">
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff5470" />
          <stop offset="50%" stopColor="#44445a" />
          <stop offset="100%" stopColor="#b9f751" />
        </linearGradient>
        <filter id="needleGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={arc(-180, 0)} fill="none" stroke="#22222e" strokeWidth="12" strokeLinecap="round" />
      <path d={arc(-180, needleAngle)} fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" />
      {[-180, -150, -120, -90, -60, -30, 0].map((a, i) => {
        const ix = cx + 88 * Math.cos(toRad(a)), iy = cy + 88 * Math.sin(toRad(a));
        const ox = cx + 102 * Math.cos(toRad(a)), oy = cy + 102 * Math.sin(toRad(a));
        return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#2c2c3e" strokeWidth="2" />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#b9f751" strokeWidth="3" strokeLinecap="round" filter="url(#needleGlow)" style={{ transition: animated ? "all 1.2s cubic-bezier(.4,0,.2,1)" : "none" }} />
      <circle cx={cx} cy={cy} r="8" fill="#1a1a24" stroke="#b9f751" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="3" fill="#b9f751" />
    </svg>
  );
}

function ConstellationSVG() {
  const walletDots = [
    { id: 1, pct: 63, y: true },
    { id: 2, pct: 71, y: true },
    { id: 3, pct: 68, y: true },
    { id: 4, pct: 38, y: false },
    { id: 5, pct: 65, y: true },
  ];
  const W = 420, H = 120;
  const baseY = 55;
  const xOf = (pct: number) => 20 + (pct / 100) * (W - 40);

  const sizes = walletDots.map(d => ({ ...d, x: xOf(d.pct) }));
  const xs = sizes.map(d => d.x);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const std = Math.sqrt(xs.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / xs.length);
  const connections = [[0, 1], [1, 2], [2, 4], [0, 4]];

  const yesDots = walletDots.filter(d => d.y);
  const clusterMinPct = yesDots.length ? Math.min(...yesDots.map(d => d.pct)) : 0;
  const clusterMaxPct = yesDots.length ? Math.max(...yesDots.map(d => d.pct)) : 0;
  const clusterX1 = xOf(clusterMinPct);
  const clusterX2 = xOf(clusterMaxPct);
  const roundDown5 = (n: number) => Math.floor(n / 5) * 5;
  const roundUp5 = (n: number) => Math.ceil(n / 5) * 5;
  const clusterLabel = `${roundDown5(clusterMinPct)}–${roundUp5(clusterMaxPct)}%`;
  const bracketY = baseY - 38;
  const bracketPath = `M ${clusterX1} ${baseY - 18} L ${clusterX1} ${bracketY} L ${clusterX2} ${bracketY} L ${clusterX2} ${baseY - 18}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="constellation-svg" style={{ height: "140px" }}>
      <defs>
        <radialGradient id="dotGlowY" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b9f751" stopOpacity=".4" />
          <stop offset="100%" stopColor="#b9f751" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dotGlowN" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5470" stopOpacity=".4" />
          <stop offset="100%" stopColor="#ff5470" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="20" y1={baseY} x2={W - 20} y2={baseY} stroke="#22222e" strokeWidth="1.5" />
      {[10, 30, 50, 70, 90].map(pct => (
        <g key={pct} transform={`translate(${xOf(pct)},${baseY})`}>
          <line y1="-5" y2="5" stroke="#2c2c3e" strokeWidth="1" />
          <text y="18" textAnchor="middle" fill="#44445a" fontSize="9" fontFamily="Figtree,sans-serif" fontWeight="600">{pct}%</text>
        </g>
      ))}
      <ellipse cx={mean} cy={baseY} rx={std * 1.6 + 18} ry="22" fill="none" stroke="rgba(185,247,81,.15)" strokeWidth="1.5" strokeDasharray="4 3" className="ellipse-ring" />
      {yesDots.length > 1 && (
        <>
          <path d={bracketPath} fill="none" stroke="rgba(185,247,81,.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x={(clusterX1 + clusterX2) / 2} y={bracketY - 6} textAnchor="middle" fill="#b9f751" fontSize="9" fontWeight="800" fontFamily="Figtree,sans-serif" letterSpacing="0.02em">{clusterLabel}</text>
        </>
      )}
      {connections.map(([a, b], i) => (
        <line key={i} x1={sizes[a].x} y1={baseY} x2={sizes[b].x} y2={baseY} stroke="rgba(185,247,81,.12)" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      {sizes.map((d) => (
        <g key={d.id} transform={`translate(${d.x},${baseY})`}>
          <circle r="18" fill={d.y ? "url(#dotGlowY)" : "url(#dotGlowN)"} opacity=".7" />
          <circle r="9" fill={d.y ? "rgba(185,247,81,.15)" : "rgba(255,84,112,.12)"} stroke={d.y ? "rgba(185,247,81,.5)" : "rgba(255,84,112,.45)"} strokeWidth="1.5" className="cdot-circle" />
          <text textAnchor="middle" dy="4" fill={d.y ? "#b9f751" : "#ff5470"} fontSize="9" fontWeight="800" fontFamily="Figtree,sans-serif">{d.id}</text>
        </g>
      ))}
    </svg>
  );
}

function Starfield({ count = 60 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 137.508) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: (i % 3) * 0.5 + 0.5,
    dur: (i % 3) + 2,
    delay: (i % 4),
  }));
  return (
    <div className="starfield">
      {stars.map((s, i) => (
        <div key={i} className="star" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  );
}

function Bracket({ height, color = "#b9f751", dir = "right" }: { height: number; color?: string; dir?: "left" | "right" }) {
  const W = 16, r = 5, mid = height / 2;
  const spineX = dir === "right" ? 0 : W;
  const tipX = dir === "right" ? W : 0;
  const innerX = dir === "right" ? W - r : r;
  const d = [
    `M ${tipX} 2`,
    `Q ${innerX} 2 ${innerX} ${2 + r}`,
    `L ${innerX} ${mid - r}`,
    `Q ${innerX} ${mid} ${spineX} ${mid}`,
    `M ${spineX} ${mid}`,
    `Q ${innerX} ${mid} ${innerX} ${mid + r}`,
    `L ${innerX} ${height - 2 - r}`,
    `Q ${innerX} ${height - 2} ${tipX} ${height - 2}`,
  ].join(" ");
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} overflow="visible" style={{ flexShrink: 0, display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function useInView(threshold = 0.25): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function BarChart() {
  const [barRef, barInView] = useInView(0.2);
  const [pillsShown, setPillsShown] = useState<number[]>([]);

  useEffect(() => {
    if (!barInView) return;
    WINNER_WALLETS.forEach((_, i) => {
      setTimeout(() => setPillsShown(s => [...s, i]), 1200 + i * 130);
    });
  }, [barInView]);

  const thresholdPct = (THRESHOLD / MAX_ROI) * 100;
  const qualifiedRows = WINNER_WALLETS.filter(w => w.qualified);
  const ROW_H = 36, GAP_H = 10;
  const bracketHeight = qualifiedRows.length * ROW_H + (qualifiedRows.length - 1) * GAP_H;
  const HEADER_H = 37;

  return (
    <div className="bar-outer" ref={barRef}>
      <div className="bar-chart-inner">
        <div className="bar-col-headers">
          <div className="bar-col-header-wallet">Wallet IDs</div>
          <div className="bar-col-header-chart">Historic Avg. Performance</div>
        </div>
        <div className="bar-rows">
          {WINNER_WALLETS.map((w, i) => {
            const rs = w.qualified ? GREEN_STYLE : RED_STYLE;
            const widthPct = barInView ? (w.roi / MAX_ROI) * 100 : 0;
            return (
              <div key={i} className={`bar-row${w.qualified ? "" : " dq"}`}>
                <div className="bar-meta">
                  <div className="bar-addr" style={{ color: w.qualified ? "var(--text2)" : "var(--text3)" }}>
                    {w.addr}
                  </div>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{
                    width: `${widthPct}%`,
                    background: w.qualified
                      ? "linear-gradient(90deg,rgba(185,247,81,.04),rgba(185,247,81,.28))"
                      : "rgba(255,84,112,.15)",
                    transitionDelay: `${i * 100}ms`,
                  }}>
                    {widthPct > 20 && (
                      <span className="bar-fill-label" style={{ color: rs.color }}>+{w.roi}%</span>
                    )}
                  </div>
                  {widthPct <= 20 && (
                    <span style={{
                      position: "absolute", left: `${widthPct}%`, top: 0, bottom: 0,
                      display: "flex", alignItems: "center", paddingLeft: 8,
                      fontSize: 11, fontWeight: 900, whiteSpace: "nowrap", color: rs.color,
                    }}>+{w.roi}%</span>
                  )}
                  <div style={{
                    position: "absolute", top: 0, bottom: 0, left: `${thresholdPct}%`,
                    borderLeft: "1.5px dashed rgba(255,255,255,.13)", pointerEvents: "none",
                  }} />
                </div>
                <div style={{
                  flexShrink: 0,
                  opacity: pillsShown.includes(i) ? 1 : 0,
                  transform: pillsShown.includes(i) ? "scale(1)" : "scale(.6)",
                  transition: "opacity .3s ease, transform .4s cubic-bezier(.34,1.56,.64,1)",
                  padding: "2px 7px", borderRadius: 4,
                  fontSize: 8, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase",
                  background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`,
                  whiteSpace: "nowrap",
                }}>
                  {w.qualified ? "Passes" : "Fails"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "row", flexShrink: 0, marginLeft: 12, paddingTop: HEADER_H, alignItems: "flex-start" }}>
        <Bracket height={bracketHeight} color="#b9f751" dir="left" />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: bracketHeight, marginLeft: 7,
        }}>
          <span style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            fontSize: 9, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase",
            color: "var(--lime)", opacity: 0.75, whiteSpace: "nowrap",
          }}>
            Smart Wallets
          </span>
        </div>
      </div>
    </div>
  );
}

export type LandingStats = { volume_tracked: string; live_markets: number; avg_analysis_time: string } | null;

export default function LandingPage({
  onBrowseMarkets,
  stats = null,
}: {
  onBrowseMarkets: () => void;
  stats?: LandingStats;
}) {
  const [feedRows, setFeedRows] = useState(FEED_POOL.slice(0, 5));
  const [counter, setCounter] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [gaugeAnimated, setGaugeAnimated] = useState(false);
  const [litNodes, setLitNodes] = useState<number[]>([]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const next = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)];
      setFeedRows(prev => [next, ...prev.slice(0, 7)]);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let n = 0, target = 247;
    const t = setInterval(() => {
      n += Math.ceil(target / 60);
      if (n >= target) { n = target; clearInterval(t); }
      setCounter(n);
    }, 40);
    return () => clearInterval(t);
  }, []);

  // Keep counter increasing every so often after initial animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setCounter(c => c + Math.floor(Math.random() * 3 + 1));
      }, 1200);
    }, 2600);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      if (i >= 5) { clearInterval(t); return; }
      setLitNodes(prev => [...prev, i]);
      i++;
    }, 380);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.15 });
    reveals.forEach(el => revealObs.observe(el));

    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = SECTIONS.indexOf(e.target.id);
          if (idx !== -1) setActiveSection(idx);
          if (e.target.id === "s4") setGaugeAnimated(true);
        }
      });
    }, { threshold: 0.4 });
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) sectionObs.observe(el);
    });

    return () => { revealObs.disconnect(); sectionObs.disconnect(); };
  }, []);

  const volumeDisplay = stats?.volume_tracked ?? "$2.4B";
  const marketsDisplay = stats?.live_markets ?? 1247;
  const analysisDisplay = stats?.avg_analysis_time ?? "98ms";

  return (
    <>
      <style>{css}</style>

      <div className="scroll-progress">
        {SECTIONS.map((id, i) => (
          <div key={id} className={`sp-pip ${activeSection === i ? "active" : ""}`} onClick={() => scrollTo(id)} />
        ))}
      </div>

      <section id="s0">
        <span className="land-paw"><img src="/reddog-removebg-preview.png" alt="" /></span>
        <div className="land-title">Do you <em>trust</em><br />that bet?</div>
        <div className="land-sub">We analyze prediction market trades with statistical models to identify high-performing wallets, detect manipulation, and extract real predictive signals, simplifying the noise so you know when to lean in and when to walk away.</div>
        <button type="button" className="land-cta" onClick={onBrowseMarkets}>Browse Markets →</button>
        <div className="land-stats">
          <div className="lstat"><div className="lstat-val">{volumeDisplay}</div><div className="lstat-lab">Volume Tracked</div></div>
          <div style={{ width: "1px", background: "var(--border2)" }} />
          <div className="lstat"><div className="lstat-val">{typeof marketsDisplay === "number" ? marketsDisplay.toLocaleString() : marketsDisplay}</div><div className="lstat-lab">Live Markets</div></div>
          <div style={{ width: "1px", background: "var(--border2)" }} />
          <div className="lstat"><div className="lstat-val">{analysisDisplay}</div><div className="lstat-lab">Avg Analysis</div></div>
        </div>
        <button type="button" className="dn-arrow hero-arrow" onClick={() => scrollTo("s-intro")}>
          <span className="dn-arrow-lbl">see how it works</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s-intro">
        <div className="intro-grid">
          <div className="intro-left reveal">
            <div className="eyebrow">How it works</div>
            <div className="intro-headline">We follow the <em>money</em>,<br />so you don&apos;t have to.</div>
            <div className="intro-body">Option 1 (clean + smooth)
Every market has a number. Behind it are real wallets making real bets. We track the biggest dawgs — the traders with the strongest historical performance — decode what they believe, and turn it into clear, actionable insights.</div>

          </div>
          <div className="signal-path reveal">
            {[
              { Icon: Activity, label: "Fetch every trade" },
              { Icon: Wallet, label: "Size up each wallet" },
              { Icon: Trophy, label: "Find the winners" },
              { Icon: Brain, label: "Check smart money lean" },
              { Icon: BarChart3, label: "Measure agreement" },
            ].map((node, i) => {
              const isLit = litNodes.includes(i) || i === 0;
              return (
                <div key={i}>
                  <div className={`sp-node ${isLit ? "lit" : ""}`}>
                    <div className="sp-node-dot" style={{ color: isLit ? "#b9f751" : "#8888a0" }}>
                      <node.Icon size={18} strokeWidth={2} stroke="currentColor" style={{ flexShrink: 0 }} />
                    </div>
                    <div className="sp-node-label">{node.label}</div>
                    <div className="sp-node-num">0{i + 1}</div>
                  </div>
                  {i < 4 && (
                    <div className={`sp-wire ${isLit ? "lit" : ""}`}>
                      {isLit && <div className="sp-wire-pulse" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button type="button" className="dn-arrow" onClick={() => scrollTo("s1")}>
          <span className="dn-arrow-lbl">step 1</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s1">
        <div className="eyebrow reveal">Step 1 of 5</div>
        <div className="step-headline reveal">We pull every <em>trade</em>.</div>
        <div className="step-body reveal">Every wallet. Every transaction. We stream the full history directly from Polymarket&apos;s API — who bought, who sold, at what price, and when. No trades, no signal.</div>
        <div className="feed-panel reveal">
          <div className="feed-bar">
            <div className="feed-bar-left">
              <div className="fdot fdot-r" /><div className="fdot fdot-y" /><div className="fdot fdot-g" />
              <span className="feed-title">polymarket_feed</span>
            </div>
            <div className="feed-live">
              <div className="feed-live-dot" />
              <span className="feed-live-lbl">LIVE</span>
            </div>
          </div>
          <div className="feed-counter">
            <div className="feed-counter-num">{counter}</div>
            <div className="feed-counter-label">trades loaded</div>
          </div>
          <div className="feed-rows">
            {feedRows.map((row, i) => (
              <div className="feed-row" key={i} style={{ opacity: 1 - i * 0.1 }}>
                <div className="feed-wallet">{row.w}</div>
                <div className="feed-price">{row.p.toFixed(2)}</div>
                <div className="feed-size">${(row.s / 1000).toFixed(1)}k</div>
                <div className={`feed-side ${row.b ? "buy" : "sell"}`}>{row.b ? "BUY" : "SELL"}</div>
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="dn-arrow" onClick={() => scrollTo("s2")}>
          <span className="dn-arrow-lbl">step 2</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s2">
        <div className="eyebrow reveal">Step 2 of 5</div>
        <div className="step-headline reveal">We build a <em>wallet index</em>.</div>
        <div className="step-body reveal">Every wallet that touched a given market gets profiled. We pull their full trading history across all markets: win rate, ROI, volume, consistency. This is how we separate the top-performers from the noise before we weight anyone&apos;s position.</div>
        <div className="dossier-grid reveal">
          {DOSSIER_WALLETS.map((w, i) => {
            const tierMap: Record<string, { label: string; cls: string }> = { sharp: { label: "Sharp", cls: "tier-sharp" }, casual: { label: "Casual", cls: "tier-casual" }, noise: { label: "Noise", cls: "tier-noise" } };
            const { label, cls } = tierMap[w.tier];
            const roiColor = w.stats.roi.startsWith("+") ? "lime" : "red";
            return (
              <div key={i} className={`dossier-card ${w.tier}`}>
                <div className="dossier-header">
                  <Identicon seed={w.addr} size={38} color={w.color} />
                  <div className="dossier-info">
                    <div className="dossier-addr">{w.addr}</div>
                    <div className={`dossier-tier ${cls}`}>{label}</div>
                  </div>
                </div>
                <div className="dossier-stats">
                  <div><div className={`dstat-val ${roiColor}`}>{w.stats.roi}</div><div className="dstat-lbl">Avg ROI</div></div>
                  <div><div className="dstat-val lime">{w.stats.winRate}</div><div className="dstat-lbl">Win Rate</div></div>
                  <div><div className="dstat-val text">{w.stats.markets}</div><div className="dstat-lbl">Markets</div></div>
                  <div><div className="dstat-val blue">{w.stats.volume}</div><div className="dstat-lbl">Volume</div></div>
                </div>
                <div className="sparkline-lbl">P&L History<span className="sparkline-unit">ROI %</span></div>
                <div className="sparkline-wrap">
                  <Sparkline data={w.sparkData} color={w.color} height={90} />
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="dn-arrow" onClick={() => scrollTo("s3")}>
          <span className="dn-arrow-lbl">step 3</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s3">
        <div className="eyebrow reveal">Step 3 of 5</div>
        <div className="step-headline reveal">We find the <em>winners</em>.</div>
        <div className="step-body reveal">We identify the users/wallets involved in the current market that historically have the highest 
          perfomance, looking at metrics like average ROI, volume, and experience. <br></br> <br></br>Users that pass a certain threshold
           of success are deemed "Smart Wallets". These are the BIG DAWGS we want to pay close attention to in order to mimic!</div>

        <div className="reveal" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <BarChart />
        </div>

        <div className="threshold-note reveal">
          <span className="threshold-dot" />
          Dashed line = 15% threshold — wallets that cross earn weighted signal
        </div>

        <button type="button" className="dn-arrow" style={{ marginTop: "32px" }} onClick={() => scrollTo("s4")}>
          <span className="dn-arrow-lbl">step 4</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s4">
        <div className="s4-bg-lime" /><div className="s4-bg-red" />
        <div className="eyebrow reveal">Step 4 of 5</div>
        <div className="step-headline reveal">We check where <em>smart wallets</em> stands.</div>
        <div className="step-body reveal">We analyze the threshold-passing top/smart wallets and see their stances on a given market. Their average entry price becomes the lean percentage.</div>
        <div className="gauge-wrap reveal">
          <div className="gauge-card">
            <div className="gauge-svg-wrap">
              <GaugeSVG pct={gaugeAnimated ? 68 : 0} animated={gaugeAnimated} />
              <div className="gauge-label-no">NO</div>
              <div className="gauge-label-yes">YES</div>
            </div>
            <div className="gauge-pct">68%</div>
            <div className="gauge-verdict">Leaning YES</div>
            <div className="gauge-wallets">
              {["y", "y", "y", "n", "y"].map((s, i) => (
                <div key={i} className={`gw-dot ${s}`} style={{ animationDelay: `${i * 0.12}s` }}>
                  {i + 1}
                  <div className={`gw-tag ${s}`}>{s.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div className="gauge-note">4 of 5 top wallets are net YES. Avg entry: 68¢.</div>
          </div>
        </div>
        <button type="button" className="dn-arrow" onClick={() => scrollTo("s5")}>
          <span className="dn-arrow-lbl">step 5</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s5">
        <Starfield count={70} />
        <div className="eyebrow reveal">Step 5 of 5</div>
        <div className="step-headline reveal">We measure how much they <em>agree</em>.</div>
        <div className="step-body reveal">We measure the converence of these smart wallets in the current market. If these smart wallets tend to converge on similar trades, we can take similar actions. <br></br> <br></br>Otherwise, we know to be wary and to take into account other information before making a decision.</div>
        <div className="constellation-wrap reveal">
          <div className="constellation-label">Smart Wallet belief distribution (% YES)</div>
          <ConstellationSVG />
          <div className="div-levels">
            <div className="div-lvl lo"><div className="div-lvl-n">Low spread</div><div className="div-lvl-d">Cluster together. Signal is clean.</div></div>
            <div className="div-lvl md"><div className="div-lvl-n">Medium</div><div className="div-lvl-d">Some spread. Signal has noise.</div></div>
            <div className="div-lvl hi"><div className="div-lvl-n">High spread</div><div className="div-lvl-d">Wide split. Signal is contested.</div></div>
          </div>
        </div>
        <button type="button" className="dn-arrow" onClick={() => scrollTo("s-final")}>
          <span className="dn-arrow-lbl">that&apos;s it</span>
          <span className="dn-arrow-icon">↓</span>
        </button>
      </section>

      <section id="s-final">
        <div className="final-title reveal">Now you know.<br />Follow the <em>big dawgs.</em></div>
        <div className="final-sub reveal">Pick a market, run the analysis, see exactly where smart money stands.</div>
        <button type="button" className="land-cta reveal" onClick={onBrowseMarkets}>Browse Markets →</button>
      </section>
    </>
  );
}
