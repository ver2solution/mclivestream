/* v28 tests — Node only, no browser. Covers the 5-second card
   (design-2026-11-05-the-ho-so-5-giay.md, 2026-11-05):
   (1) v37: every card renders all decision boxes; missing fields show the muted "Chưa cập nhật" placeholder — empty rows are
       not rendered at all, not shown as placeholder text.
   (2) "Thỏa thuận" appears at most once per card, only as the grey
       "Lương thỏa thuận" chip; exactly the 17 negotiable profiles have
       the chip, the 3 with a real salary do not.
   (3) real data is verbatim on the card: all 3 real salaries, all 13
       real schedules, all 20 experience lines; every card has a revenue
       row (0/20 have a real number, so it shows the muted placeholder).
   (4) synthetic profiles: full data renders salary + schedule + revenue
       + experience; negotiable salary renders the chip and a salary row
       showing "Thỏa thuận"; no salary + no schedule renders decision rows
       with muted placeholders + experience; escaping holds.
   (5) the detail page keeps its full 4-row table including
       "Chưa cập nhật" (initDetail untouched); shop cards still use
       dl.facts; miniHTML untouched.
   (6) CSS: .decision / .decision-row / .tag-negotiable exist; mobile
       stacks the decision row; <=360px keeps all items (v39 changed the
       old v28 collapse rule — see the updated assertion in section (6)).
   The v20–v27 suites still run (one v20 assertion was updated for the
   new card rule, noted in test-v20.mjs). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v28:', name); } else { fail++; console.log('FAIL v28:', name, extra); } }

const sb = { window: {}, module: { exports: {} }, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;
const cards = D.models.map(m => V.cardHTML(m));
const allCards = cards.join('');

// ---- (1) no placeholder text on any card face ----
// Design AC #2 (zero "Chưa cập nhật" in the rendered DOM) vs AC #3 (real data
// verbatim) conflict on 4 profiles whose GENUINE free text contains the phrase:
// th-04 exp "Chưa cập nhật số tháng cụ thể.", th-05 exp "Chưa cập nhật.",
// th-08 schedule "Chưa cập nhật giờ cụ thể", th-10 exp starting
// "Chưa cập nhật. Điểm ghi trong bài: …". Those are real words from the
// original posts, not placeholder rows, so they stay verbatim (AC #3 wins
// there). What v28 guarantees instead: the phrase never appears as a
// placeholder — no empty row, no data attribute — only inside genuine
// exp/schedule text. The check below strips each profile's own genuine
// exp + schedule text from its card and then requires zero occurrences left.
// v37 (visual QA 05/11): decision boxes are ALWAYS rendered, so "Chưa cập nhật"
// now appears as a muted placeholder for genuinely missing fields. The v28
// "zero placeholder" rule is replaced: the phrase may appear ONLY as a muted
// decision-value placeholder or inside genuine exp/schedule free text.
t('v37: every model card has exactly 3 decision-items + 1 decision-exp (fixed structure)',
  cards.every(h => (h.match(/decision-item/g) || []).length === 3 && (h.match(/decision-exp/g) || []).length === 1));
t('"Chưa cập nhật" appears only as a muted decision-value placeholder or inside genuine exp/schedule free text',
  D.models.every(m => {
    const h = V.cardHTML(m).replace(V.esc(m.exp), '').replace(V.esc(m.schedule), '')
      .replace(/<b class="decision-value muted">Chưa cập nhật<\/b>/g, '')
      .replace(/<span class="decision-value muted">Chưa cập nhật<\/span>/g, '');
    return !h.includes('Chưa cập nhật');
  }));
t('v37: exactly 31 occurrences across all 20 cards (27 muted placeholders + 4 genuine free text)',
  (allCards.match(/Chưa cập nhật/g) || []).length === 31
  && (allCards.match(/decision-value muted/g) || []).length === 27);
t('every "Chưa cập nhật" decision value carries the muted class (no bare placeholder)',
  !/<span class="decision-value">Chưa cập nhật<\/span>/.test(allCards)
  && !/<b class="decision-value">Chưa cập nhật<\/b>/.test(allCards));
t('no card contains the old facts labels (Lương mong muốn / Lịch làm việc); "Doanh thu cao nhất" is now a legitimate decision label (v37)',
  cards.every(h => !h.includes('Lương mong muốn') && !h.includes('Lịch làm việc')));

// ---- (2) negotiable salary = one grey chip, never a row ----
{
  const withChip = D.models.filter((m, i) => cards[i].includes('tag-negotiable')).length;
  const negotiable = D.models.filter(m => m.salary === 'Thỏa thuận').length;
  t('"Lương thỏa thuận" chip on exactly the 17 negotiable profiles, at most 1 chip per card',
    withChip === 17 && negotiable === 17
    && cards.every(h => (h.match(/Lương thỏa thuận/g) || []).length <= 1));
  t('the 3 profiles with a real salary have NO chip and DO show a bold salary row',
    D.models.filter(m => m.salary !== 'Thỏa thuận').every((m, i) => {
      const h = V.cardHTML(m);
      return !h.includes('tag-negotiable') && h.includes('💰 Lương') && h.includes(V.esc(m.salary));
    }));
}

// ---- (3) real data verbatim ----
{
  const realSalaries = D.models.filter(m => m.salary !== 'Thỏa thuận');
  t('all 3 real salaries appear verbatim on their cards (120–150k x2, Từ 250k x1)',
    realSalaries.length === 3
    && realSalaries.every(m => V.cardHTML(m).includes(V.esc(m.salary))));
  const realSchedules = D.models.filter(m => m.schedule !== 'Chưa cập nhật');
  t('all 13 real schedules appear verbatim on their cards',
    realSchedules.length === 13
    && realSchedules.every(m => V.cardHTML(m).includes(V.esc(m.schedule))));
  t('all 20 experience lines appear verbatim on their cards',
    D.models.every(m => V.cardHTML(m).includes(V.esc(m.exp))));
  t('v37: every card HAS a revenue row showing the muted placeholder (0/20 have a real topRevenue)',
    D.models.every(m => m.topRevenue === 'Chưa cập nhật')
    && cards.every(h => h.includes('📈 Doanh thu cao nhất') && h.includes('decision-value muted')));
  t('no view/comment numbers are shown on cards (still 0/0, not real signal)',
    cards.every(h => !/lượt xem|bình luận/i.test(h.replace(/data-views="0" data-comments="0"/g, ''))));
}

// ---- (4) synthetic profiles ----
function fake(over) {
  return Object.assign({
    id: 'th-99', name: 'Tên Thử', province: 'Hà Nội', cat: 'Thời trang',
    form: 'livestream', title: 'Test', gender: 'Nữ',
    salary: 'Thỏa thuận', schedule: 'Chưa cập nhật',
    topRevenue: 'Chưa cập nhật', exp: '2 năm live.',
    views: 0, comments: 0, status: 'Đang tìm việc',
    photoUrl: null, photoHas: false, photoSrc: null
  }, over);
}
{
  const full = V.cardHTML(fake({ salary: '200.000 đồng/giờ', schedule: '19h–23h', highest_revenue_amount: 50000000, highest_revenue_verified: true }));
  t('synthetic full profile: salary + schedule + revenue (v85 M1: verified amount) + experience rows all render',
    full.includes('💰 Lương') && full.includes('200.000 đồng/giờ')
    && full.includes('🕒 Lịch') && full.includes('19h–23h')
    && full.includes('📈 Doanh thu cao nhất') && full.includes('50.000.000đ')
    && full.includes('2 năm live.') && !full.includes('tag-negotiable'));
  const neg = V.cardHTML(fake({ schedule: 'Sau 18h00' }));
  t('synthetic negotiable + schedule only (v37): chip present, salary row shows "Thỏa thuận", schedule + experience render, revenue box shows the muted placeholder',
    neg.includes('tag-negotiable') && neg.includes('💰 Lương')
    && neg.includes('Thỏa thuận') && neg.includes('Sau 18h00') && neg.includes('2 năm live.')
    && neg.includes('📈 Doanh thu cao nhất') && neg.includes('decision-value muted'));
  const bare = V.cardHTML(fake({}));
  t('synthetic no salary number + no schedule (v37): chip present, experience renders, decision rows render with muted placeholders',
    bare.includes('tag-negotiable') && bare.includes('2 năm live.')
    && bare.includes('decision-row') && bare.includes('decision-value muted'));
  const xss = V.cardHTML(fake({ name: '<img src=x onerror=alert(1)>', salary: '100.000 đồng/giờ', exp: '<b>evil</b>' }));
  t('card values are still HTML-escaped (name + exp with markup do not leak raw)',
    !xss.includes('<img src=x') && xss.includes('&lt;img src=x')
    && !xss.includes('<b>evil</b>') && xss.includes('&lt;b&gt;evil&lt;/b&gt;'));
  t('hasRealValue() treats "Chưa cập nhật", empty and null as not real; anything else as real',
    V.hasRealValue('14h–18h') && !V.hasRealValue('Chưa cập nhật')
    && !V.hasRealValue('') && !V.hasRealValue(null) && !V.hasRealValue('  Chưa cập nhật  '));
}

// ---- (5) detail page + shop cards + mini untouched ----
{
  const src = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  t('detail page keeps its full table incl. "Chưa cập nhật" (fact-grid still has all 4 rows; v85 M1: revenue via revenueText)',
    src.includes('<div class="fact-grid">')
    && src.includes('<b>Lương mong muốn</b>') && src.includes('<b>Lịch làm việc</b>')
    && src.includes('<b>Doanh thu cao nhất</b>') && src.includes("esc(revenueText(m))"));
  const shop = V.shopCardHTML(D.shops[0]);
  t('shop cards use shopDecisionHTML (v32 replaced dl.facts with the decision block: province/field/channel rows + "Lương thỏa thuận" chip; detail link + hard Zalo button kept)',
    !shop.includes('<dl class="facts">') && shop.includes('<div class="decision">')
    && shop.includes('Chạm Loa') && shop.includes('Lương thỏa thuận')
    && shop.includes('Xem chi tiết →') && shop.includes('Nhắn Zalo'));
  t('miniHTML untouched (still shows salary line for detail-page lists)',
    V.miniHTML(D.models[0]).includes('Lương: '));
  t('card keeps status chip, photo note, CHƯA XÁC NHẬN label, removal link, 2 action buttons',
    cards.every(h => h.includes('Đang tìm việc') && h.includes('CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB')
      && h.includes('Yêu cầu gỡ hồ sơ') && h.includes('Xem hồ sơ →') && h.includes('Nhắn Zalo')));
}

// ---- (6) CSS ----
{
  const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
  t('CSS has .decision / .decision-row / .decision-item / .decision-exp / .tag-negotiable',
    css.includes('.decision{') && css.includes('.decision-row')
    && css.includes('.decision-item') && css.includes('.decision-exp')
    && css.includes('.tag-negotiable'));
  t('CSS truncates salary/schedule to 1 line and experience to 2 lines',
    css.includes('-webkit-line-clamp:2') && css.includes('text-overflow:ellipsis'));
  t('CSS stacks the decision row vertically on mobile (<=600px)',
    /@media\(max-width:600px\)\{[\s\S]*?\.decision-row\{flex-direction:column\}/.test(css));
  t('CSS keeps the full decision block under 360px (v39: no hiding, only compact padding)',
    !css.includes('.decision-row .decision-item:nth-child(2){display:none}')
    && !css.includes('.card-body:has(.decision-row) .decision-exp{display:none}')
    && css.includes('.decision-item,.decision-exp{padding:7px 9px;min-height:56px}'));
  t('CSS still keeps .facts rules for shop cards',
    css.includes('.shop-card .facts'));
}

// ---- (7) no regression in counts / rotation / pagination ----
t('counts unchanged: 20 models, 30 shops, homeTop8 = 8 with real photos',
  D.models.length === 20 && D.shops.length === 30
  && V.homeTop8(D.models, new Date(2026, 10, 5)).length === 8
  && V.homeTop8(D.models, new Date(2026, 10, 5)).every(m => m.photoUrl));

// ---- (8) README documents v28 ----
{
  const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  t('README has a v28 section: 5-second card, decision rows, negotiable chip, detail page unchanged',
    md.includes('# mclivestream v28') && md.includes('5 giây')
    && md.includes('Lương thỏa thuận') && md.includes('Chưa cập nhật'));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
