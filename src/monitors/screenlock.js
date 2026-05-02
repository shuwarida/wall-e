'use strict';

const os = require('os');
const { spawnSync } = require('child_process');
const { react } = require('../react');

function getFullName() {
  const r = require('child_process').spawnSync('id', ['-F'], { encoding: 'utf8' });
  const name = r.stdout && r.stdout.trim();
  return name || os.userInfo().username;
}

const USERNAME = getFullName();

let wasLocked = null;

function getScreenLockState() {
  const result = spawnSync('ioreg', ['-n', 'Root', '-d1'], {
    encoding: 'utf8',
    timeout: 2000,
    maxBuffer: 512 * 1024,
  });

  if (result.error || result.status !== 0) return null;

  const match = result.stdout.match(/"IOConsoleLocked"\s*=\s*(Yes|No)/i);
  if (!match) return null;

  return match[1].toLowerCase() === 'yes';
}

function checkScreenLock() {
  const isLocked = getScreenLockState();
  if (isLocked === null) return;
  if (wasLocked === null) { wasLocked = isLocked; return; }

  // Unlocked
  if (wasLocked && !isLocked) {
    react('screenlock-unlock', 'screen_unlock.wav', `Welcome back, ${USERNAME}`);
  }

  // Locked
  if (!wasLocked && isLocked) {
    react('screenlock-lock', 'screen_lock.wav', 'Screen locked');
  }

  wasLocked = isLocked;
}

function startScreenLockMonitor() {
  checkScreenLock();
  setInterval(checkScreenLock, 1000);
}

module.exports = { startScreenLockMonitor };
