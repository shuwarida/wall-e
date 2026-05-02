'use strict';

const config = require('./config');
const { canFire } = require('./debounce');
const { playSound } = require('./sounds');

function react(eventKey, wavName, message) {
  const cfg = config.get();
  if (!cfg.enabled) return false;

  const ev = cfg.events && cfg.events[eventKey];
  if (ev && ev.enabled === false) return false;

  const override = ev && typeof ev.cooldownMs === 'number' ? ev.cooldownMs : undefined;
  if (!canFire(eventKey, override)) return false;

  try { process.stdout.write(`EVENT reaction ${eventKey}\n`); } catch (_) {}

  playSound(wavName, message, {
    volume: typeof cfg.volume === 'number' ? cfg.volume : 1,
    notify: cfg.notifications === true,
  });

  return true;
}

module.exports = { react };
