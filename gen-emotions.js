'use strict';

const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT_DIR = path.join(__dirname, 'emotions');

function wavHeader(dataSize) {
  const b = Buffer.alloc(44);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataSize, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36);
  b.writeUInt32LE(dataSize, 40);
  return b;
}

function ev(t, dur, ar, rr) {
  return Math.min(1, t * ar) * Math.min(1, (dur - t) * rr);
}

function sine(freq, dur, amp, ar = 20, rr = 20) {
  const n = Math.floor(SR * dur), s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = Math.round(Math.sin(2 * Math.PI * freq * t) * amp * ev(t, dur, ar, rr) * 32767);
  }
  return s;
}

function sweep(f0, f1, dur, amp, ar = 12, rr = 8) {
  const n = Math.floor(SR * dur), s = new Int16Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (f0 + (f1 - f0) * (t / dur))) / SR;
    s[i] = Math.round(Math.sin(ph) * amp * ev(t, dur, ar, rr) * 32767);
  }
  return s;
}

function vib(f, dur, amp, depth, rate, ar = 12, rr = 8) {
  const n = Math.floor(SR * dur), s = new Int16Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (f + depth * Math.sin(2 * Math.PI * rate * t))) / SR;
    s[i] = Math.round(Math.sin(ph) * amp * ev(t, dur, ar, rr) * 32767);
  }
  return s;
}

function trill(f1, f2, dur, amp, rate, ar = 8, rr = 6) {
  const n = Math.floor(SR * dur), s = new Int16Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = (Math.sin(2 * Math.PI * rate * t) > 0) ? f1 : f2;
    ph += (2 * Math.PI * freq) / SR;
    s[i] = Math.round(Math.sin(ph) * amp * ev(t, dur, ar, rr) * 32767);
  }
  return s;
}

function sil(ms) { return new Int16Array(Math.floor(SR * ms / 1000)); }

function save(filename, ...segs) {
  const total = segs.reduce((a, s) => a + s.length, 0);
  const out = new Int16Array(total);
  let off = 0;
  for (const s of segs) { out.set(s, off); off += s.length; }
  const db = Buffer.alloc(out.length * 2);
  for (let i = 0; i < out.length; i++) db.writeInt16LE(out[i], i * 2);
  fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.concat([wavHeader(db.length), db]));
  process.stdout.write('  ' + filename + '\n');
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── SESSION START: Awakening — "I'm alive!" ───────────────────────────────
// 1: WALL-E-style sweep to life + vibrato + answering note
save('session_start_1.wav',
  sweep(98, 784, 0.55, 0.72, 10, 5),
  vib(784, 0.48, 0.70, 30, 5, 15, 10),
  sil(18), sine(659, 0.14, 0.58, 30, 20));

// 2: ascending arpeggio C-E-G-C + excited vibrato
save('session_start_2.wav',
  sine(523,0.07,0.68,80,70), sil(10),
  sine(659,0.07,0.72,80,70), sil(10),
  sine(784,0.07,0.75,80,70), sil(10),
  sine(1047,0.08,0.78,80,70), sil(12),
  vib(1047, 0.42, 0.75, 28, 6, 50, 10));

// 3: motor startup sweep + two cheerful confirmation beeps
save('session_start_3.wav',
  sweep(55, 440, 0.70, 0.50, 2, 12),
  sine(440, 0.08, 0.68, 100, 80), sil(22),
  sine(523, 0.10, 0.72, 100, 80));

// 4: quick scale run + vibrato landing
save('session_start_4.wav',
  sine(523,0.05,0.65,150,120), sil(5),
  sine(587,0.05,0.67,150,120), sil(5),
  sine(659,0.05,0.69,150,120), sil(5),
  sine(784,0.05,0.72,150,120), sil(5),
  sine(988,0.05,0.74,150,120), sil(8),
  vib(1175, 0.38, 0.72, 22, 5, 60, 10));

// 5: three rising chirps + triumphant sweep to peak
save('session_start_5.wav',
  sine(523,0.08,0.65,100,80), sil(15),
  sine(659,0.08,0.68,100,80), sil(15),
  sine(880,0.08,0.72,100,80), sil(15),
  sweep(880, 1318, 0.22, 0.70, 30, 12),
  vib(1318, 0.32, 0.70, 20, 7, 50, 10));

// ── PROMPT: Attention — "Listening" ──────────────────────────────────────
// 1: soft sustained attentive vibrato note
save('prompt_1.wav',
  vib(659, 0.24, 0.50, 12, 4, 20, 15));

// 2: gentle two-note acknowledgment
save('prompt_2.wav',
  sine(523, 0.10, 0.48, 40, 30), sil(18),
  sine(659, 0.20, 0.50, 30, 15));

