'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { react } = require('../react');
const { watchSet } = require('../utils');

const DESKTOP = path.join(os.homedir(), 'Desktop');

function getScreenshots() {
  try {
    return new Set(fs.readdirSync(DESKTOP).filter(f => f.startsWith('Screenshot') && f.endsWith('.png')));
  } catch (_) { return new Set(); }
}

const checkScreenshots = watchSet(getScreenshots, () => {
  react('screenshot', 'snap.wav', 'Screenshot taken');
});

function startScreenshotMonitor() {
  checkScreenshots();
  setInterval(checkScreenshots, 2000);
}

module.exports = { startScreenshotMonitor };
