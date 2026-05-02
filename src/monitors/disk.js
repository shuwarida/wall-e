'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');
const config = require('../config');

function getDiskFreePercent() {
  const result = spawnSync('df', ['-k', '/'], { encoding: 'utf8', timeout: 3000 });
  if (result.error || result.status !== 0) return null;
  const lines = result.stdout.trim().split('\n');
  const data = lines[lines.length - 1].trim().split(/\s+/);
  // df -k columns: Filesystem 1K-blocks Used Available Use% Mounted
  // capacity field (index 4) contains "16%" style
  const cap = parseInt(data[4]);
  if (isNaN(cap)) return null;
  return 100 - cap; // free percent
}

function checkDisk() {
  const freePercent = getDiskFreePercent();
  if (freePercent === null) return;
  if (freePercent < config.get().monitors.disk.thresholdPct) {
    react('disk', 'disk_low.wav', 'Low disk space');
  }
}

let timer = null;
function reschedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(checkDisk, config.get().monitors.disk.pollMs);
}

function startDiskMonitor() {
  checkDisk();
  reschedule();
  config.events.on('changed', reschedule);
}

module.exports = { startDiskMonitor };