// 3: soft rising question sweep
save('prompt_3.wav',
  sweep(523, 659, 0.24, 0.48, 20, 14));

// 4: subtle ping + soft listening vibrato
save('prompt_4.wav',
  sine(784, 0.06, 0.54, 150, 120), sil(15),
  vib(659, 0.28, 0.46, 14, 4, 18, 12));

// 5: delicate questioning trill
save('prompt_5.wav',
  trill(523, 587, 0.30, 0.46, 8, 10, 8));

// ── BASH: Determination — "Doing it" ─────────────────────────────────────
// 1: mechanical triple beep building up (like terminal_open, purposeful)
save('bash_1.wav',
  sine(440, 0.06, 0.65, 120, 90), sil(15),
  sine(554, 0.06, 0.68, 120, 90), sil(15),
  sine(659, 0.14, 0.70, 80, 20));

// 2: decisive single forward-drive sweep
save('bash_2.wav',
  sweep(330, 659, 0.20, 0.65, 20, 14));

// 3: three sharp staccato notes (ready, set, go)
save('bash_3.wav',
  sine(659, 0.07, 0.72, 120, 100), sil(20),
  sine(659, 0.07, 0.74, 120, 100), sil(20),
  sine(784, 0.14, 0.76, 100, 20));

// 4: purposeful ascending double note
save('bash_4.wav',
  sine(523, 0.10, 0.65, 60, 50), sil(14),
  sweep(523, 880, 0.26, 0.68, 20, 10));

// 5: electric ignition — fast sweep + affirmation beep
save('bash_5.wav',
  sweep(196, 784, 0.22, 0.65, 8, 10),
  sine(784, 0.08, 0.68, 80, 80), sil(8),
  sine(880, 0.12, 0.70, 60, 20));

// ── WRITE: Creation — "Creating" ─────────────────────────────────────────
// 1: building arpeggio (placing blocks) + vibrato
save('write_1.wav',
  sine(523,0.08,0.62,70,60), sil(12),
  sine(659,0.08,0.64,70,60), sil(12),
  sine(784,0.08,0.66,70,60), sil(12),
  vib(1047, 0.32, 0.66, 18, 5, 40, 10));

// 2: creative flowing sweep + warm vibrato
save('write_2.wav',
  sweep(392, 784, 0.40, 0.60, 8, 12),
  vib(784, 0.30, 0.58, 20, 4, 15, 10));

// 3: harmonious phrase C-G-E-C (constructive)
save('write_3.wav',
  sine(523,0.09,0.60,60,50), sil(10),
  sine(784,0.09,0.62,60,50), sil(10),
  sine(659,0.09,0.64,60,50), sil(10),
  vib(1047, 0.32, 0.64, 16, 5, 40, 10));

// 4: thoughtful layered vibrato (warm, crafting)
save('write_4.wav',
  vib(523, 0.18, 0.56, 14, 3, 15, 12), sil(10),
  vib(784, 0.32, 0.60, 18, 4, 15, 10));

// 5: creative trill + melodic resolution
save('write_5.wav',
  trill(523, 659, 0.30, 0.56, 7, 8, 6), sil(10),
  vib(784, 0.30, 0.62, 20, 5, 20, 10));

// ── READ: Curiosity — "Looking" ──────────────────────────────────────────
// 1: questioning upward sweep (tilting head)
save('read_1.wav',
  sweep(392, 587, 0.28, 0.52, 18, 14));

// 2: two soft curious notes + rising tail
save('read_2.wav',
  sine(523, 0.10, 0.48, 40, 35), sil(22),
  sweep(523, 659, 0.22, 0.50, 18, 14));

// 3: inquisitive three-note bounce upward
save('read_3.wav',
  sine(659, 0.08, 0.50, 60, 50), sil(18),
  sine(784, 0.08, 0.52, 60, 50), sil(18),
  sweep(784, 988, 0.20, 0.50, 25, 14));

// 4: wondering vibrato note (soft curiosity)
save('read_4.wav',
  vib(587, 0.32, 0.48, 20, 5, 14, 10));

// 5: exploring double-sweep phrase
save('read_5.wav',
  sweep(523, 659, 0.15, 0.48, 20, 20), sil(15),
  sweep(659, 784, 0.22, 0.50, 20, 14));

// ── DONE: Satisfaction — "It worked!" ────────────────────────────────────
// 1: three happy ascending beeps + vibrato (clean success)
save('done_1.wav',
  sine(659,0.08,0.65,90,70), sil(12),
  sine(784,0.08,0.68,90,70), sil(12),
  sine(988,0.08,0.70,90,70), sil(12),
  vib(1175, 0.28, 0.68, 15, 5, 60, 10));

