'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');

let prevState = null;

function getCapsLockState() {
  const r = spawnSync('ioreg', ['-r', '-c', 'AppleHIDKeyboardEventDriverV2'], {
    encoding: 'utf8', timeout: 2000, maxBuffer: 256 * 1024,
  });
  if (r.error || r.status !== 0) return null;
  const m = r.stdout.match(/"HIDCapsLockState"\s*=\s*(Yes|No)/i);
  if (!m) return null;
  return m[1].toLowerCase() === 'yes';
}

function checkCapsLock() {
  const state = getCapsLockState();
  if (state === null) return;
  if (prevState === null) { prevState = state; return; }

  if (!prevState && state) {
    react('capslock-on', 'caps_on.wav', 'Caps Lock ON');
  } else if (prevState && !state) {
    react('capslock-off', 'caps_off.wav', 'Caps Lock off');
  }
  prevState = state;
}

function startCapsLockMonitor() {
  checkCapsLock();
  setInterval(checkCapsLock, 1000);
}

module.exports = { startCapsLockMonitor };
