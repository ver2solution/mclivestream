/* Test v200 — Console admin: khối tóm tắt nổi bật Số ảo / Số thật (tổng)
   trên tab Tổng quan (anh giao — v200 Admin số ảo/số thật).
   - quan-tri.html: thêm #qtOnlineSummary NGAY TRÊN bảng #qtTable (trong
     #admTab-overview), nổi bật (chữ đậm, nền xanh nhạt), mặc định "Đang tải…".
   - js/admin.js loadOverview(): điền #qtOnlineSummary từ byPage['total']:
     "Số ảo (tổng cơ số): X · Số người thật đang online: Y · Số hiển thị (gộp): Z"
     (base_count / real_count / display_count, định dạng bằng fmt()).
   - Số thật CHỈ trong console admin, tuyệt đối không lộ ra web công khai
     (không chạm app.js / index.html / các trang công khai).
   - Đổi js/admin.js nên bump CACHE v199-shell-1 → v200-shell-1
     (fetch handler cache-first giữ bản cũ nếu không bump).
   Node only, no browser. Chạy: node tests/test-v200-online-summary.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v200:', name); }
  else { fail++; console.log('FAIL v200:', name, extra); }
}
const readPrep = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const qt = readPrep('quan-tri.html');
const admin = readPrep('js/admin.js');
const app = readPrep('js/app.js');
const index = readPrep('index.html');

/* 1. quan-tri.html: có #qtOnlineSummary, nằm TRÊN bảng #qtTable, trong tab Tổng quan. */
t('quan-tri: có phần tử #qtOnlineSummary', qt.includes('id="qtOnlineSummary"'));
t('quan-tri: #qtOnlineSummary nằm trước #qtTable (trên bảng)', qt.indexOf('id="qtOnlineSummary"') !== -1 && qt.indexOf('id="qtOnlineSummary"') < qt.indexOf('id="qtTable"'));
t('quan-tri: #qtOnlineSummary trong #admTab-overview', qt.indexOf('id="admTab-overview"') < qt.indexOf('id="qtOnlineSummary"') && qt.indexOf('id="qtOnlineSummary"') < qt.indexOf('id="admTab-comments"'));
t('quan-tri: #qtOnlineSummary nổi bật (chữ đậm + nền)', /id="qtOnlineSummary"[^>]*font-weight:800/.test(qt) && /id="qtOnlineSummary"[^>]*background:#e8f5e9/.test(qt));
t('quan-tri: #qtOnlineSummary mặc định "Đang tải…"', /id="qtOnlineSummary"[^>]*>Đang tải…</.test(qt));

/* 2. admin.js loadOverview(): điền summary từ byPage['total']. */
t('admin: loadOverview lấy byPage[total]', /var tot = byPage\['total'\]/.test(admin));
t('admin: điền #qtOnlineSummary bằng fmt(base_count)', /qtOnlineSummary[\s\S]{0,400}fmt\(tot\.base_count\)/.test(admin));
t('admin: summary có đủ 3 nhãn (Số ảo / Số thật / Số hiển thị)', admin.includes("Số ảo (tổng cơ số):") && admin.includes("Số người thật đang online:") && admin.includes("Số hiển thị (gộp):"));
t('admin: summary dùng real_count + display_count', /fmt\(tot\.real_count\)/.test(admin) && /fmt\(tot\.display_count\)/.test(admin));
t('admin: có fallback khi thiếu total', /else if \(sumEl\)[\s\S]{0,120}Chưa có dữ liệu tổng/.test(admin));

/* 3. Hồi quy: bảng Tổng quan + loadOverview cũ vẫn nguyên. */
t('quan-tri: bảng #qtTable vẫn đủ 4 cột (Trang / Người thật / Số ảo gốc / Số hiển thị)', qt.includes('Người thật đang online') && qt.includes('Số ảo gốc') && qt.includes('Số hiển thị (gộp)'));
t('admin: loadOverview vẫn render #qtBody từ byPage', admin.includes("byPage[k]") && admin.includes("$('qtBody')") && admin.includes("body.innerHTML = html"));
t('admin: vẫn gọi rpc get_online_breakdown', admin.includes("rpc('get_online_breakdown')"));

/* 4. Số thật KHÔNG lộ ra web công khai. */
t('web công khai: app.js + index.html không chứa qtOnlineSummary / get_online_breakdown', !app.includes('qtOnlineSummary') && !app.includes('get_online_breakdown') && !index.includes('qtOnlineSummary'));

/* 5. CACHE bump (admin.js đổi nên phải bump). */
t("sw.js CACHE = v200-shell-1 (admin.js đổi nên bump CACHE)", readPrep('sw.js').includes("const CACHE = 'v200-shell-1'") && !readPrep('sw.js').includes("v199-shell-1"));

console.log(`\n=== v200: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
