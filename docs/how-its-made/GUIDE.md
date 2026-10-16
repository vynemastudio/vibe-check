# How this video was made: a 30-second 3D explainer built entirely in code

A short, cinematic engineering explainer (1080×1920, 30 fps) with no stock footage, no video editor, and only free, open-source tools. Everything is deterministic: the same code renders the same frames every time.

## The pipeline
1. **Script → voice.** A short script, one clause per line, voiced with **Kokoro TTS** (open-weights, voice `af_heart`, ~195 words per minute). Silences between lines are trimmed to ~100 ms by deleting silent samples, so pitch never changes. Deliberate pauses are added before big moments (an impact, a landing).
2. **Word timing.** **faster-whisper** transcribes each line with word timestamps, and the timings are matched back to the script spelling. That drives the kinetic captions (current word highlighted).
3. **3D scenes in three.js.** An original low-poly car, a curved loop ramp, airflow particles, a pressure-field shader, force arrows, cold-gas thruster plumes, a dust burst and keyframed camera moves. Every object's state is a pure function of time `t`, so any frame can be rendered on its own.
4. **Frame-by-frame render.** **Playwright** drives headless Chromium. For each frame it calls `window.frame(t)` and pipes the image into **ffmpeg** (H.264). Motion blur is three sub-frames averaged per frame on fast shots. Rendering is split across 8 parallel workers.
5. **Sound design in numpy.** Whooshes (band-passed noise with a sine envelope), fan whine (stacked harmonics on a rising pitch), gas hiss (high-passed noise), impacts (pitch-dropping sine plus a noise crack), and a 124 bpm pulse bed that ducks under the voice. Every sound is placed at the same beat times the visuals use.
6. **Master.** Two-pass ffmpeg `loudnorm` to **−14 LUFS** integrated, then an oversampled limiter for a true peak under −1 dBTP (the usual target for Reels and Shorts).
7. **QA.** ffmpeg `blackdetect` and `freezedetect`, an `ebur128` loudness check, and a 16-frame contact sheet.

## Steps to make your own
1. Pick a topic and **verify every fact** against 2-3 sources. Write the numbers down in a sources file before writing the script.
2. Write a 60-80 word script with one idea every 2-3 seconds and a hook in the first line.
3. Storyboard beats as a table: time, picture, on-screen text, voice-over.
4. Build reusable components first (vehicle, environment, effects, camera), then compose scenes around the beat times.
5. Render a **low-res preview** of the hook and the hardest shot, critique it with the sound off, and fix it.
6. Render the full film, add sound, master, run QA, export a smaller share copy.

## Example prompts (for Claude Code, Cursor or Codex)
- "Write a three.js function `Vehicle3D()` that builds an original low-poly wedge sports car from an extruded side profile, with flat-shaded metallic paint, 4 wheels, and an `update({t, xray})` method that turns the shell translucent and shows lime blueprint edges."
- "Make a `CurvedRamp({R, run, ceil})`: a flat run-in, a half loop of radius R and an inverted ceiling section. Return `at(s)` giving position, tangent and up vector at arc length s, so objects can be posed on it."
- "Create a deterministic particle airflow: particles flow from a car's side skirts toward 4 fan positions under the rear, then out the back. Position must be a pure function of time."
- "Write a Playwright script that loads `scene.html`, calls `window.frame(t)` for every frame at 30 fps, and pipes JPEGs into ffmpeg as H.264. Support splitting the frame range across N parallel workers."
- "In numpy, synthesise a whoosh, a fan whine, a gas hiss and a bass impact, place them at given timestamps, add a pulse bed that ducks under a voice track, and write a 48 kHz WAV."
- "Normalise this mix to −14 LUFS with true peak below −1 dBTP using two-pass ffmpeg loudnorm."

## Tools (all free)
three.js (MIT) · Playwright · Chromium · Kokoro TTS · faster-whisper · numpy/scipy · ffmpeg

*Made by Vynema Studio. Fan-made explainers are independent and not affiliated with the companies shown.*

## Minimal example
See [`example/`](example/): a tiny deterministic three.js scene (`scene.html`) and a Playwright + ffmpeg frame renderer (`render.mjs`). MIT licensed.

## Other tools we tested
| Tool | Best for | Trade-off |
|---|---|---|
| three.js + Playwright (this guide) | 3D, UI, captions; our default | Stylised, not photoreal |
| Blender (Cycles) | Photoreal hero shots, product turntables | Slow on CPU: keep to 1–3 s inserts |
| Remotion + React Three Fiber | Templated reels, batch variants | Paid licence for companies of more than 3 people |
| Motion Canvas | 2D vector and code animations | Rendering headless needs workarounds |
| Manim | Charts, equations, diagrams | 2D-first |
| PyVista / Taichi | Engineering heatmaps, particle and fluid plates | Scientific look, so composite it |
| Godot Movie Maker | Physics-driven, game-like 3D | Needs a GL context to render |

*The Roadster video is an independent, fan-made explainer, not affiliated with or endorsed by Tesla or SpaceX. The car is an original illustrative model, not the real vehicle.*
