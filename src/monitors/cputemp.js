'use strict';

const si = require('systeminformation');
const { react } = require('../react');
const config = require('../config');

async function checkCpuTemp() {
  try {
    const data = await si.cpuTemperature();
    if (data.main === null || data.main === -1) return; // not supported (Apple Silicon)
    if (data.main > config.get().monitors.cputemp.threshold) {
      react('cputemp', 'cpu_temp.wav', 'CPU overheating');
    }
  } catch (_) {}
}

let timer = null;
function reschedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(checkCpuTemp, config.get().monitors.cputemp.pollMs);
}

function startCpuTempMonitor() {
  checkCpuTemp();
  reschedule();
  config.events.on('changed', reschedule);
}

module.exports = { startCpuTempMonitor };
