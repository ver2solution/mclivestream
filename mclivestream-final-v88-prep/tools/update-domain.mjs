// Đổi domain/base URL cho toàn bộ thẻ SEO tĩnh của v20 từ 1 file cấu hình duy nhất.
// Cách dùng:
//   1. Sửa origin / basePath trong ../site.config.json.
//   2. Chạy: node tools/update-domain.mjs
//      (mặc định đổi từ https://ver2solution.github.io/mclivestream sang giá trị mới trong config)
//   3. Hoặc chỉ rõ base cũ: node tools/update-domain.mjs --from https://cu.example.com/duong-dan
// Script chỉ thay chuỗi base cũ trong *.html, sitemap.xml, robots.txt.
// Không đổi JSON-LD Organization "url" (domain thương hiệu), không đổi link nội bộ
// tương đối, không đổi supabase-config.js (cấu hình project Supabase, không phải domain web).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const origin = String(config.origin).replace(/\/$/, '');
const basePath = String(config.basePath || '').replace(/\/$/, '');
const newBase = origin + basePath;
const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const oldBase = fromIdx >= 0 ? args[fromIdx + 1] : 'https://ver2solution.github.io/mclivestream';
if (!oldBase || oldBase === newBase) {
  console.log('Không có gì để đổi: base cũ và base mới giống nhau (' + newBase + ').');
  process.exit(0);
}
const files = [
  ...readdirSync(root).filter((f) => f.endsWith('.html')),
  'sitemap.xml',
  'robots.txt',
];
let changed = 0;
for (const file of files) {
  const path = join(root, file);
  let text;
  try { text = readFileSync(path, 'utf8'); } catch { continue; }
  if (!text.includes(oldBase)) continue;
  writeFileSync(path, text.split(oldBase).join(newBase));
  changed += 1;
  console.log('Đã đổi domain trong: ' + file);
}
console.log('Xong: ' + changed + ' file đổi từ ' + oldBase + ' sang ' + newBase + '.');
console.log('Kiểm tra lại bằng bộ test v20 trước khi deploy.');