// 2: sweep to resolution + warm vibrato (tension → relief)
save('done_2.wav',
  sweep(523, 784, 0.22, 0.62, 14, 10),
  sil(8), vib(784, 0.36, 0.64, 18, 4, 20, 12));

// 3: satisfying double note landing
save('done_3.wav',
  sine(784, 0.10, 0.65, 60, 50), sil(14),
  vib(988, 0.32, 0.66, 16, 4, 30, 12));

// 4: gentle arpeggio + warm vibrato (soft satisfaction)
save('done_4.wav',
  sine(523,0.07,0.60,80,70), sil(8),
  sine(659,0.07,0.62,80,70), sil(8),
  vib(784, 0.38, 0.64, 20, 5, 30, 10));

// 5: melodic happy sigh — rise then gentle descent + hum
save('done_5.wav',
  sine(784, 0.08, 0.62, 80, 70), sil(14),
  sine(988, 0.08, 0.65, 80, 70), sil(18),
  sweep(988, 784, 0.32, 0.60, 10, 5),
  sine(784, 0.20, 0.56, 12, 6));

// ── STOP: Joy — "Here you go!" ────────────────────────────────────────────
// 1: triumphant full arpeggio C-E-G-C + soaring vibrato
save('stop_1.wav',
  sine(523,0.07,0.68,80,70), sil(10),
  sine(659,0.07,0.72,80,70), sil(10),
  sine(784,0.07,0.75,80,70), sil(10),
  sine(1047,0.07,0.78,80,70), sil(12),
  vib(1318, 0.40, 0.75, 25, 6, 50, 10));

// 2: joyful melodic phrase with return (E-G-B-G-C)
save('stop_2.wav',
  sine(659,0.08,0.68,80,70), sil(10),
  sine(784,0.08,0.70,80,70), sil(10),
  sine(988,0.08,0.72,80,70), sil(10),
  sine(784,0.08,0.70,80,70), sil(10),
  vib(1047, 0.36, 0.72, 22, 7, 50, 10));

// 3: mini-fanfare — motor sweep to peak + vibrato + answer
save('stop_3.wav',
  sweep(196, 880, 0.38, 0.68, 10, 6),
  vib(880, 0.40, 0.66, 28, 6, 20, 10),
  sil(18), sine(784, 0.14, 0.58, 30, 20));

// 4: rapid ascending chord run + held peak
save('stop_4.wav',
  sine(523,0.06,0.68,120,100), sil(6),
  sine(659,0.06,0.70,120,100), sil(6),
  sine(784,0.06,0.72,120,100), sil(6),
  sine(988,0.06,0.74,120,100), sil(6),
  sine(1175,0.06,0.76,120,100), sil(10),
  vib(1318, 0.35, 0.74, 22, 7, 80, 10));

// 5: sweeping delivery + ringing final note
save('stop_5.wav',
  sweep(330, 1047, 0.32, 0.70, 12, 8),
  vib(1047, 0.28, 0.68, 20, 5, 20, 10),
  sil(14), sine(880, 0.18, 0.60, 25, 15));

// ── NOTIFY: Alertness — "Hey!" ────────────────────────────────────────────
// 1: sharp ping + assertive follow note
save('notify_1.wav',
  sine(988, 0.06, 0.78, 200, 100), sil(25),
  sine(784, 0.18, 0.70, 80, 20));

// 2: double alert beep escalating
save('notify_2.wav',
  sine(880, 0.07, 0.76, 150, 100), sil(35),
  sine(880, 0.07, 0.78, 150, 100), sil(35),
  sine(1047, 0.20, 0.80, 100, 15));

// 3: urgent three-note ascending call
save('notify_3.wav',
  sine(784, 0.06, 0.74, 120, 100), sil(14),
  sine(880, 0.06, 0.76, 120, 100), sil(14),
  sine(988, 0.16, 0.78, 100, 20));

// 4: sharp attention sweep (HEY!) + vibrato
save('notify_4.wav',
  sweep(523, 1047, 0.16, 0.75, 20, 14),
  vib(1047, 0.24, 0.72, 20, 6, 30, 10));

// 5: single assertive call + descending echo
save('notify_5.wav',
  sine(988, 0.08, 0.80, 180, 80), sil(40),
  sine(784, 0.06, 0.68, 120, 100), sil(25),
  sine(659, 0.14, 0.60, 80, 20));

process.stdout.write('\nDone! 40 emotions written to ' + OUT_DIR + '\n');
