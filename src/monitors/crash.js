'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { react } = require('../react');
const { watchSet } = require('../utils');

const REPORTS_DIR = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');
const CRASH_EXTS = new Set(['.crash', '.ips']);

function getCrashFiles() {
  try {
    return new Set(
      fs.readdirSync(REPORTS_DIR).filter(f => CRASH_EXTS.has(path.extname(f)))
    );
  } catch (_) {
    return new Set();
  }
}

const checkCrash = watchSet(getCrashFiles, () => {
  react('app-crash', 'app_crash.wav', 'App crashed');
});

function startCrashMonitor() {
  checkCrash();
  setInterval(checkCrash, 30000);
}

module.exports = { startCrashMonitor };
