'use strict';

const si = require('systeminformation');
const { react } = require('../react');
const config = require('../config');

async function checkRam() {
  try {
    const mem = await si.mem();
    const usedPct = (mem.used / mem.total) * 100;
    if (usedPct > config.get().monitors.ram.threshold) {
      react('ram', 'ram_full.wav', 'RAM almost full');
    }
  } catch (_) {}
}

let timer = null;
function reschedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(checkRam, config.get().monitors.ram.pollMs);
}

function startRamMonitor() {
  checkRam();
  reschedule();
  config.events.on('changed', reschedule);
}

module.exports = { startRamMonitor };
