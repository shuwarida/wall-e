'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { react } = require('../react');
const { watchSet } = require('../utils');

const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');
const TEMP_EXTS = new Set(['.download', '.crdownload', '.part', '.tmp', '.partial']);

function getRealFiles() {
  try {
    return new Set(
      fs.readdirSync(DOWNLOADS_DIR)
        .filter(f => !TEMP_EXTS.has(path.extname(f).toLowerCase()) && !f.startsWith('.'))
    );
  } catch (_) { return new Set(); }
}

const checkDownloads = watchSet(getRealFiles, () => {
  react('download-done', 'dl_done.wav', 'Download complete');
});

function startDownloadsMonitor() {
  checkDownloads();
  setInterval(checkDownloads, 5000);
}

module.exports = { startDownloadsMonitor };
