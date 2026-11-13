// test-ctv-50-article.mjs — verifies the CTV 50% article package after unzip.
// Run: node tests/test-ctv-50-article.mjs (exit 0 = all pass).
import fs from "node:fs";
import vm from "node:vm";

const SLUG = "cong-tac-vien-ver2solution-50-hoa-hong";
const URL = `https://vieclamlivestream.online/bai-viet/${SLUG}.html`;
const TITLE = "7.000.000 đồng/khách: mẫu live giới thiệu shop nhận 50%";
const H1 = "7.000.000 đồng/khách — Cộng tác viên Ver2Solution: mẫu livestream giới thiệu shop, hưởng 50% hoa hồng tháng đầu";
const META = "Mẫu livestream giới thiệu shop dùng thử 4 buổi Comment miễn phí: khách đóng tiền thì nhận 50% hoa hồng tháng đầu, cao nhất 7.000.000 đồng/khách, không cần vốn.";
const HERO = `https://vieclamlivestream.online/images/bai-viet/${SLUG}-hero.jpg`;
const HERO_OG = `https://vieclamlivestream.online/images/bai-viet/${SLUG}-hero-og.jpg`;

let pass = 0, fail = 0;
function check(name, ok, extra = "") {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
}

// 1. data.js parses and contains the new entry (219 articles)
const code = fs.readFileSync("js/data.js", "utf8");
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(code, sb);
const D = sb.window.V20_DATA || sb.V20_DATA;
const arts = D.articles;
check("data.js articles count is 219", arts.length === 219, `got ${arts.length}`);
const a = arts.find((x) => x.page === `bai-viet/${SLUG}.html`);
check("data.js has the CTV entry", !!a);
if (a) {
  check("entry cat is Việc Làm", a.cat === "Việc Làm", `got ${a.cat}`);
  check("entry date is 2026-11-13", a.date === "2026-11-13", `got ${a.date}`);
  check("entry title matches", a.title === TITLE);
  check("entry source is Ver2Solution", a.source === "Ver2Solution");
  check("entry img is the hero", a.img === HERO, `got ${a.img}`);
  check("entry takeaway mentions 50% + 7.000.000", /50%/.test(a.takeaway) && /7\.000\.000/.test(a.takeaway));
}
check("no duplicate CTV slug in data.js", arts.filter((x) => JSON.stringify(x).includes(SLUG)).length === 1);
check("no other article changed: models/shops intact", D.models.length === 219 && D.shops.length === 250, `models ${D.models.length} shops ${D.shops.length}`);

// 2. sitemap has the new URL exactly once
const sm = fs.readFileSync("sitemap.xml", "utf8");
check("sitemap has the article URL once", sm.split(URL).length - 1 === 1, `count ${sm.split(URL).length - 1}`);

// 3. HTML file
const htmlPath = `bai-viet/${SLUG}.html`;
check("article HTML exists", fs.existsSync(htmlPath));
const html = fs.readFileSync(htmlPath, "utf8");
check("HTML title <=60 chars", html.includes(`<title>${TITLE}</title>`) && TITLE.length <= 60);
check("HTML meta description 150-160", html.includes(`content="${META}"`) && META.length >= 150 && META.length <= 160, `meta ${META.length}`);
check("HTML canonical", html.includes(`rel="canonical" href="${URL}"`));
check("HTML H1", html.includes(`<h1 itemprop="headline">${H1}</h1>`));
check("HTML og:image 1200x630", html.includes(`og:image" content="${HERO_OG}"`) && html.includes('og:image:width" content="1200"') && html.includes('og:image:height" content="630"'));
check("HTML hero img + alt with keyword", html.includes(`src="../images/bai-viet/${SLUG}-hero.jpg"`) && html.includes('alt="Cộng tác viên Ver2Solution:'));
check("HTML has 9 h2 sections", (html.match(/<h2 id="/g) || []).length === 9, `got ${(html.match(/<h2 id="/g) || []).length} (gopy dialog h2 excluded)`);
check("HTML has 4 h3 steps", (html.match(/<h3>/g) || []).length === 4, `got ${(html.match(/<h3>/g) || []).length}`);
check("HTML has 2 tables (6 goi + 3 kich ban)", (html.match(/<table/g) || []).length === 2, `got ${(html.match(/<table/g) || []).length}`);
check("HTML has standard signature", html.includes("Theo Ver2Solution: Ver2Solution là sàn việc làm dành cho idol live top 1 Việt Nam"));
check("HTML keyword in H1 + slug", H1.includes("Cộng tác viên Ver2Solution") && SLUG.includes("cong-tac-vien-ver2solution"));
check("HTML date 13/11/2026", html.includes("Bài đăng 13/11/2026") && html.includes('datetime="2026-11-13"'));
check("HTML category badge Việc Làm", html.includes('<span class="news-cat">Việc Làm</span>'));
check("HTML no leftover from template article", !html.includes("Phạm Thoại") && !html.includes("58 tỷ") && !html.includes("VTC News"));
check("HTML no old Zalo slug", !html.includes("co-che-cong-tac-vien-ver2solution-50-hoa-hong"));
check("HTML internal links: dang-ky + danh-sach-mau", html.includes("dang-ky.html?type=model") && html.includes("danh-sach-mau.html"));

// 4. hero images exist
check("hero jpg exists", fs.existsSync(`images/bai-viet/${SLUG}-hero.jpg`));
check("hero og jpg exists", fs.existsSync(`images/bai-viet/${SLUG}-hero-og.jpg`));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
