'use strict';

const si = require('systeminformation');
const { react } = require('../react');

const THRESHOLDS = [
  { pct: 1,  key: 'battery-1',  sound: 'bat_1.wav',  msg: 'Battery 1% — plug in now!' },
  { pct: 2,  key: 'battery-2',  sound: 'bat_2.wav',  msg: 'Battery 2%' },
  { pct: 3,  key: 'battery-3',  sound: 'bat_3.wav',  msg: 'Battery 3%' },
  { pct: 4,  key: 'battery-4',  sound: 'bat_4.wav',  msg: 'Battery 4%' },
  { pct: 5,  key: 'battery-5',  sound: 'bat_5.wav',  msg: 'Battery 5% — critically low' },
  { pct: 10, key: 'battery-10', sound: 'bat_10.wav', msg: 'Battery 10%' },
  { pct: 15, key: 'battery-15', sound: 'bat_15.wav', msg: 'Battery 15%' },
  { pct: 20, key: 'battery-20', sound: 'bat_20.wav', msg: 'Battery 20%' },
];

let prevCharging = null;
let prevPercent = null;

async function checkBattery() {
  try {
    const data = await si.battery();
    if (!data.hasBattery) return;

    const pct = Math.round(data.percent);
    const isCharging = data.isCharging;

    // Charger events
    if (prevCharging !== null) {
      if (!prevCharging && isCharging) {
        react('charger-on', 'charger_in.wav', 'Charger connected');
      } else if (prevCharging && !isCharging) {
        react('charger-off', 'charger_out.wav', 'Charger disconnected');
      }
    }
    prevCharging = isCharging;

    // Full charge
    if (pct === 100 && isCharging) {
      react('battery-full', 'bat_100.wav', 'Battery fully charged');
    }

    // Critical/low thresholds — only when discharging
    if (!isCharging) {
      for (const t of THRESHOLDS) {
        if (pct <= t.pct && react(t.key, t.sound, t.msg)) {
          break; // fire only the most critical one per cycle
        }
      }
    }

    prevPercent = pct;
  } catch (_) {}
}

function startBatteryMonitor() {
  checkBattery();
  setInterval(checkBattery, 30000);
}

module.exports = { startBatteryMonitor };
