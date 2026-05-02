'use strict';

const { react } = require('../react');

const CHECK_INTERVAL = 5000;
const WAKE_THRESHOLD = CHECK_INTERVAL * 3; // fired late = system was sleeping

let lastTick = Date.now();

function checkSleep() {
  const now = Date.now();
  const elapsed = now - lastTick;

  if (elapsed > WAKE_THRESHOLD) {
    react('sleep-wake', 'wake.wav', 'System woke up');
  }

  lastTick = now;
}

function startSleepMonitor() {
  lastTick = Date.now();
  setInterval(checkSleep, CHECK_INTERVAL);
}

module.exports = { startSleepMonitor };
