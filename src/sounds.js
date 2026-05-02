'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SR = 44100;
const SOUNDS_DIR = process.env.WALLE_SOUNDS_DIR ||
  path.join(os.homedir(), 'Library', 'Application Support', 'wall-e', 'sounds');

// ── WAV primitives ────────────────────────────────────────────────────────────

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
  fs.writeFileSync(path.join(SOUNDS_DIR, filename), Buffer.concat([wavHeader(db.length), db]));
}

// ── 56 unique sounds, one per event ──────────────────────────────────────────

function gen() {

  // NETWORK
  // net_lost: два нисходящих грустных бипа
  save('net_lost.wav',      sine(587,0.12,0.65,30,20), sil(40), sine(440,0.28,0.58,15,6));
  // net_ok: три восходящих радостных чирика
  save('net_ok.wav',        sine(523,0.07,0.62,100,80), sil(12), sine(659,0.07,0.66,100,80), sil(12), sine(880,0.07,0.70,100,80), sil(12), vib(880,0.22,0.68,15,6,60,10));

  // SYSTEM LOAD
  // cpu_hot: 4 эскалирующих стаккато-бипа (нарастающая тревога)
  save('cpu_hot.wav',       sine(698,0.07,0.65,120,100), sil(20), sine(783,0.07,0.70,120,100), sil(20), sine(987,0.07,0.75,120,100), sil(20), sine(1174,0.18,0.82,120,20));
  // ram_full: 3 бипа одинаковой высоты — пульсирующее предупреждение
  save('ram_full.wav',      sine(659,0.09,0.72,80,60), sil(60), sine(659,0.09,0.74,80,60), sil(60), sine(659,0.22,0.78,80,15));
  // cpu_temp: медленные двойные пульсы — жара
  save('cpu_temp.wav',      vib(440,0.18,0.68,12,3,20,15), sil(90), vib(440,0.18,0.70,20,15), sil(90), vib(440,0.38,0.68,12,3,20,8));

  // SCREEN
  // screen_lock: прощальная нота → длинное нисходящее затухание
  save('screen_lock.wav',   sine(330,0.12,0.52,40,25), sil(15), sweep(330,110,0.78,0.50,8,2), sine(110,0.38,0.22,4,1));
  // screen_unlock: 2.5-октавный взлёт "ЕВА!" + вибрато + ответ
  save('screen_unlock.wav', sweep(98,784,0.55,0.72,10,5), vib(784,0.48,0.68,30,5,15,10), sil(18), sine(659,0.13,0.58,30,20));

  // USB
  // usb_in: вопросительный наклон — оседание + вопросительный взлёт
  save('usb_in.wav',        sine(392,0.13,0.60,30,25), sil(18), sweep(392,587,0.28,0.64,20,12), sil(35), sine(494,0.11,0.55,40,30));
  // usb_out: двойное нисходящее «пока»
  save('usb_out.wav',       sine(494,0.11,0.55,40,35), sil(25), sine(392,0.22,0.48,20,8));

  // DISPLAY
  // display_in: торжественное арпеджио C-E-G-C (монитор!)
  save('display_in.wav',    sine(523,0.09,0.65,60,50), sil(14), sine(659,0.09,0.68,60,50), sil(14), sine(784,0.09,0.70,60,50), sil(14), vib(1047,0.32,0.68,20,6,40,10));
  // display_out: E5→C5 «прощай экран»
  save('display_out.wav',   sine(659,0.14,0.62,30,25), sil(28), sine(523,0.26,0.55,18,7));

  // BLUETOOTH
  // bt_in: лёгкое беспроводное соединение F5→A5
  save('bt_in.wav',         sine(698,0.10,0.60,60,50), sil(18), vib(880,0.28,0.64,12,5,50,12));
  // bt_out: A5→F5 — разрыв соединения
  save('bt_out.wav',        sine(880,0.10,0.56,50,40), sil(18), sine(698,0.24,0.50,18,7));

  // CHARGER
  // charger_in: электрическое удовлетворение — быстрый дуэт + выдержанная нота
  save('charger_in.wav',    sine(440,0.06,0.62,120,90), sine(659,0.06,0.66,120,90), sil(10), sine(880,0.30,0.68,60,12));
  // charger_out: обеспокоенный взгляд — нота + тревожное вибрато
  save('charger_out.wav',   sine(523,0.13,0.60,30,20), sil(18), vib(440,0.48,0.56,22,8,14,6));

  // BATTERY — нарастающая паника
  // bat_100: максимальный восторг — гамма + трель + вибрато
  save('bat_100.wav',
    sine(523,0.06,0.70,80,70), sil(8), sine(659,0.06,0.72,80,70), sil(8),
    sine(784,0.06,0.74,80,70), sil(8), sine(1047,0.06,0.76,80,70), sil(8),
    sine(1318,0.06,0.78,80,70), sil(8),
    sine(1318,0.06,0.78,90,80), sil(10), sine(1047,0.06,0.76,90,80), sil(10),
    sine(1318,0.06,0.78,90,80), sil(10), sine(1047,0.06,0.76,90,80), sil(10),
    vib(1318,0.50,0.74,55,9,60,8));
  // bat_20: лёгкое беспокойное дрожание
  save('bat_20.wav',        trill(392,415,0.70,0.56,10,7,5));
  // bat_15: дрожание чуть быстрее + нисходящий хвост
  save('bat_15.wav',        trill(392,415,0.65,0.58,13,7,5), sweep(392,330,0.28,0.50,8,3));
  // bat_10: три одинаковых предупреждающих бипа
  save('bat_10.wav',        sine(698,0.09,0.74,80,60), sil(55), sine(698,0.09,0.76,80,60), sil(55), sine(698,0.22,0.78,80,15));
  // bat_5: паника начинается — 5 ускоряющихся нот
  save('bat_5.wav',
    sine(523,0.08,0.68,100,90), sil(170), sine(587,0.08,0.70,100,90), sil(110),
    sine(659,0.08,0.73,100,90), sil(65), sine(740,0.08,0.76,100,90), sil(28),
    vib(784,0.22,0.80,30,13,100,8));
  // bat_4: быстрее и выше
  save('bat_4.wav',
    sine(587,0.07,0.70,120,100), sil(130), sine(659,0.07,0.73,120,100), sil(80),
    sine(740,0.07,0.76,120,100), sil(40), sine(880,0.07,0.80,120,100), sil(15),
    vib(987,0.22,0.84,35,14,120,8));
  // bat_3: 6 нот, ещё быстрее
  save('bat_3.wav',
    sine(523,0.07,0.72,120,100), sil(100), sine(587,0.07,0.75,120,100), sil(65),
    sine(659,0.07,0.78,120,100), sil(38), sine(740,0.07,0.80,120,100), sil(18),
    sine(880,0.07,0.83,120,100), sil(8), vib(987,0.24,0.86,40,15,120,8));
  // bat_2: 7 нот максимальная паника
  save('bat_2.wav',
    sine(440,0.07,0.72,150,120), sil(80), sine(494,0.07,0.75,150,120), sil(52),
    sine(523,0.07,0.77,150,120), sil(32), sine(587,0.07,0.79,150,120), sil(18),
    sine(659,0.07,0.81,150,120), sil(8), sine(784,0.07,0.84,150,120), sil(4),
    vib(987,0.26,0.87,45,16,150,8));
  // bat_1: умирает — быстрые биты потом резкое затухание-стон
  save('bat_1.wav',
    sine(659,0.05,0.82,200,150), sil(5), sine(784,0.05,0.84,200,150), sil(5),
    sine(987,0.05,0.86,200,150), sil(5), sine(784,0.05,0.83,200,150), sil(5),
    sine(659,0.05,0.80,200,150), sil(5),
    sweep(659,98,0.90,0.55,5,1), sine(98,0.35,0.20,3,1));

  // SLEEP/WAKE
  // wake: раскрутка мотора → два подтверждающих бипа
  save('wake.wav',          sweep(55,330,0.85,0.48,2,10), sine(330,0.09,0.62,120,100), sil(28), sine(392,0.09,0.65,120,100));

  // STORAGE
  // disk_low: обеспокоенное мычание в среднем регистре
  save('disk_low.wav',      vib(349,0.90,0.58,25,6,6,5));
  // idle_long: три тихих зова с долгими паузами — одиноко
  save('idle_long.wav',     sine(330,0.20,0.42,6,6), sine(262,0.32,0.38,5,4), sil(700), sine(311,0.16,0.37,6,5), sine(247,0.28,0.34,5,4), sil(700), sine(294,0.16,0.32,5,4), sine(220,0.45,0.28,4,2));
  // app_crash: испуг — внезапный пик + хаотичное падение
  save('app_crash.wav',     sine(1047,0.04,0.88,200,60), sweep(1047,130,0.26,0.80,200,10), sil(20), sine(659,0.06,0.72,100,100), sil(25), sine(494,0.06,0.68,100,100), sil(25), sine(330,0.12,0.62,60,20));

  // NETWORK DETAILS
  // vpn_on: тихий таинственный — два низких тона
  save('vpn_on.wav',        sine(293,0.13,0.46,18,14), sil(65), sine(220,0.22,0.42,14,9));
  // vpn_off: выход из тени — восходящий раскрыв
  save('vpn_off.wav',       sweep(220,523,0.32,0.55,10,15), sine(523,0.16,0.58,20,14));
  // wifi_new: быстрый двойной вопрос о новой сети
  save('wifi_new.wav',      sine(659,0.08,0.62,80,70), sil(25), sweep(523,659,0.24,0.60,20,14));
  // ip_new: подозрительное нисходящее — «хм, странно»
  save('ip_new.wav',        sine(784,0.12,0.62,40,30), sil(40), sweep(659,440,0.32,0.58,14,9));

  // DOWNLOADS & FILES
  // dl_done: три светлых восходящих бипа — «готово!»
  save('dl_done.wav',       sine(659,0.08,0.65,90,70), sil(12), sine(784,0.08,0.68,90,70), sil(12), sine(988,0.08,0.70,90,70), sil(12), vib(1175,0.28,0.68,15,5,60,10));
  // big_file: восхищённый подъём — «вау, огромный!»
  save('big_file.wav',      sweep(196,880,0.42,0.62,7,12), vib(880,0.22,0.60,20,6,18,10));
  // desk_mess: нарастающее переполнение — повторяющийся бип ускоряется
  save('desk_mess.wav',     sine(523,0.08,0.60,60,50), sil(50), sine(523,0.08,0.62,60,50), sil(35), sine(523,0.08,0.65,60,50), sil(20), vib(523,0.32,0.68,20,8,50,8));
  // trash_big: жалоба — нисходящее с недовольством
  save('trash_big.wav',     sine(523,0.13,0.60,25,20), sil(22), sweep(523,311,0.42,0.58,9,5));
  // trash_gone: облегчение — лёгкое светлое арпеджио вверх
  save('trash_gone.wav',    sine(784,0.07,0.62,80,70), sil(10), sine(988,0.07,0.65,80,70), sil(10), sine(1175,0.07,0.68,80,70), sil(10), vib(1568,0.22,0.65,14,5,60,12));

  // TIME EVENTS
  // morning: тёплое бодрое приветствие — C-E-G + вибрато
  save('morning.wav',       sine(523,0.10,0.65,50,40), sil(12), sine(659,0.10,0.68,50,40), sil(12), sine(784,0.10,0.70,50,40), sil(12), vib(1047,0.45,0.68,20,5,40,10));
  // evening: тёплое затухание — мягко нисходящее
  save('evening.wav',       sweep(523,330,0.55,0.52,6,5), vib(330,0.36,0.44,10,3,8,6));
  // night: сонный уход — очень медленное падение в тишину
  save('night.wav',         sweep(262,82,0.82,0.42,3,2), sine(82,0.50,0.20,3,1));
  // lunch: обед! Вкусное возбуждение — отличается от battery_100
  save('lunch.wav',
    sine(659,0.07,0.68,80,70), sil(10), sine(784,0.07,0.70,80,70), sil(10),
    sine(988,0.07,0.72,80,70), sil(10), sine(784,0.07,0.70,80,70), sil(10),
    vib(1047,0.38,0.72,22,7,50,10));
  // chime: тёплый колокол с гармониками
  (function() {
    const dur = 1.4, n = Math.floor(SR * dur), s = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const e1 = Math.min(1, t * 800) * Math.max(0, Math.min(1, (dur - t) * 1.1));
      const e2 = Math.min(1, t * 800) * Math.max(0, Math.min(1, (0.85 - t) * 1.8));
      const e3 = Math.min(1, t * 800) * Math.max(0, Math.min(1, (0.45 - t) * 3.5));
      s[i] = Math.round((Math.sin(2*Math.PI*880*t)*0.52*e1 + Math.sin(2*Math.PI*1760*t)*0.22*e2 + Math.sin(2*Math.PI*2640*t)*0.09*e3) * 32767);
    }
    const db = Buffer.alloc(s.length * 2);
    for (let i = 0; i < s.length; i++) db.writeInt16LE(s[i], i * 2);
    fs.writeFileSync(path.join(SOUNDS_DIR, 'chime.wav'), Buffer.concat([wavHeader(db.length), db]));
  })();
  // overtime: «ЭЙ! ЭЙ! ЭЭЙ!» — три нетерпеливых призыва
  save('overtime.wav',      sine(392,0.17,0.62,35,25), sil(195), sine(494,0.22,0.66,35,22), sil(145), sweep(494,988,0.12,0.65,20,20), vib(988,0.32,0.68,28,10,30,8));

  // APPS
  // terminal_open: механические технические тройные бипы
  save('terminal_open.wav', sine(440,0.06,0.60,100,80), sil(15), sine(554,0.06,0.62,100,80), sil(15), sine(659,0.14,0.65,80,20));
  // claude_open: радостная встреча — взлёт + вибрато (теплее чем screen_unlock)
  save('claude_open.wav',   sweep(196,880,0.45,0.68,12,6), vib(880,0.40,0.65,25,6,20,10), sil(18), sine(784,0.12,0.58,30,20));
  // spotify_on: музыкальная фраза — восходящая с возвратом
  save('spotify_on.wav',    sine(659,0.08,0.65,70,60), sil(8), sine(784,0.08,0.67,70,60), sil(8), sine(988,0.08,0.70,70,60), sil(8), sine(784,0.08,0.67,70,60), sil(8), vib(1047,0.36,0.70,22,7,50,10));
  // spotify_next: любопытная смена — быстрый двойной тап + взлёт
  save('spotify_next.wav',  sine(784,0.07,0.60,80,70), sil(18), sweep(784,988,0.24,0.62,25,14));
  // spotify_off: музыка умирает — одинокое нисходящее соло
  save('spotify_off.wav',   sweep(784,330,0.68,0.56,8,3));

  // SCREENSHOT
  // snap: щелчок камеры + любопытная нотка
  save('snap.wav',          sine(988,0.05,0.72,200,150), sil(28), sine(988,0.05,0.70,200,150), sil(38), sweep(659,880,0.24,0.60,20,14));

  // SECURITY
  // cam_on: тройной нисходящий надзорный сигнал
  save('cam_on.wav',        sine(784,0.20,0.74,50,35), sil(130), sine(740,0.20,0.72,50,35), sil(130), vib(698,0.48,0.70,9,2.5,40,4));
  // mic_on: пульсирующее прослушивание — иное от cam_on
  save('mic_on.wav',        vib(659,0.26,0.66,30,4,16,12), sil(80), vib(659,0.38,0.68,30,4,16,10));
  // sudo_used: авторитетный нисходящий трёхступенчатый сигнал
  save('sudo_used.wav',     sine(1047,0.09,0.78,150,100), sil(18), sine(784,0.09,0.74,100,100), sil(18), sine(523,0.22,0.70,50,18));
  // agent_new: подозрительный низкий вопрос
  save('agent_new.wav',     sine(220,0.15,0.55,15,12), sil(80), sweep(220,330,0.32,0.52,10,8), vib(330,0.22,0.50,15,3,14,8));

  // CAPSLOCK
  // caps_on: упс! — резкий пик вниз
  save('caps_on.wav',       sine(1047,0.04,0.82,200,100), sweep(1047,523,0.22,0.68,200,14));
  // caps_off: облегчение — мягкое восходящее разрешение
  save('caps_off.wav',      sweep(523,659,0.18,0.55,30,20), sine(659,0.20,0.52,28,14));

  // RANDOM
  // bored: «ЭЙ!» — нетерпеливый одиночный призыв
  save('bored.wav',         sine(523,0.22,0.58,25,20), sil(200), sweep(392,988,0.26,0.62,14,15), vib(988,0.28,0.62,26,10,28,8));
}

