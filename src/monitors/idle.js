'use strict';

const { react } = require('../react');
const { getIdleSeconds } = require('../utils');
const config = require('../config');

let alerted = false;

function checkIdle() {
  const idleSec = getIdleSeconds();
  if (idleSec === null) return;

  if (idleSec >= config.get().monitors.idle.thresholdSec) {
    if (!alerted) {
      const fired = react('mouse-idle', 'idle_long.wav', 'You have been idle for 30 minutes');
      if (fired) alerted = true;
    }
  } else {
    alerted = false;
  }
}

let timer = null;
function reschedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(checkIdle, config.get().monitors.idle.pollMs);
}

function startIdleMonitor() {
  checkIdle();
  reschedule();
  config.events.on('changed', reschedule);
}

module.exports = { startIdleMonitor };
