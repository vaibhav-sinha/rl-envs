#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const html = readFileSync(process.argv[2], 'utf8');
const barlowText = (html.match(/font-family:"Barlow"/g) ?? []).length;
const interText = (html.match(/font-family:"Inter"/g) ?? []).length;
const barlowFace = [...new Set(html.match(/fonts\/barlow\/Barlow-[^"]+/g) ?? [])];
const interFace = [...new Set(html.match(/fonts\/inter\/Inter-[^"]+/g) ?? [])];
console.log(JSON.stringify({ barlowTextRules: barlowText, interTextRules: interText, barlowFontFiles: barlowFace, interFontFiles: interFace }, null, 2));