function generateAllSounds() {
  if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  // One-time generation: skip if a canonical wav already exists
  if (fs.existsSync(path.join(SOUNDS_DIR, 'chime.wav'))) return;
  gen();
}

// ── Playback ──────────────────────────────────────────────────────────────────

let isPlaying = false;
let pending = null;

function run(cmd, args) {
  return new Promise(resolve => {
    const p = spawn(cmd, args, { stdio: 'ignore' });
    p.on('close', resolve); p.on('error', resolve);
  });
}

function notify(message) {
  spawn('osascript', [
    '-e', `display notification "${message}" with title "WALL-E"`,
  ], { stdio: 'ignore' });
}

async function playSound(wavName, message, opts) {
  const o = opts || {};
  if (message && o.notify === true) notify(message);
  if (isPlaying) { pending = { wavName, message, opts: o }; return; }
  isPlaying = true;
  const args = [];
  if (typeof o.volume === 'number') {
    const v = Math.max(0, Math.min(1, o.volume));
    args.push('-v', String(v));
  }
  args.push(path.join(SOUNDS_DIR, wavName));
  try {
    await run('afplay', args);
  } finally {
    isPlaying = false;
    if (pending) { const n = pending; pending = null; playSound(n.wavName, n.message, n.opts); }
  }
}

module.exports = { generateAllSounds, playSound };
