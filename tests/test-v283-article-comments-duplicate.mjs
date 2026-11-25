// test-v283-article-comments-duplicate.mjs — v283 vong 3 (24/11/2026):
// Trang bai viet hien 2 khoi "Binh luan" trung nhau (Tho Zalo bao 09:38
// 24/11). Goc: 2 co che render binh luan doc lap tren /bai-viet/*.html —
// (1) initArticleComments (v166) chen nut toggle + khung binh luan sau
// .share-box; (2) mountPointsDetail('article','') (goi tu initPointsUI)
// gan hop ghim #v2sPinBox + #v2sCommentsMount roi goi
// Ver2Comments.renderComments — ca hai deu hien khoi "Binh luan".
// Fix: mountPointsDetail chi gan hop ghim tren trang bai bao (isArticle),
// KHONG tao #v2sCommentsMount, KHONG goi renderComments; trang chi tiet
// ho so/shop (co #detailRoot/#shopDetailRoot) giu nguyen vi mount nay la
// khoi Binh luan duy nhat o do.
// Chay: node tests/test-v283-article-comments-duplicate.mjs (tu goc repo).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

// ---- 0. Tinh: guard co mat trong js/app.js ----
check('mountPointsDetail co bien isArticle = !!articleEl',
  appSrc.indexOf('var isArticle = !!articleEl;') !== -1);
check('mount chi tao khi khong phai trang bai',
  appSrc.indexOf("(isArticle ? '' : '<div class=\"v2s-comments-mount\" id=\"v2sCommentsMount\"></div>')") !== -1);
check('renderComments chi goi khi khong phai trang bai',
  appSrc.indexOf("if (!isArticle && mount && C && typeof C.renderComments === 'function')") !== -1);

function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), children: [], style: {},
    textContent: '', innerHTML: '', hidden: false, _attrs: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return el._attrs[k]; },
    removeAttribute(k) { delete el._attrs[k]; },
    addEventListener() {}, appendChild(c) { el.children.push(c); return c; },
    insertBefore(c) { el.children.push(c); return c; },
    insertAdjacentElement() {},
    closest() { return null; },
    querySelector() { const q = makeEl('span'); return q; },
    parentNode: { insertBefore(c) { return c; } }
  };
  return el;
}
const flush = () => new Promise(r => setImmediate(() => setImmediate(r)));

async function runCase(label, opts) {
  const start = appSrc.indexOf('function mountPointsDetail(targetType, targetId){');
  const end = appSrc.indexOf('function initPointsUI(){', start);
  check(label + ': trich duoc mountPointsDetail tu js/app.js', start !== -1 && end !== -1);
  const slice = appSrc.slice(start, end);
  const renderCalls = [];
  let lastWrap = null;
  const fakeBox = makeEl('section');
  const fakeMount = makeEl('div');
  const fakeAnchor = makeEl('div');
  const fakeArticleEl = makeEl('article');
  const doc = {
    createElement(tag) { const el = makeEl(tag); lastWrap = el; return el; },
    getElementById(id) {
      if (id === 'detailRoot' || id === 'shopDetailRoot') return opts.anchor ? fakeAnchor : null;
      if (id === 'v2sPinBox') return (lastWrap && lastWrap.innerHTML.indexOf('id="v2sPinBox"') !== -1) ? fakeBox : null;
      if (id === 'v2sCommentsMount') return (lastWrap && lastWrap.innerHTML.indexOf('id="v2sCommentsMount"') !== -1) ? fakeMount : null;
      return null;
    },
    querySelector(sel) {
      if (String(sel).indexOf('article[itemtype') !== -1) return opts.articleEl ? fakeArticleEl : null;
      return null;
    },
    addEventListener() {}
  };
  const sb = {
    console,
    // esc() o muc module cua app.js (ngoai lat trich) — dua vao sandbox.
    esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
    loadPointsScripts() { return Promise.resolve(true); },
    pointsLoggedIn() { return Promise.resolve(true); },
    pointsGuestNoteHTML() { return ''; },
    document: doc,
    location: { pathname: opts.pathname }
  };
  sb.window = {
    Ver2Reward: { getMyPointsBalance() { return Promise.resolve(11); } },
    Ver2Comments: { renderComments(t, id, mount) { renderCalls.push([t, id, mount === fakeMount]); } }
  };
  vm.createContext(sb);
  vm.runInContext(slice + '\nthis.__mount = mountPointsDetail;', sb);
  sb.__mount(opts.type, opts.id);
  await flush(); await flush();
  return { wrapHTML: lastWrap ? lastWrap.innerHTML : '', renderCalls };
}

// ---- 1. Trang bai bao: chi hop ghim, KHONG khoi Binh luan thu hai ----
{
  const r = await runCase('bai-bao', { anchor: false, articleEl: true, pathname: '/bai-viet/test-bai.html', type: 'article', id: '' });
  check('bai-bao: van co hop ghim #v2sPinBox', r.wrapHTML.indexOf('id="v2sPinBox"') !== -1);
  check('bai-bao: KHONG tao #v2sCommentsMount', r.wrapHTML.indexOf('v2sCommentsMount') === -1, r.wrapHTML.slice(0, 120));
  check('bai-bao: KHONG goi renderComments', r.renderCalls.length === 0, JSON.stringify(r.renderCalls));
}

// ---- 2. Trang chi tiet ho so: giu nguyen hop ghim + khoi Binh luan ----
{
  const r = await runCase('chi-tiet', { anchor: true, articleEl: false, pathname: '/chi-tiet-mau.html', type: 'model_profile', id: 'm-123' });
  check('chi-tiet: van co hop ghim #v2sPinBox', r.wrapHTML.indexOf('id="v2sPinBox"') !== -1);
  check('chi-tiet: VAN tao #v2sCommentsMount', r.wrapHTML.indexOf('id="v2sCommentsMount"') !== -1);
  check('chi-tiet: goi renderComments 1 lan dung target',
    r.renderCalls.length === 1 && r.renderCalls[0][0] === 'model_profile' && r.renderCalls[0][1] === 'm-123' && r.renderCalls[0][2] === true,
    JSON.stringify(r.renderCalls));
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
