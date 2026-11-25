// test-v438-tmdt-q4-share-gap.mjs — v438 (B-20261123-02c)
// Verifies the Q4 TMĐT article reconciles the 1.7 vs 2.9 point gap with
// verified YouNet ECI figures, and that the article's SEO invariants hold.
// Run: node tests/test-v438-tmdt-q4-share-gap.mjs   (from the repo root)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articlePath = join(root, 'bai-viet', 'phan-tich-thi-truong-tmdt-quy-4-2026-165500-ty-dong.html');

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
function count(hay, needle) {
  return hay.split(needle).length - 1;
}

check('article file exists', existsSync(articlePath));
const html = existsSync(articlePath) ? readFileSync(articlePath, 'utf8') : '';
check('article file non-empty', html.length > 10000, 'len=' + html.length);

// --- The v438 fix itself ---
const sentenceStart = 'YouNet ECI đo cùng kỳ cho khoảng cách 2,9 điểm phần trăm';
check('new 2.9 sentence present exactly once', count(html, sentenceStart) === 1,
  'found ' + count(html, sentenceStart));
check('sentence carries both shares', html.includes('(Shopee 50,6%, TikTok Shop 47,7% trên tổng GMV 146.900 tỷ đồng)'));
check('sentence attributes 1.7 to Metric', html.includes('con số 1,7 điểm của Metric'));
check('sentence carries both market totals', html.includes('146.900 tỷ đồng') && html.includes('(Metric: 150.380 tỷ đồng)'));

// Arithmetic: 50.6 - 47.7 must equal 2.9
const m = html.match(/\(Shopee (\d+),(\d+)%, TikTok Shop (\d+),(\d+)%/);
let gapOk = false;
if (m) {
  const shopee = parseFloat(m[1] + '.' + m[2]);
  const tiktok = parseFloat(m[3] + '.' + m[4]);
  gapOk = Math.abs((shopee - tiktok) - 2.9) < 0.001;
}
check('arithmetic 50.6 - 47.7 = 2.9', gapOk, m ? m[0] : 'shares not found');

check('cross-check paragraph present', html.includes('50,6% trừ 47,7%'));
check('heading keeps Metric 1.7 figure', html.includes('khoảng cách chỉ còn 1,7 điểm'));

// --- SEO invariants (unchanged by v438, must still hold) ---
const titleMatch = html.match(/<title>([^<]*)<\/title>/);
const headline = titleMatch ? titleMatch[1].split(' — vieclamlivestream.online')[0] : '';
check('headline <= 60 chars', headline.length > 0 && headline.length <= 60, 'len=' + headline.length);
const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
const desc = descMatch ? descMatch[1] : '';
check('meta description 120-160 chars', desc.length >= 120 && desc.length <= 160, 'len=' + desc.length);
const ogMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
const og = ogMatch ? ogMatch[1] : '';
check('og:image is a local article image, not a logo',
  og.includes('/images/bai-viet/') && !/logo/i.test(og), og);
const altMatch = html.match(/<meta property="og:image:alt" content="([^"]*)"/);
check('og:image:alt present', altMatch !== null && altMatch[1].length > 10);

// --- Signature + sourcing ---
check('signature block has both lines',
  html.includes('Theo vieclamlivestream.online:') && html.includes('Tư vấn tăng chuyển đổi live:'));
check('source line credits YouNet ECI', html.includes('báo cáo Doanh thu & Tiêu dùng TMĐT Việt Nam quý III/2026 của YouNet ECI'));

// --- Basic HTML balance ---
check('p tags balanced', count(html, '<p') === count(html, '</p>'),
  '<p=' + count(html, '<p') + ' </p=' + count(html, '</p>'));
check('h2 tags balanced', count(html, '<h2') === count(html, '</h2>'));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
