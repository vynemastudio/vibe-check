// Render scene.html frame by frame to out.mp4. MIT License (c) 2026 Vynema Studio.
// npm i playwright && npx playwright install chromium ; needs ffmpeg on PATH
// node render.mjs [seconds=4] [fps=30]
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
const secs = +(process.argv[2] || 4), fps = +(process.argv[3] || 30);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', 'out.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + path.resolve('scene.html'));
await page.waitForFunction(() => window.ready);
for (let i = 0; i < secs * fps; i++) {
  await page.evaluate(t => window.frame(t), i / fps);          // frame time, not wall-clock time
  const png = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end(); await browser.close();
await new Promise(r => ff.on('close', r)); console.log('wrote out.mp4');
