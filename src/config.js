'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { COOLDOWNS } = require('./debounce');

const CONFIG_DIR = process.env.WALLE_CONFIG_DIR ||
  path.join(os.homedir(), 'Library', 'Application Support', 'wall-e');
const CONFIG_PATH = process.env.WALLE_CONFIG_PATH ||
  path.join(CONFIG_DIR, 'config.json');

function buildDefaultEvents() {
  const out = {};
  for (const key of Object.keys(COOLDOWNS)) {
    out[key] = { enabled: true };
  }
  return out;
}

const DEFAULTS = Object.freeze({
  version: 1,
  enabled: true,
  volume: 1.0,
  notifications: false,
  events: buildDefaultEvents(),
  monitors: {
    cpu:     { pollMs: 15000,  threshold: 80 },
    ram:     { pollMs: 30000,  threshold: 85 },
    cputemp: { pollMs: 30000,  threshold: 80 },
    disk:    { pollMs: 120000, thresholdPct: 10 },
    idle:    { pollMs: 60000,  thresholdSec: 1800 },
    files:   {
      pollMs: 5 * 60 * 1000,
      largeFileBytes: 1024 * 1024 * 1024,
      desktopClutterCount: 20,
      trashFullBytes: 1024 * 1024 * 1024,
    },
  },
});

const emitter = new EventEmitter();
let current = null;
let watching = false;
let muteWatchUntil = 0;

function deepMerge(base, patch) {
  if (patch === null || patch === undefined) return clone(base);
  if (typeof base !== 'object' || Array.isArray(base)) return patch;
  if (typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(patch)]);
  for (const k of keys) {
    if (k in patch && k in base) out[k] = deepMerge(base[k], patch[k]);
    else if (k in patch) out[k] = clone(patch[k]);
    else out[k] = clone(base[k]);
  }
  return out;
}

function clone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(clone);
  const out = {};
  for (const k of Object.keys(v)) out[k] = clone(v[k]);
  return out;
}

function ensureDir() {
  try { fs.mkdirSync(CONFIG_DIR, { recursive: true }); } catch (_) {}
}

function readFromDisk() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return deepMerge(DEFAULTS, parsed);
  } catch (_) {
    return null;
  }
}

function writeToDisk(cfg) {
  ensureDir();
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2));
  fs.renameSync(tmp, CONFIG_PATH);
  muteWatchUntil = Date.now() + 500;
}

function load() {
  const fromDisk = readFromDisk();
  if (fromDisk) {
    current = fromDisk;
  } else {
    current = clone(DEFAULTS);
    try { writeToDisk(current); } catch (_) {}
  }
  return current;
}

function get() {
  if (!current) load();
  return current;
}

function set(patch) {
  const next = deepMerge(get(), patch);
  current = next;
  writeToDisk(current);
  emitter.emit('changed', current);
  return current;
}

function reload() {
  const fromDisk = readFromDisk();
  if (!fromDisk) return current;
  const before = JSON.stringify(current);
  current = fromDisk;
  if (JSON.stringify(current) !== before) {
    emitter.emit('changed', current);
  }
  return current;
}

function watch() {
  if (watching) return;
  watching = true;
  ensureDir();
  fs.watchFile(CONFIG_PATH, { interval: 1000 }, () => {
    if (Date.now() < muteWatchUntil) return;
    reload();
  });
}

module.exports = {
  load,
  get,
  set,
  reload,
  watch,
  events: emitter,
  DEFAULTS,
  CONFIG_PATH,
};
