// 대표 이미지(assets/hero.png) 최적화: 적정 해상도로 리사이즈 + WebP 변환
import sharp from 'sharp';
import { statSync } from 'node:fs';

const SRC = 'assets/hero.png';
const OUT = 'assets/hero.webp';
const MAX_W = 1600;   // .wrap 최대폭 860px의 약 2배(레티나 대응)로 충분

const meta = await sharp(SRC).metadata();
console.log(`원본: ${meta.width}x${meta.height}, ${(statSync(SRC).size/1024).toFixed(0)} KB`);

let img = sharp(SRC);
if (meta.width > MAX_W) img = img.resize({ width: MAX_W });
await img.webp({ quality: 82, effort: 5 }).toFile(OUT);

const m2 = await sharp(OUT).metadata();
console.log(`최적화: ${m2.width}x${m2.height}, ${(statSync(OUT).size/1024).toFixed(0)} KB (WebP q82)`);
