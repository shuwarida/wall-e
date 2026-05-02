'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { react } = require('../react');
const { watchSet } = require('../utils');
const config = require('../config');

const DESKTOP = path.join(os.homedir(), 'Desktop');
const DOWNLOADS = path.join(os.homedir(), 'Downloads');
const TRASH = path.join(os.homedir(), '.Trash');

let trashWasFull = false;
let trashWasEmpty = true;

function getDesktopFileCount() {
  try { return fs.readdirSync(DESKTOP).filter(f => !f.startsWith('.')).length; }
  catch (_) { return 0; }
}

function getTrashSizeBytes() {
  const r = spawnSync('du', ['-sk', TRASH], { encoding: 'utf8', timeout: 5000 });
  if (r.error || r.status !== 0) return 0;
  const kb = parseInt(r.stdout.split('\t')[0]);
  return isNaN(kb) ? 0 : kb * 1024;
}

function getLargeDownloadFiles() {
  const minBytes = config.get().monitors.files.largeFileBytes;
  try {
    return new Set(
      fs.readdirSync(DOWNLOADS)
        .filter(f => {
          try { return fs.statSync(path.join(DOWNLOADS, f)).size >= minBytes; }
          catch (_) { return false; }
        })
    );
  } catch (_) { return new Set(); }
}

const checkLargeFiles = watchSet(getLargeDownloadFiles, () => {
  react('large-file', 'big_file.wav', 'Large file downloaded (>1 GB)');
});

function checkFiles() {
  const cfg = config.get().monitors.files;

  // Desktop clutter
  const desktopCount = getDesktopFileCount();
  if (desktopCount > cfg.desktopClutterCount) {
    react('desktop-clutter', 'desk_mess.wav', 'Desktop is cluttered');
  }

  // Trash full
  const trashBytes = getTrashSizeBytes();
  const trashFull = trashBytes >= cfg.trashFullBytes;
  const trashEmpty = trashBytes < 1024 * 1024; // < 1 MB = effectively empty
  if (trashFull && !trashWasFull) {
    react('trash-full', 'trash_big.wav', 'Trash is getting full');
  }
  if (trashEmpty && !trashWasEmpty) {
    react('trash-emptied', 'trash_gone.wav', 'Trash emptied');
  }
  trashWasFull = trashFull;
  trashWasEmpty = trashEmpty;

  // Large files in downloads
  checkLargeFiles();
}

let timer = null;
function reschedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(checkFiles, config.get().monitors.files.pollMs);
}

function startFilesMonitor() {
  const trashBytes = getTrashSizeBytes();
  const cfg = config.get().monitors.files;
  trashWasFull = trashBytes >= cfg.trashFullBytes;
  trashWasEmpty = trashBytes < 1024 * 1024;

  checkFiles();
  reschedule();
  config.events.on('changed', reschedule);
}

module.exports = { startFilesMonitor };
