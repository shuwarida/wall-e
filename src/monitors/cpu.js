'use strict';

const si = require('systeminformation');
const { react } = require('../react');
const config = require('../config');

async function checkCpu() {
  try {
    const data = await si.currentLoad();
    const threshold = config.get().monitors.cpu.threshold;
    if (data.currentLoad > threshold) {
      react('cpu', 'cpu_hot.wav', 'CPU overloaded');
    }
  } catch (_) {}
}

let timer = null;
function reschedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(checkCpu, config.get().monitors.cpu.pollMs);
}

function startCpuMonitor() {
  checkCpu();
  reschedule();
  config.events.on('changed', reschedule);
}

module.exports = { startCpuMonitor };
