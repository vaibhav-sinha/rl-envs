#!/usr/bin/env node
import { readFileSync, openSync, readSync, closeSync } from 'node:fs';

const path = process.argv[2];
const needle = process.argv[3];
if (!path || !needle) {
  console.error('Usage: node find-figma-node.mjs <hfc.json> <sourceFigmaId>');
  process.exit(1);
}

const searchNeedle = `"sourceFigmaId":"${needle}"`;
const fd = openSync(path, 'r');
const buf = Buffer.alloc(8 * 1024 * 1024);
let pos = 0;
let leftover = '';
let found = false;
while (true) {
  const n = readSync(fd, buf, 0, buf.length, pos);
  if (n === 0) break;
  const chunk = buf.toString('utf8', 0, n);
  const s = leftover + chunk;
  const i = s.indexOf(searchNeedle);
  if (i >= 0) {
    found = true;
    console.log('FOUND');
    console.log(s.slice(Math.max(0, i - 300), i + searchNeedle.length + 800));
    break;
  }
  leftover = s.slice(-(searchNeedle.length + 80));
  pos += n;
}
closeSync(fd);
if (!found) console.log('NOT FOUND');
