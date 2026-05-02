'use strict';

const { react } = require('../react');
const { getIdleSeconds } = require('../utils');

let workSessionStart = null;
const BREAK_IDLE_SEC = 300; // 5+ min idle = break
const OVERTIME_MS = 2 * 60 * 60 * 1000;

function checkTimeEvents() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  // Morning greeting 6:00-10:59, once per day
  if (h >= 6 && h < 11 && m < 5) {
    react('morning', 'morning.wav', 'Good morning!');
  }
  // Evening wind-down 18:00-21:59
  if (h >= 18 && h < 22 && m < 5) {
    react('evening', 'evening.wav', 'Good evening');
  }
  // Night 23:00-4:59
  if ((h === 23 || h < 5) && m < 5) {
    react('night', 'night.wav', "It's late, time to rest");
  }
  // Lunch 12:00
  if (h === 12 && m === 0) {
    react('lunch', 'lunch.wav', 'Lunch time!');
  }
  // Hourly chime at :00
  if (m === 0) {
    react('chime', 'chime.wav', `${h}:00`);
  }

  // Overtime: working > 2h without a 5-min break
  const idleSec = getIdleSeconds();
  if (idleSec !== null) {
    if (idleSec >= BREAK_IDLE_SEC) {
      workSessionStart = null; // reset on break
    } else {
      if (!workSessionStart) workSessionStart = Date.now();
      if (Date.now() - workSessionStart >= OVERTIME_MS) {
        if (react('overtime', 'overtime.wav', 'Working 2h+ without a break')) {
          workSessionStart = Date.now(); // reset after alert
        }
      }
    }
  }
}

function startTimeMonitor() {
  checkTimeEvents();
  setInterval(checkTimeEvents, 60000);
}

module.exports = { startTimeMonitor };
