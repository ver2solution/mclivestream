/* v18 — Module Detail Hero: ảnh lớn + thẻ thông tin ngắn + khối liên hệ
 * tuyển mẫu cho trang chi tiết hồ sơ (ho-so.html).
 * Nguồn dữ liệu duy nhất: HTML chi tiết đã có trong #detail (từ bài gốc
 * công khai), cộng MC_PHOTOS cho 7 ảnh thật đã tải (th-02, 06, 08, 09,
 * 14, 16, 20). KHÔNG bịa số điện thoại, Zalo hay email riêng của mẫu:
 * mọi liên hệ đều qua bài gốc trên Facebook hoặc qua Zalo chung của
 * Ver2Solution (0329983699). Hồ sơ chưa có ảnh thật giữ nhãn minh họa
 * tạm, không bịa ảnh.
 * Tương thích trình duyệt (window.McDetailHero) và Node (module.exports
 * cho test: extractFacts, buildHeroHTML, buildContactHTML).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McDetailHero = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stripTags(html) {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function fieldText(html, label) {
    var re = new RegExp('<b>\\s*' + label + ':?</b>\\s*([^<]+)', 'i');
    var m = re.exec(String(html || ''));
    return m ? m[1].trim() : 'Chưa cập nhật';
  }

  /* Trích sự thật hiển thị từ HTML chi tiết, không suy đoán thêm. */
  function extractFacts(html) {
    html = String(html || '');
    var name = /class="th-code"[^>]*>([^<]+)/.exec(html);
    var title = /<h3>([^<]+)<\/h3>/.exec(html);
    var meta = /class="th-meta"[^>]*>([\s\S]*?)<\/p>/.exec(html);
    var metaText = meta ? stripTags(meta[1]) : '';
    var src = /Nguồn bài gốc: <a href="([^"]+)"/.exec(html) ||
      /th-src[^>]*>[\s\S]*?<a href="([^"]+)"/.exec(html);
    var eduLine = /Học vấn:(?:<\/b>)?\s*([^<]+)/.exec(html);
    var eduParts = eduLine ? eduLine[1].split('·').map(function (s) { return s.trim(); }) : [];
    var dob = /Ngày sinh:(?:<\/b>)?\s*([^·<]+)/.exec(html);
    var hometown = /Quê quán:(?:<\/b>)?\s*([^<]+)/.exec(html);
    var warn = /class="th-label"[^>]*>([\s\S]*?)<\/p>/.exec(html);
    return {
      name: name ? name[1].trim() : 'Mẫu livestream',
      title: title ? title[1].trim() : 'Chưa cập nhật',
      meta: metaText,
      province: fieldText(html, 'Tỉnh') !== 'Chưa cập nhật'
        ? fieldText(html, 'Tỉnh') : (metaText.replace(/^📍\s*/, '').split('·')[0] || 'Chưa cập nhật').trim(),
      category: fieldText(html, 'Lĩnh vực') !== 'Chưa cập nhật'
        ? fieldText(html, 'Lĩnh vực') : (metaText.split('Giỏi live nhất:')[1] || 'Chưa cập nhật').trim(),
      gender: fieldText(html, 'Giới tính'),
      status: /Đang tìm việc/.test(html) ? 'Đang tìm việc' : (/Đã có việc/.test(html) ? 'Đã có việc' : 'Chưa cập nhật'),
      salary: fieldText(html, 'Lương mong muốn'),
      schedule: fieldText(html, 'Lịch làm việc'),
      topRevenue: fieldText(html, 'Doanh thu cao nhất'),
      rating: fieldText(html, 'Đánh giá'),
      education: eduParts[0] || 'Chưa cập nhật',
      dob: dob ? dob[1].trim() : 'Chưa cập nhật',
      hometown: hometown ? hometown[1].trim() : 'Chưa cập nhật',
      experience: fieldText(html, 'Kinh nghiệm'),
      src: src ? src[1] : '#',
      warn: warn ? stripTags(warn[1]) : ''
    };
  }

  function fact(label, value, wide) {
    return '<div class="fact' + (wide ? ' wide' : '') + '"><b>' + esc(label) +
      '</b><span>' + esc(value) + '</span></div>';
  }

  function buildHeroHTML(facts, photoUrl) {
    var photo = photoUrl
      ? '<img src="' + esc(photoUrl) + '" alt="Ảnh thật từ bài gốc" loading="lazy" decoding="async">'
        + '<span class="hero-photo-note">Ảnh thật từ bài gốc</span>'
      : '<span class="hero-placeholder" aria-hidden="true">👤</span>'
        + '<span class="hero-photo-note">Ảnh minh hoạ tạm — chưa phải ảnh thật</span>';
    return '<section class="detail-hero" aria-label="Tóm tắt hồ sơ">'
      + '<div class="hero-photo">' + photo + '</div>'
      + '<div class="hero-info">'
      + '<h1 class="hero-name">' + esc(facts.name) + '</h1>'
      + '<p class="hero-title">' + esc(facts.title) + '</p>'
      + '<p class="hero-scan">' + esc(facts.meta || ('📍 ' + facts.province + ' · ' + facts.category)) + '</p>'
      + '<div class="fact-grid">'
      + fact('Tỉnh / nơi muốn làm việc', facts.province)
      + fact('Giỏi live nhất', facts.category)
      + fact('Giới tính', facts.gender)
      + fact('Trạng thái', facts.status)
      + fact('Lương mong muốn', facts.salary)
      + fact('Lịch làm việc', facts.schedule)
      + fact('Doanh thu cao nhất', facts.topRevenue)
      + fact('Đánh giá', facts.rating)
      + fact('Học vấn', facts.education)
      + fact('Ngày sinh', facts.dob)
      + fact('Quê quán', facts.hometown)
      + fact('Kinh nghiệm', facts.experience, true)
      + '</div>'
      + (facts.warn ? '<p class="hero-warn">' + esc(facts.warn) + '</p>' : '')
      + '</div></section>';
  }

  function buildContactHTML(facts) {
    var src = facts.src && facts.src !== '#' ? facts.src : '#';
    var btns = '<a class="cbtn cbtn-primary" href="' + esc(src) + '" target="_blank" rel="noopener">Xem bài gốc trên Facebook →</a>'
      + '<a class="cbtn cbtn-live" href="' + esc(src) + '" target="_blank" rel="noopener">Nhắn Facebook qua bài gốc</a>'
      + '<a class="cbtn cbtn-ghost" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution 032 998 3699</a>'
      + '<a class="cbtn cbtn-ghost" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a>';
    return '<section class="contact-block" aria-label="Liên hệ tuyển mẫu">'
      + '<h2>Liên hệ tuyển mẫu này</h2>'
      + '<p class="contact-note">Shop liên hệ tuyển theo 2 cách, không cần đăng nhập để xem hồ sơ:</p>'
      + '<ol><li><b>Cách 1 — qua bài gốc:</b> bấm Xem bài gốc, nhắn trực tiếp cho người đăng bài trên Facebook.</li>'
      + '<li><b>Cách 2 — qua Ver2Solution:</b> nhắn Zalo 032 998 3699, ghi tên mẫu và tỉnh / lĩnh vực cần tuyển để được giới thiệu.</li></ol>'
      + '<p class="contact-note">Lưu ý: bài gốc không công khai số điện thoại hay Zalo riêng của mẫu, nên web không ghi số riêng của mẫu lên đây. '
      + 'Trước khi chốt, shop xác nhận lại lịch làm việc và tình trạng tìm việc với mẫu, vì lịch ghi trong bài là tại thời điểm bài đăng.</p>'
      + '<div class="contact-btns">' + btns + '</div></section>'
      + '<div class="detail-sticky-bar" aria-label="Liên hệ nhanh">' + btns + '</div>';
  }

  /* Bản trình duyệt: dựng hero + khối liên hệ khi #detail đã có nội dung. */
  function buildDetailHero() {
    if (typeof document === 'undefined') return false;
    var detail = document.getElementById('detail');
    var hero = document.getElementById('detailHero');
    if (!detail || !hero || !detail.innerHTML.trim()) return false;
    var heroFor = '';
    try { heroFor = new URLSearchParams(location.search).get('id') || ''; } catch (e) { heroFor = ''; }
    if (hero.getAttribute('data-hero-for') === heroFor && hero.innerHTML.trim()) return true;
    // Thay dòng "Liên hệ:" cũ trong thẻ gốc bằng ghi chú trung gian, để
    // tab rút gọn và cả khi tắt tab cũng không lộ số riêng của mẫu.
    Array.prototype.slice.call(detail.querySelectorAll('p')).forEach(function (el) {
      if (el.textContent.trim().indexOf('Liên hệ:') === 0) {
        el.innerHTML = '<b>Liên hệ tuyển mẫu:</b> Qua bài gốc công khai hoặc qua Zalo Ver2Solution 032 998 3699 — web không đăng số riêng của mẫu.';
      }
    });
    hero.setAttribute('data-hero-for', heroFor);
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) { id = ''; }
    var photoUrl = (typeof window !== 'undefined' && window.MC_PHOTOS && id)
      ? window.MC_PHOTOS[id] : null;
    var facts = extractFacts(detail.innerHTML);
    hero.innerHTML = buildHeroHTML(facts, photoUrl) + buildContactHTML(facts);
    return true;
  }

  return {
    extractFacts: extractFacts,
    buildHeroHTML: buildHeroHTML,
    buildContactHTML: buildContactHTML,
    buildDetailHero: buildDetailHero
  };
});
