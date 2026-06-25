#!/usr/bin/env node
const fs = require("node:fs");

const source = process.argv[2] || process.env.AUDIO_RESTORE_SOURCE || process.env.BACKUP_FILE;
const target = process.env.AUDIO_ASSET_DIR;
if (!source || !fs.existsSync(source)) {
  console.error("Audio backup source is required");
  process.exit(1);
}
if (!target) {
  console.error("AUDIO_ASSET_DIR is required");
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });
fs.cpSync(source, target, { recursive: true });
console.log(target);
