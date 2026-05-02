'use strict';

const { spawnSync } = require('child_process');

function getIdleSeconds() {
  const r = spawnSync('ioreg', ['-c', 'IOHIDSystem'], {
    encoding: 'utf8', timeout: 2000, maxBuffer: 128 * 1024,
  });
  if (r.error) return null;
  const m = r.stdout.match(/"HIDIdleTime"\s*=\s*(\d+)/);
  return m ? parseInt(m[1]) / 1e9 : null;
}

// Returns a check() function that calls handler() once when new Set entries appear.
// First call establishes baseline; subsequent calls compare.
function watchSet(getter, handler) {
  let known = null;
  return function() {
    const current = getter();
    if (known === null) { known = current; return; }
    for (const item of current) {
      if (!known.has(item)) { handler(); break; }
    }
    known = current;
  };
}

module.exports = { getIdleSeconds, watchSet };
