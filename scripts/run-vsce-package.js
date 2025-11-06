#!/usr/bin/env node
// Wrapper to set global.File before loading vsce CLI to avoid undici/webidl ReferenceError
const path = require('path');

// Polyfill a minimal File class for undici/webidl expectations in Node < 20
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(chunks, filename, options) {
      this.name = filename;
      this.lastModified = (options && options.lastModified) || Date.now();
      this._chunks = chunks;
    }
  };
}

try {
  // Try a few known entrypoints for different vsce package versions
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'vsce', 'bin', 'cli'),
    path.join(process.cwd(), 'node_modules', 'vsce', 'vsce'),
    path.join(process.cwd(), 'node_modules', '@vscode', 'vsce', 'bin', 'cli')
  ];
  let loaded = false;
  for (const p of candidates) {
    try {
      require.resolve(p);
      require(p);
      loaded = true;
      break;
    } catch (e) {
      // try next
    }
  }
  if (!loaded) {
    throw new Error('Could not find vsce CLI entrypoint in node_modules');
  }
} catch (err) {
  console.error('Failed to load vsce CLI:', err && err.stack ? err.stack : err);
  process.exit(1);
}
