'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');

let prevCount = null;

function getDisplayCount() {
  const r = spawnSync('system_profiler', ['SPDisplaysDataType'], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 256 * 1024,
  });
  if (r.error || r.status !== 0) return null;
  return (r.stdout.match(/Resolution:/g) || []).length;
}

function checkDisplay() {
  const count = getDisplayCount();
  if (count === null) return;
  if (prevCount === null) { prevCount = count; return; }

  if (count > prevCount) {
    react('display-add', 'display_in.wav', 'Display connected');
  } else if (count < prevCount) {
    react('display-remove', 'display_out.wav', 'Display disconnected');
  }
  prevCount = count;
}

function startDisplayMonitor() {
  checkDisplay();
  setInterval(checkDisplay, 5000);
}

module.exports = { startDisplayMonitor };
