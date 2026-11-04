/* v17 — Ảnh thật từ bài gốc (không avatar, không ảnh Facebook cá nhân).
 * Cách gắn ngay khi có file: (1) lưu ảnh vào images/<id>.jpg đúng tên trong
 * MC_PHOTO_SOURCES, (2) thêm 1 dòng vào MC_PHOTOS: "th-02": "images/th-02.jpg",
 * (3) deploy cả images/ và js/photos.js. Không cần sửa code render khác:
 * - Thẻ trang chủ (js/render-cards.js mcHTML) đọc MC_PHOTOS[m.id].
 * - Trang mẫu tĩnh / trang chi tiết: applyPhotos() chèn <img> vào
 *   article#<id> .th-photo / .mc-photo và đổi nhãn thành "Ảnh thật từ bài gốc".
 * Hồ sơ chưa có file trong MC_PHOTOS giữ nguyên ảnh minh hoạ tạm.
 */
(function (root) {
  'use strict';
  var PHOTOS = {
    'th-02': 'images/th-02.jpg',
    'th-06': 'images/th-06.jpg',
    'th-08': 'images/th-08.jpg',
    'th-09': 'images/th-09.jpg',
    'th-14': 'images/th-14.jpg',
    'th-16': 'images/th-16.jpg',
    'th-20': 'images/th-20.jpg'
  };
  var SOURCES = {
    'th-02': { name: 'G T MY Duyênn', target: 'images/th-02.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1145669294631296&set=pcb.2210083783273429', note: 'Ảnh đính kèm đầu tiên trong bài gốc (carousel 2 ảnh selfie).' },
    'th-06': { name: 'Pham Thi Ngoc Diep', target: 'images/th-06.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1340373761483763&set=gm.985559207785068&idorvanity=224376760569987', note: 'Ảnh đính kèm trong bài gốc (collage 6 ảnh thời trang).' },
    'th-08': { name: 'Thuỳ Trang', target: 'images/th-08.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1826663071331848&set=pcb.892703943797868', note: 'Ảnh đính kèm đầu tiên trong bài gốc (khung livestream).' },
    'th-09': { name: 'Tran Tieu', target: 'images/th-09.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=3627347734170363&set=pcb.748992390680356', note: 'Ảnh đính kèm đầu tiên trong bài gốc.' },
    'th-11': { name: 'Elena Tienn', target: 'images/th-11.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1290950012353658&set=gm.774093982362357&idorvanity=136266936145068', note: 'Ảnh đính kèm trong bài gốc (selfie trước gương).' },
    'th-14': { name: 'Lâm Thu Hường', target: 'images/th-14.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1990069355146487&set=pcb.658426093993438', note: 'Ảnh đính kèm đầu tiên trong bài gốc.' },
    'th-15': { name: 'Nguyễn Hải Ngọc', target: 'images/th-15.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1025805662152112&set=pcb.4313382758756244', note: 'Bài mở đầu bằng video 12 giây — lấy đúng ảnh đầu tiên SAU video.' },
    'th-16': { name: 'Anh Diep', target: 'images/th-16.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=319772397404513&set=pcb.6747171492044013', note: 'Ảnh đính kèm đầu tiên trong bài gốc (khung livestream).' },
    'th-17': { name: 'Mộng Nghi', target: 'images/th-17.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1133441468327006&set=pcb.6667029263391570', note: 'Bài mở đầu bằng 2 video — lấy đúng ảnh đầu tiên DƯỚI video.' },
    'th-18': { name: 'Minh Thuyên', target: 'images/th-18.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=1181801903373504&set=pcb.7720950844666068', note: 'Ảnh đính kèm đầu tiên trong bài gốc.' },
    'th-19': { name: 'Kiều Thư', target: 'images/th-19.jpg', photoPage: 'https://facebook.com/groups/576293879131836/permalink/7031338710293955/', note: 'KHÔNG dùng ảnh đầu tiên (góc phòng live, không có người). Lấy ảnh THỨ HAI trong bài: nữ mặc váy đen. Fbid của ảnh thứ hai chưa có — phải mở bài gốc trong trình duyệt để xác định và lưu.' },
    'th-20': { name: 'Nga Trần', target: 'images/th-20.jpg', photoPage: 'https://www.facebook.com/photo/?fbid=2041010522904217&set=gm.6763530083741487&idorvanity=576293879131836', note: 'Ảnh đính kèm trong bài gốc.' }
  };
  function applyPhotos(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return 0;
    var done = 0;
    Object.keys(PHOTOS).forEach(function (id) {
      var card = doc.getElementById(id);
      if (!card) return;
      var box = card.querySelector('.th-photo, .mc-photo');
      if (!box || box.querySelector('img[data-real-photo]')) return;
      var img = doc.createElement('img');
      img.setAttribute('data-real-photo', '1');
      img.src = PHOTOS[id];
      img.alt = 'Ảnh thật từ bài gốc';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      box.insertBefore(img, box.firstChild);
      var note = box.querySelector('span');
      if (note) note.textContent = 'Ảnh thật từ bài gốc';
      done++;
    });
    return done;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () { applyPhotos(document); });
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () { applyPhotos(document); })
        .observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  root.MC_PHOTOS = PHOTOS;
  root.MC_PHOTO_SOURCES = SOURCES;
  root.MC_PHOTOS_APPLY = applyPhotos;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MC_PHOTOS: PHOTOS, MC_PHOTO_SOURCES: SOURCES, applyPhotos: applyPhotos };
  }
})(typeof self !== 'undefined' ? self : this);
