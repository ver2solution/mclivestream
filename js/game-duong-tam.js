/* ============================================================================
   Nơi dưỡng tâm — game dưỡng tâm 3D (Three.js r186, low-poly) — BẢN PORT
   Ver2Solution (09/11/2026, từ Phật Pháp Online — noi-duong-tam.js gốc).
   Cảnh 3D / vòng lặp thiền-tưới sen-thắp hương / shop GIỮ NGUYÊN bản gốc
   (phong cách tranh Đông Á, tông "Làng Việt ấm"). Toàn bộ hình vẽ bằng code,
   không dùng asset ngoài, KHÔNG gọi WebSocket/Bonto — game chạy offline
   hoàn toàn (bản gốc cũng vậy: 0 tham chiếu Bonto/WS trong file game này;
   file game-engine.js chứa WS Bonto thuộc về game sân chùa khác, KHÔNG
   được port sang đây).
   --- Lớp nối Ver2Solution (xem khối "V2S — NỐI TÀI KHOẢN + XU" bên dưới) ---
   * Trạng thái game (công đức/cấp/kho đồ) lưu localStorage theo tài khoản:
     key `duongtam:<uid>:v1` (đã đăng nhập) hoặc `duongtam:guest:v1` (chơi thử).
   * CÔNG ĐỨC GIỮ RIÊNG, không quy đổi ra Xu, không gộp với Xu thương mại.
   * Xu tài khoản: client KHÔNG tự cộng/trừ số dư. Mọi Xu kiếm trong game
     ghi sổ qua RPC `xu_game_earn` (SECURITY DEFINER, idempotency key
     `game:<uid>:<action>:<YYYY-MM-DD>`); số dư hiển thị đọc qua RPC
     `get_my_points_balance`. Số Xu từng hành động lấy từ GIÁ TRỊ RPC
     TRẢ VỀ, không hardcode trong UI.
   * Shop khi đã đăng nhập: CHƯA NỐI SỔ CÁI — `spend_points` của M7 chỉ
     nhận p_type filter/contact_view/pin nên không trừ được tiền mua đồ
     game; mua hàng fail-closed (không trừ Xu, không giao đồ) cho tới khi
     có RPC trừ Xu game. Xem `spendGameXu()` — ĐIỂM NỐI DUY NHẤT để gắn
     RPC trừ Xu khi quyết định nối tiền tệ được chốt. Khách chơi thử dùng
     ví Xu local riêng (100 Xu ban đầu, chỉ trong máy này).
   * QUYẾT ĐỊNH ĐANG CHỜ (Rion trả lời, hạn 10/11/2026): phương án nối tốt
     nhất (endpoint/API hay đối soát qua Sheet trước) và "1 nhân vật chung
     hay 2 nhân vật liên kết bằng email". Code KHÔNG khóa cứng vào 1 phương
     án: mọi chỗ chạm tới tiền tệ/tài khoản đều đi qua 3 adapter duy nhất
     `earnGameXu()` / `spendGameXu()` / `refreshAccountBalance()` — đổi
     phương án nối chỉ sửa 3 hàm này, không đụng gameplay.
   * File này cần importmap trong game/noi-duong-tam.html:
     { "three": "./three.module.js", "three/addons/": "./three-addons/" }.
   ============================================================================ */
import * as THREE from 'three'; /* importmap ở game/noi-duong-tam.html: 'three' -> ./three.module.js */
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';


/* ============================================================================
   V2S — NỐI TÀI KHOẢN + XU (Ver2Solution, 09/11/2026)
   3 adapter duy nhất chạm tới tiền tệ / tài khoản. Gameplay (cảnh 3D,
   hành động, shop) không gọi Supabase trực tiếp — chỉ gọi 3 hàm này.
   - earnGameXu(action): ghi Xu kiếm được qua RPC xu_game_earn (M16).
   - spendGameXu(kind,key,price): TRỪ Xu mua đồ — CHƯA NỐI (fail-closed).
   - refreshAccountBalance(): đọc số dư qua RPC get_my_points_balance.
   Nếu đổi phương án nối (API khác / đối soát Sheet / 1 hay 2 nhân vật),
   chỉ sửa 3 hàm này.
   ============================================================================ */
const GAME_ACTIONS = ['meditate', 'water_lotus', 'incense', 'daily_quest', 'streak_bonus'];
const ACTION_TO_RPC = { thien: 'meditate', tuoi: 'water_lotus', huong: 'incense' };
/* Trạng thái nối: null = khách chơi thử (chưa đăng nhập). */
let currentUid = null;
let currentUserEmail = '';
let accountBalance = 0;      /* số dư Xu tài khoản (đọc qua RPC, không tự tính) */
let accountBalanceOk = false; /* false = RPC số dư chưa trả về / lỗi */
let rpcEarnMissing = false;   /* true = RPC xu_game_earn chưa có (M16 chưa live) */

function dayKeySaigon(d) {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d || new Date());
    const g = {};
    for (const x of p) g[x.type] = x.value;
    return g.year + '-' + g.month + '-' + g.day;
  } catch (e) {
    const t = d || new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
}
function saigonDay(offsetDays) { return dayKeySaigon(new Date(Date.now() + offsetDays * 86400000)); }
/* Số dư có thể dùng để mua trong shop: tài khoản (đã đăng nhập) hoặc ví local (khách). */
function spendableBalance() { return currentUid ? accountBalance : state.xu; }
/* Ngày giờ hiển thị trong game luôn theo Asia/Saigon (chuẩn Ver2Solution). */

function extractEarned(data) {
  if (typeof data === 'number') return Math.max(0, Math.floor(data));
  if (data && typeof data === 'object') {
    for (const k of ['earned', 'points', 'xu', 'credited', 'amount']) {
      if (typeof data[k] === 'number') return Math.max(0, Math.floor(data[k]));
    }
  }
  return 0;
}
function extractBalance(data) {
  if (typeof data === 'number') return Math.max(0, Math.floor(data));
  if (data && typeof data === 'object' && typeof data.balance === 'number') return Math.max(0, Math.floor(data.balance));
  return 0;
}
/* Ghi Xu kiếm được vào sổ cái qua RPC xu_game_earn (M16, SECURITY DEFINER).
   p_action chỉ dùng 5 giá trị GAME_ACTIONS. Trả {ok, code, amount} — amount
   là số Xu ĐƯỢC CỘNG (0 nếu đã nhận rồi trong ngày). Client không tự cộng. */
async function earnGameXu(action) {
  if (!currentUid) return { ok: false, code: 'guest', amount: 0 };
  if (GAME_ACTIONS.indexOf(action) === -1) return { ok: false, code: 'invalid_action', amount: 0 };
  try {
    const api = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (!api || !api.client || typeof api.client.rpc !== 'function') return { ok: false, code: 'no_api', amount: 0 };
    const day = dayKeySaigon(new Date());
    const key = 'game:' + currentUid + ':' + action + ':' + day;
    const res = await api.client.rpc('xu_game_earn', { p_action: action, p_idempotency_key: key });
    if (res.error) {
      const msg = String((res.error && res.error.message) || res.error || '');
      if (/PGRST202|Could not find the function/i.test(msg)) { rpcEarnMissing = true; return { ok: false, code: 'rpc_missing', amount: 0 }; }
      return { ok: false, code: 'rpc_error', amount: 0, error: msg };
    }
    return { ok: true, code: 'ok', amount: extractEarned(res.data) };
  } catch (e) { return { ok: false, code: 'rpc_error', amount: 0, error: String((e && e.message) || e) }; }
}
/* Đọc số dư Xu tài khoản qua RPC get_my_points_balance (M7). Không tự tính. */
async function refreshAccountBalance() {
  if (!currentUid) { accountBalance = 0; accountBalanceOk = false; return { ok: false, balance: 0 }; }
  try {
    const api = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (!api || !api.client || typeof api.client.rpc !== 'function') { accountBalanceOk = false; return { ok: false, balance: 0 }; }
    const res = await api.client.rpc('get_my_points_balance', {});
    if (res.error) { accountBalanceOk = false; return { ok: false, balance: 0 }; }
    accountBalance = extractBalance(res.data);
    accountBalanceOk = true;
    return { ok: true, balance: accountBalance };
  } catch (e) { accountBalanceOk = false; return { ok: false, balance: 0 }; }
}
/* ĐIỂM NỐI CHI — TRỪ XU MUA ĐỒ GAME (chưa nối, fail-closed).
   Lý do: spend_points (M7) chỉ nhận p_type filter/contact_view/pin
   (xem supabase-migration-reward-points-v2-m7.sql) nên không trừ được tiền
   mua đồ game; gọi bừa sẽ lỗi spend_type_invalid. Khi quyết định nối tiền
   tệ được chốt (Rion, hạn 10/11) + có RPC trừ Xu game (vd xu_game_spend),
   chỉ cần sửa HÀM NÀY: gọi RPC đó, trả {ok:true} khi trừ xong, rồi các
   chỗ gọi (buyShop) tự giao đồ. Tuyệt đối không trừ local rồi báo đã trừ. */
async function spendGameXu(kind, key, price) {
  void kind; void key; void price;
  return { ok: false, code: 'spend_not_linked',
    message: '🛒 Cửa hàng chưa nối sổ cái Xu: mua bằng Xu tài khoản sẽ bật sau khi chốt phương án nối tiền tệ (đang chờ Rion, hạn 10/11) + SQL M16. Chưa trừ Xu, đồ chưa giao. Bạn có thể chơi thử ở chế độ khách để xem nhà/xe mẫu.' };
}
/* Công đức / cấp / kho đồ lưu localStorage THEO TÀI KHOẢN — không lẫn giữa
   các tài khoản trên cùng máy. Khách: duongtam:guest:v1. */
const SAVE_KEY_BASE = 'duongtam';
function saveKey() { return SAVE_KEY_BASE + ':' + (currentUid || 'guest') + ':v1'; }

/* ---------- Kinh tế ---------- */
const START_XU = 100; /* ví Xu CHƠI THỬ của khách chưa đăng nhập — không phải Xu tài khoản, không đổi ra Xu thật */
/* SAVE_KEY cũ ('noi-duong-tam-v1') đã bỏ: dùng saveKey() theo tài khoản (xem khối V2S). */
const ACTIONS = {
  /* Trường `xu` dưới đây CHỈ dùng cho ví chơi thử của khách (guest-only).
     Đã đăng nhập: số Xu lấy từ giá trị RPC xu_game_earn trả về, không dùng số này. */
  thien: { name: 'Thiền tĩnh tâm', emoji: '🧘', durMs: 10000, cdMs: 30000, xu: 20, merit: 10,
    text: 'Ngồi yên, hít vào thật chậm… thở ra thật chậm… Tâm tĩnh thì việc gì cũng sáng. Hoàn thành sau 10 giây.' },
  tuoi: { name: 'Tưới sen', emoji: '💧', durMs: 5000, cdMs: 20000, xu: 8, merit: 5,
    text: 'Tưới mát cho ao sen — sen nở thì lòng cũng nở. Hoàn thành sau 5 giây.' },
  huong: { name: 'Thắp hương lễ Phật', emoji: '🙏', durMs: 8000, cdMs: 30000, xu: 12, merit: 8,
    text: 'Thắp một nén hương, chắp tay cầu an cho gia đình. Khói hương bay lên, lòng nhẹ xuống. Hoàn thành sau 8 giây.' },
};
const HOUSE_LEVELS = [
  null,
  { name: 'Nhà tranh', emoji: '🏚️' },
  { name: 'Nhà ngói', emoji: '🏠', price: 150 },
  { name: 'Nhà sàn khang trang', emoji: '🏡', price: 400 },
];
const COOP_LEVELS = [
  null,
  { name: 'Chuồng tre', emoji: '🛖' },
  { name: 'Chuồng gỗ', emoji: '🐔', price: 120 },
  { name: 'Chuồng mái ngói', emoji: '🏠', price: 300 },
];
const TREES = {
  tre: { name: 'Cây tre', emoji: '🎋', price: 30, max: 4 },
  sen: { name: 'Hoa sen', emoji: '🪷', price: 25, max: 3 },
  hoa: { name: 'Luống hoa', emoji: '🌸', price: 20, max: 5 },
  da: { name: 'Cây đa', emoji: '🌳', price: 60, max: 2 },
};
const VEHICLES = {
  xemay: { name: 'Xe máy', emoji: '🛵', price: 200 },
  oto: { name: 'Ô tô', emoji: '🚗', price: 600 },
};
/* Người dưỡng tâm lớn dần theo tổng công đức tích lũy (§2.4): 3 giai đoạn */
const MED_STAGES = [
  { name: 'Bé', scale: 0.55, need: 0 },
  { name: 'Thiếu niên', scale: 0.8, need: 50 },
  { name: 'Trưởng thành', scale: 1.0, need: 150 },
];
function meditatorStage() {
  return state.merit >= 150 ? 2 : state.merit >= 50 ? 1 : 0;
}

/* ---------- Trạng thái (localStorage) ---------- */
function defaultState() {
  return {
    xu: START_XU, merit: 0,
    house: 1, coop: 1,
    trees: { tre: 0, sen: 0, hoa: 0, da: 0 },
    vehicles: { xemay: false, oto: false },
    cd: { thien: 0, tuoi: 0, huong: 0 }, /* readyAt (ms) — 0 = sẵn sàng */
    seenIntro: false,
    /* V2S: nhiệm vụ ngày + chuỗi ngày + Xu đã nhận hôm nay (số từ RPC trả về). */
    earnedToday: { date: '', thien: 0, tuoi: 0, huong: 0 },
    quest: { date: '', thien: false, tuoi: false, huong: false, claimed: false },
    streak: { lastDate: '', count: 0, claimedDate: '' },
    spendSeq: 0,
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(saveKey());
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (typeof s.xu !== 'number') return defaultState();
    const d0 = defaultState();
    s.trees = { ...d0.trees, ...(s.trees || {}) };
    s.vehicles = { ...d0.vehicles, ...(s.vehicles || {}) };
    s.cd = { ...d0.cd, ...(s.cd || {}) };
    if (!s.house || s.house < 1 || s.house > 3) s.house = 1;
    if (!s.coop || s.coop < 1 || s.coop > 3) s.coop = 1;
    if (typeof s.merit !== 'number') s.merit = 0;
    s.earnedToday = { ...d0.earnedToday, ...(s.earnedToday || {}) };
    s.quest = { ...d0.quest, ...(s.quest || {}) };
    s.streak = { ...d0.streak, ...(s.streak || {}) };
    if (typeof s.spendSeq !== 'number') s.spendSeq = 0;
    return s;
  } catch (e) { return defaultState(); }
}
let state = loadState(); /* let: đổi tài khoản thì nạp lại state theo key mới */
function save() {
  try { localStorage.setItem(saveKey(), JSON.stringify(state)); } catch (e) {}
}

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const stage = $('ndStage');

/* ---------- Renderer / Scene / Camera (công thức 5 lớp AGENTS.md) ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; /* r186 đã bỏ PCFSoftShadowMap */
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
/* Nền trời gradient dọc (xanh trời #BFE3F0 → kem dó #F7F2E6 — §2.2) */
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2; skyCanvas.height = 512;
const sg = skyCanvas.getContext('2d');
const skyGrad = sg.createLinearGradient(0, 0, 0, 512);
skyGrad.addColorStop(0, '#BFE3F0');
skyGrad.addColorStop(0.55, '#DCE9DC');
skyGrad.addColorStop(1, '#F7F2E6');
sg.fillStyle = skyGrad; sg.fillRect(0, 0, 2, 512);
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;
scene.background = skyTex;
scene.fog = new THREE.Fog(0xcfe4ec, 55, 130);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
/* Tâm nhìn mặc định hơi lùi về phía núi (z=-1,5) để dãy núi/đồi hậu cảnh lọt
   vào khung hình ngay khi mở game (§3B-P0) — cổng (z=9) vẫn trong khung. */
const camTarget = new THREE.Vector3(0, 0, -1.5);
const CAM_DIR = new THREE.Vector3(1, 0.9, 1).normalize(); /* y 1,05→0,9: góc nhìn
  hơi bẹt hơn để hậu cảnh (núi/mây) lọt vào khung hình mặc định ở 390px */
let viewSize = 13;
function fitCamera() {
  const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
  const aspect = w / h;
  viewSize = aspect >= 1 ? 13 : Math.min(14 / aspect, 28); /* 13→14: zoom-out
    nhẹ ở dọc để dãy núi hậu cảnh có chỗ trong khung hình */
  camera.left = -viewSize * aspect; camera.right = viewSize * aspect;
  camera.top = viewSize; camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
function placeCamera() {
  camera.position.copy(camTarget).addScaledVector(CAM_DIR, 60);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld(true);
}

/* Ánh sáng: 1 Ambient nhẹ + 1 Directional castShadow — tông ấm hoàng hôn (§3B-P1) */
scene.add(new THREE.AmbientLight(0xfff2d8, 0.55));
const sun = new THREE.DirectionalLight(0xffe8b0, 1.15);
sun.position.set(18, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -26; sun.shadow.camera.right = 26;
sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0006;
scene.add(sun);

/* ---------- Vật liệu (BẮT BUỘC MeshStandardMaterial) ---------- */
function std(color, rough, metal) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.85 : rough, metalness: metal || 0 });
}
const MAT = {
  grass: std(0x79a85b, 0.95),
  grass2: std(0x6b9a4e, 0.95),
  fieldGreen: std(0x5d8f43, 0.95),
  fieldGold: std(0xc9a44b, 0.95),
  fieldGreen2: std(0x6fa055, 0.95),
  dirt: std(0xcbb28a, 0.95),
  soil: std(0x8a5a33, 0.95),
  wood: std(0xa9804e, 0.8),
  woodDark: std(0x7d5a33, 0.8),
  bamboo: std(0xc8a06a, 0.8),
  roofRed: std(0xa34a2e, 0.75),
  roofStraw: std(0xd9b96a, 0.9),
  wallCream: std(0xf2e3c2, 0.9),
  wallWhite: std(0xf7f2e6, 0.9),
  stone: std(0x9a938a, 0.9),
  water: std(0xa8d8f0, 0.35), /* xanh ao #A8D8F0 — bảng "Làng Việt ấm" §2.1 */
  leafGreen: std(0x4f9e3e, 0.85),
  leafDark: std(0x3d7d31, 0.85),
  gold: std(0xd9a441, 0.6),
  white: std(0xf7f2e6, 0.9),
  dark: std(0x3a2c1e, 0.9),
  robeBrown: std(0x7a5a3a, 0.85),
  skinTone: std(0xe8b98a, 0.7),
  hairDark: std(0x2b2118, 0.9),
  lotusPink: std(0xe58aa8, 0.7),
  lotusPink2: std(0xef9db8, 0.7),
  lotusGold: std(0xf2c230, 0.6),
  flowerRed: std(0xe05a5a, 0.7),
  flowerYellow: std(0xf2c230, 0.7),
  flowerPurple: std(0x9a6bc0, 0.7),
  mountainFar: std(0x6b8a99, 1), /* xanh lam khói — tách khỏi cỏ, vẫn trong sương */
  mountainMid: std(0x557f52, 1), /* xanh đậm hơn cỏ — đọc rõ là đồi */
  mountainNear: std(0x5d8f5a, 1),
  hillGreen: std(0x6fa055, 0.95),
  bikeRed: std(0xc0392b, 0.5, 0.3),
  bikeChrome: std(0xc8ccd2, 0.3, 0.7),
  tireDark: std(0x2b1d14, 0.9), /* nâu đen #2B1D14 — không dùng đen tuyệt đối (§2.1) */
  carBlue: std(0x3a7bd5, 0.45, 0.2),
  carGlass: std(0x9fc8e8, 0.25, 0.1),
  incense: std(0x8a4a2a, 0.8),
  smoke: std(0xffffff, 1),
};
function box(w, h, d, mat, x, y, z, parent, shadow) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow !== false; m.receiveShadow = true;
  (parent || scene).add(m); return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg, shadow) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat);
  m.position.set(x, y, z); m.castShadow = shadow !== false; m.receiveShadow = true;
  (parent || scene).add(m); return m;
}
function cone(r, h, mat, x, y, z, parent, seg, shadow) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 8), mat);
  m.position.set(x, y, z); m.castShadow = shadow !== false;
  (parent || scene).add(m); return m;
}
/* Mái ngói 2 dốc: lăng trụ tam giác (extrude) + sống mái */
function gableRoof(w, d, h, mat, x, y, z, parent) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m);
  box(w * 0.18, 0.16, d + 0.3, MAT.woodDark, x, y + h + 0.02, z, parent);
  return m;
}
function clearGroup(g) {
  while (g.children.length) {
    const c = g.children[0];
    g.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

/* ============================================================================
   PHONG CẢNH — núi đồi, ruộng vườn mênh mông, ao sen, đường mòn
   ============================================================================ */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), MAT.grass);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);
/* mảng cỏ đậm nhạt xen kẽ */
for (let i = 0; i < 22; i++) {
  const px = -20 + (i % 6) * 8 + (Math.random() * 2 - 1);
  const pz = -12 + Math.floor(i / 6) * 7 + (Math.random() * 2 - 1);
  if (Math.abs(px) < 12 && pz > -9 && pz < 9) continue;
  const patch = new THREE.Mesh(new THREE.CircleGeometry(2.2 + Math.random(), 10), MAT.grass2);
  patch.rotation.x = -Math.PI / 2; patch.position.set(px, 0.01, pz); patch.receiveShadow = true;
  scene.add(patch);
}
/* --- Dãy núi xa (hậu cảnh, trong sương) — đủ gần + đủ cao để đỉnh núi lọt
   vào khung hình mặc định ở 390px (§3B-P0: ≥3 ngọn, ~25% chiều cao khung).
   Lưu ý hình học camera isometric (nhìn từ +x,+z): vật ở z càng âm càng bị
   đẩy sang TRÁI màn hình, nên dãy núi phải đặt lệch trái (x -42..-6) mới
   lọt khung; đỉnh cao bị cắt ở mép trên là đúng ý đồ (núi vươn khỏi khung). --- */
function mountain(x, z, r, h, mat) {
  const m = cone(r, h, mat, x, h / 2 - 0.5, z, scene, 7);
  m.castShadow = false;
  /* đỉnh tuyết/mây: chóp nhạt */
  const cap = cone(r * 0.32, h * 0.22, std(0xe8e4d8, 1), x, h - h * 0.11 - 0.5, z, scene, 7);
  cap.castShadow = false;
  return m;
}
mountain(-42, -26, 12, 16, MAT.mountainFar);
mountain(-30, -28, 16, 21, MAT.mountainFar);
mountain(-18, -27, 18, 22, MAT.mountainFar);
mountain(-6, -25, 14, 19, MAT.mountainFar);
/* --- Đồi gần hơn (xanh hơn, rõ hơn) --- */
mountain(-22, -21, 9, 13, MAT.mountainMid);
mountain(-8, -22, 10, 14, MAT.mountainMid);
mountain(10, -21, 9, 13, MAT.mountainMid);
mountain(24, -20, 8, 12, MAT.mountainMid);
mountain(-33, -19, 7, 10, MAT.mountainMid);
mountain(35, -19, 7, 10, MAT.mountainMid);
/* đồi 2 bên sườn */
mountain(-32, -10, 7, 7, MAT.hillGreen);
mountain(33, -8, 7, 7, MAT.hillGreen);
mountain(-30, 8, 6, 6, MAT.hillGreen);
mountain(32, 10, 6, 6, MAT.hillGreen);
/* --- Mây trôi trên núi (chuyển động môi trường §3B-P1) --- */
const clouds = [];
function makeCloud(x, y, z, s, speed) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const cm = std(0xf5f2ea, 1); cm.fog = false; /* mây giữ trắng sò, không bị sương nuốt */
  for (const [ox, oy, oz, r] of [[0, 0, 0, 1.6], [1.5, -0.2, 0.3, 1.2], [-1.5, -0.25, -0.2, 1.1], [0.4, 0.5, -0.3, 1.0]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cm);
    m.position.set(ox, oy, oz); m.scale.y = 0.55; m.castShadow = false; g.add(m);
  }
  g.scale.setScalar(s);
  scene.add(g);
  clouds.push({ g, speed });
}
/* Mây: đặt TRƯỚC dãy núi (z -13..-18, y 10–14) để hiện trước mặt đồi thay vì
   bị đồi che — mây ở z -23..-26 cũ nằm sau đồi nên không bao giờ thấy được
   trong khung mặc định. y thấp dần về phía trái (hình học isometric đẩy vật
   trái lên cao). Trôi chậm (0,12–0,22) để ở lâu trong dải nhìn thấy. */
makeCloud(-16, 10, -16, 1.6, 0.16);
makeCloud(-6, 14, -18, 2.0, 0.12);
makeCloud(2, 13, -14, 1.3, 0.20);
makeCloud(4, 14, -17, 1.5, 0.14);
makeCloud(-10, 11, -13, 1.1, 0.22);
/* --- Ruộng vườn mênh mông: các thửa ruộng lớn ngoài hàng rào --- */
function fieldPatch(x, z, w, d, mat, furrows) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  p.rotation.x = -Math.PI / 2; p.position.set(x, 0.02, z); p.receiveShadow = true;
  scene.add(p);
  if (furrows) {
    const n = Math.floor(w / 1.4);
    for (let i = 0; i < n; i++) {
      const fx = x - w / 2 + 0.7 + i * 1.4;
      box(0.5, 0.08, d - 0.6, MAT.soil, fx, 0.04, z, scene, false);
    }
  }
  return p;
}
fieldPatch(-19, 3, 11, 8, MAT.fieldGreen, true);
fieldPatch(19, -3, 11, 8, MAT.fieldGold, true);
fieldPatch(-18, -13, 12, 7, MAT.fieldGold, true);
fieldPatch(18, 9, 11, 7, MAT.fieldGreen2, true);
fieldPatch(-20, 13, 10, 6, MAT.fieldGreen2, false);
fieldPatch(20, -13, 10, 6, MAT.fieldGreen, false);
fieldPatch(0, -14, 14, 5, MAT.fieldGreen, true);
/* lúa non mọc lốm đốm trên ruộng */
for (let i = 0; i < 40; i++) {
  const spots = [[-19, 3, 11, 8], [19, -3, 11, 8], [-18, -13, 12, 7], [18, 9, 11, 7], [0, -14, 14, 5]];
  const s = spots[i % spots.length];
  const px = s[0] + (Math.random() - 0.5) * (s[2] - 1);
  const pz = s[1] + (Math.random() - 0.5) * (s[3] - 1);
  const tuft = cone(0.14, 0.55 + Math.random() * 0.3, MAT.leafGreen, px, 0.28, pz, scene, 5, false);
  tuft.rotation.z = (Math.random() - 0.5) * 0.3;
}
/* --- Đường đất trong vườn --- */
function dirtPath(x1, z1, x2, z2, w) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, len), MAT.dirt);
  p.rotation.x = -Math.PI / 2; p.rotation.z = -Math.atan2(dx, dz);
  p.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2); p.receiveShadow = true;
  scene.add(p);
}
dirtPath(6.5, -1.5, 0.5, 2.5, 1.6);
dirtPath(0.5, 2.5, -4, -1.2, 1.4);
dirtPath(-2.5, -3.5, -2.5, -6.2, 1.2);
dirtPath(0.5, 2.5, 1, 9, 1.6); /* đường mòn xuống cổng (§3B-P2) */
/* --- Hàng rào quanh vườn nhà --- */
function fenceRun(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.max(2, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    cyl(0.06, 0.07, 0.9, MAT.woodDark, x1 + dx * t, 0.45, z1 + dz * t, scene, 6, false);
  }
  const rail = box(0.08, 0.08, len, MAT.wood, (x1 + x2) / 2, 0.62, (z1 + z2) / 2, scene, false);
  rail.rotation.y = -Math.atan2(dx, dz);
}
fenceRun(-11, -8.5, 11, -8.5);
fenceRun(-11, -8.5, -11, 9);
fenceRun(11, -8.5, 11, 9);
fenceRun(-11, 9, -2, 9);
fenceRun(4, 9, 11, 9);
/* --- Đèn lồng đỏ son dọc đường xuống cổng (§3B-P2: ≥2 đèn lồng) --- */
function makeLantern(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  cyl(0.06, 0.08, 1.7, MAT.woodDark, 0, 0.85, 0, g, 6, false);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), std(0xc0392b, 0.6));
  lamp.scale.set(1, 1.25, 1); lamp.position.set(0, 1.85, 0); lamp.castShadow = true; g.add(lamp);
  cone(0.3, 0.18, MAT.roofStraw, 0, 2.2, 0, g, 8, false);
  g.traverse((o) => { o.userData.type = 'lantern'; });
  return g;
}
makeLantern(-1.6, 7.2); makeLantern(3.6, 7.2);
/* --- Giếng đá cạnh vườn --- */
(function makeWell() {
  const g = new THREE.Group(); g.position.set(4.5, 0, -8.3); scene.add(g);
  cyl(0.55, 0.6, 0.8, MAT.stone, 0, 0.4, 0, g, 12);
  cyl(0.45, 0.45, 0.1, std(0x2b4a5a, 0.4), 0, 0.82, 0, g, 12, false);
  for (const s of [-1, 1]) cyl(0.05, 0.06, 1.5, MAT.woodDark, s * 0.55, 0.75, 0, g, 6, false);
  gableRoof(1.5, 1.0, 0.5, MAT.roofStraw, 0, 1.5, 0, g);
  g.traverse((o) => { o.userData.type = 'well'; });
})();
/* --- Đá + bụi rậm lấp mảng cỏ trống (§2.3: mảng trống lớn nhất < 2 ô ruộng) --- */
for (const [sx, sz, sr] of [[-6, 6.5, 0.4], [8, -7.5, 0.5], [-13, 1, 0.35], [13, -2, 0.45]]) {
  const st = new THREE.Mesh(new THREE.SphereGeometry(sr, 8, 6), MAT.stone);
  st.scale.y = 0.6; st.position.set(sx, sr * 0.35, sz); st.receiveShadow = true; scene.add(st);
}
for (const [bx, bz] of [[-13.5, -8], [13.8, -8.5]]) {
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), MAT.leafDark);
  bush.scale.set(1.2, 0.75, 1.2); bush.position.set(bx, 0.55, bz); bush.castShadow = true; scene.add(bush);
}
/* hoa dọc đường xuống cổng */
for (let i = 0; i < 6; i++) {
  const fm = [MAT.flowerRed, MAT.flowerYellow, MAT.flowerPurple][i % 3];
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), fm);
  const fx = [-1.5, 3, -2, 2.8, -1, 3.2][i], fz = [5.5, 5.8, 3.2, 3.5, 8.6, 8.6][i];
  f.position.set(fx, 0.15, fz); scene.add(f);
}
/* --- Ao sen --- */
const pond = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), MAT.water);
pond.rotation.x = -Math.PI / 2; pond.position.set(-7, 0.02, -4); pond.receiveShadow = true;
pond.userData.type = 'pond';
scene.add(pond);
const pondLeaves = [];
for (let i = 0; i < 5; i++) {
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.55 + Math.random() * 0.3, 8), MAT.leafDark);
  leaf.rotation.x = -Math.PI / 2;
  leaf.position.set(-7 + (Math.random() * 3.4 - 1.7), 0.04, -4 + (Math.random() * 3.4 - 1.7));
  scene.add(leaf);
  pondLeaves.push(leaf);
}
/* bèo + lá sen trôi nhẹ trên ao — nước gợn (§3B-P1) */
const pondFloaters = [];
for (const leaf of pondLeaves)
  pondFloaters.push({ mesh: leaf, bx: leaf.position.x, bz: leaf.position.z, phase: Math.random() * 6.28, amp: 0.25 });
for (let i = 0; i < 3; i++) {
  const dw = new THREE.Mesh(new THREE.CircleGeometry(0.28, 8), MAT.leafGreen);
  dw.rotation.x = -Math.PI / 2;
  const bx = -7 + (Math.random() * 3 - 1.5), bz = -4 + (Math.random() * 3 - 1.5);
  dw.position.set(bx, 0.05, bz);
  scene.add(dw);
  pondFloaters.push({ mesh: dw, bx, bz, phase: Math.random() * 6.28, amp: 0.35 });
}
/* --- Cầu gỗ bắc qua ao sen (§3B-P1) — bấm cầu = tưới sen --- */
const bridgeGroup = new THREE.Group();
scene.add(bridgeGroup);
for (let i = 0; i < 5; i++) {
  const bx = -9.4 + i * 1.2;
  const by = 0.32 + 0.22 * Math.cos(((bx + 7) / 2.4) * Math.PI / 2);
  const plank = box(1.05, 0.1, 0.7, MAT.wood, bx, by, -4, bridgeGroup, false);
  plank.userData.type = 'pond';
}
for (const s of [-1, 1]) {
  const p1 = cyl(0.07, 0.08, 0.9, MAT.woodDark, -9.6, 0.45, -4 + s * 0.45, bridgeGroup, 6, false);
  p1.userData.type = 'pond';
  const p2 = cyl(0.07, 0.08, 0.9, MAT.woodDark, -4.4, 0.45, -4 + s * 0.45, bridgeGroup, 6, false);
  p2.userData.type = 'pond';
}
function makeLotus(x, z, parent) {
  const g = new THREE.Group(); g.position.set(x, 0.1, z); (parent || scene).add(g);
  const bud = cone(0.26, 0.55, MAT.lotusPink, 0, 0.35, 0, g, 6);
  bud.rotation.x = Math.PI;
  for (let i = 0; i < 5; i++) {
    const petal = cone(0.13, 0.42, MAT.lotusPink2, Math.sin(i * 1.26) * 0.24, 0.22, Math.cos(i * 1.26) * 0.24, g, 5, false);
    petal.rotation.z = Math.sin(i * 1.26) * 0.5;
    petal.rotation.x = -Math.cos(i * 1.26) * 0.5;
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), MAT.lotusGold);
  heart.position.y = 0.42; g.add(heart);
  return g;
}
const lotusGroup = new THREE.Group();
scene.add(lotusGroup);
const LOTUS_SPOTS = [[-7, -4], [-8.3, -3.1], [-5.8, -3.2], [-6.4, -5.2]];
function renderLotus() {
  clearGroup(lotusGroup);
  const n = 1 + state.trees.sen; /* 1 bông sẵn + sen mua thêm */
  for (let i = 0; i < Math.min(n, LOTUS_SPOTS.length); i++)
    makeLotus(LOTUS_SPOTS[i][0], LOTUS_SPOTS[i][1], lotusGroup);
  lotusGroup.traverse((o) => { o.userData.type = 'pond'; });
}
/* --- Bàn thờ nhỏ (thắp hương) --- */
const shrine = new THREE.Group();
shrine.position.set(-2.5, 0, -6.5);
scene.add(shrine);
box(1.6, 0.25, 1.0, MAT.stone, 0, 0.12, 0, shrine);
box(1.3, 0.9, 0.7, MAT.wood, 0, 0.7, 0, shrine);
box(1.5, 0.12, 0.9, MAT.woodDark, 0, 1.2, 0, shrine);
gableRoof(1.9, 1.2, 0.55, MAT.roofRed, 0, 1.26, 0, shrine);
const incensePot = cyl(0.22, 0.16, 0.2, MAT.incense, 0, 1.36, 0.25, shrine, 10);
const incenseSticks = [];
for (let i = -1; i <= 1; i++) {
  const st = cyl(0.02, 0.02, 0.55, MAT.incense, i * 0.08, 1.65, 0.25, shrine, 5, false);
  st.rotation.z = i * 0.08;
  incenseSticks.push(st);
}
const smokePuffs = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xf5f2ea, transparent: true, opacity: 0.35, roughness: 1 }));
  m.position.set(-2.5 + (i - 1) * 0.08, 2.1 + i * 0.35, -6.25);
  m.castShadow = false;
  scene.add(m);
  smokePuffs.push({ mesh: m, phase: i / 3 });
}
shrine.traverse((o) => { o.userData.type = 'shrine'; });
/* --- Cây cối có sẵn trong vườn --- */
function bananaTree(x, z, parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); (parent || scene).add(g);
  cyl(0.14, 0.2, 2.2, std(0x9a7d4f, 0.85), 0, 1.1, 0, g, 8);
  for (let i = 0; i < 6; i++) {
    const leaf = box(0.5, 0.04, 1.7, MAT.leafGreen, 0, 2.3, 0, g, false);
    leaf.position.set(Math.sin(i * 1.05) * 0.8, 2.35, Math.cos(i * 1.05) * 0.8);
    leaf.rotation.y = i * 1.05; leaf.rotation.x = 0.5;
  }
  return g;
}
function bambooCluster(x, z, parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); (parent || scene).add(g);
  for (let i = 0; i < 5; i++) {
    const bx = (Math.random() - 0.5) * 0.8, bz = (Math.random() - 0.5) * 0.8;
    cyl(0.05, 0.07, 3 + Math.random() * 1.2, std(0x6f9e4f, 0.85), bx, 1.7, bz, g, 6);
    cone(0.35, 0.9, MAT.leafDark, bx, 3.6, bz, g, 6, false);
  }
  return g;
}
function bigTree(x, z, parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); (parent || scene).add(g);
  cyl(0.22, 0.32, 2.4, MAT.woodDark, 0, 1.2, 0, g, 8);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 10), MAT.leafGreen);
  crown.position.y = 3.4; crown.scale.set(1.25, 0.85, 1.25); crown.castShadow = true; g.add(crown);
  const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), MAT.leafDark);
  crown2.position.set(0.9, 2.8, 0.4); crown2.castShadow = true; g.add(crown2);
  return g;
}
/* cây đung đưa nhẹ (§3B-P1) — danh sách cây gốc, xoay nhẹ quanh gốc */
const swayList = [];
swayList.push({ g: bananaTree(10, -6.5, scene), phase: 0 });
swayList.push({ g: bananaTree(-10.5, 6.5, scene), phase: 1.3 });
swayList.push({ g: bambooCluster(-10, -7, scene), phase: 2.1 });
swayList.push({ g: bambooCluster(10.5, 7.5, scene), phase: 3.0 });
swayList.push({ g: bigTree(-10.8, -2.5, scene), phase: 4.2 });
for (let i = 0; i < 8; i++) {
  const fm = [MAT.flowerRed, MAT.flowerYellow, MAT.flowerPurple][i % 3];
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), fm);
  f.position.set(-10 + Math.random() * 8, 0.14, 8.2 + (Math.random() - 0.5) * 0.5);
  scene.add(f);
}
for (const [px, pz] of [[4.2, -2.2], [4.7, -1.6], [-9.5, -1.5]]) {
  const pot = cyl(0.28, 0.2, 0.55, std(0x8a4a2a, 0.8), px, 0.28, pz, scene, 10);
  pot.userData.type = 'pot';
}

/* ============================================================================
   NHÀ — 3 cấp, đổi model theo cấp mua
   ============================================================================ */
const houseGroup = new THREE.Group();
houseGroup.position.set(6.5, 0, -4.5);
scene.add(houseGroup);
function buildHouse(level) {
  clearGroup(houseGroup);
  if (level === 1) {
    /* Nhà tranh: vách tre, mái rơm */
    box(3.2, 1.6, 2.6, MAT.bamboo, 0, 0.8, 0, houseGroup);
    box(0.7, 1.2, 0.08, MAT.dark, -0.5, 0.6, 1.32, houseGroup);
    box(0.7, 0.6, 0.06, std(0x2e4a6b, 0.4), 0.7, 1.0, 1.32, houseGroup);
    gableRoof(3.8, 3.2, 1.2, MAT.roofStraw, 0, 1.6, 0, houseGroup);
    box(0.5, 0.4, 0.5, MAT.stone, 1.4, 0.2, 1.6, houseGroup);
  } else if (level === 2) {
    /* Nhà ngói: tường vôi, mái ngói đỏ, cửa sổ */
    box(4.4, 2.2, 3.4, MAT.wallCream, 0, 1.1, 0, houseGroup);
    box(0.9, 1.7, 0.1, MAT.dark, -0.8, 0.85, 1.72, houseGroup);
    box(0.9, 0.8, 0.08, std(0x2e4a6b, 0.4), 1.2, 1.3, 1.72, houseGroup);
    box(0.9, 0.8, 0.08, std(0x2e4a6b, 0.4), -1.8, 1.3, 0.1, houseGroup);
    box(4.8, 0.2, 3.8, MAT.woodDark, 0, 2.3, 0, houseGroup);
    gableRoof(5.0, 4.0, 1.6, MAT.roofRed, 0, 2.4, 0, houseGroup);
    for (let i = 0; i < 3; i++) box(1.0, 0.16, 0.4, MAT.wood, -0.8, 0.25 + i * 0.45, 2.1 + i * 0.3, houseGroup);
    const pot2 = cyl(0.3, 0.22, 0.6, std(0x8a4a2a, 0.8), 2.3, 0.3, 1.4, houseGroup, 10);
    pot2.userData.type = 'pot';
  } else {
    /* Nhà sàn khang trang: cột cao, sàn rộng, mái ngói đỏ lớn */
    for (const [sx, sz] of [[-2, -1.5], [0, -1.5], [2, -1.5], [-2, 1.5], [0, 1.5], [2, 1.5]])
      cyl(0.09, 0.11, 1.3, MAT.woodDark, sx, 0.65, sz, houseGroup, 8);
    box(5.2, 0.28, 4, MAT.wood, 0, 1.42, 0, houseGroup);
    box(4.6, 1.9, 3.4, MAT.bamboo, 0, 2.5, 0, houseGroup);
    box(0.9, 1.5, 0.1, MAT.dark, -0.8, 2.35, 1.72, houseGroup);
    box(0.9, 0.8, 0.08, std(0x2e4a6b, 0.4), 1.2, 2.7, 1.72, houseGroup);
    box(0.9, 0.8, 0.08, std(0x2e4a6b, 0.4), -1.9, 2.7, 0.1, houseGroup);
    box(5.6, 0.18, 4.4, MAT.woodDark, 0, 3.55, 0, houseGroup);
    gableRoof(5.8, 4.6, 1.7, MAT.roofRed, 0, 3.6, 0, houseGroup);
    for (let i = 0; i < 3; i++) box(1.1, 0.16, 0.4, MAT.wood, -0.8, 0.25 + i * 0.45, 2.3 + i * 0.35, houseGroup);
    /* đèn lồng đỏ trước hiên */
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), std(0xc0392b, 0.6));
    lantern.scale.set(1, 1.25, 1); lantern.position.set(1.9, 3.1, 1.9); lantern.castShadow = true;
    houseGroup.add(lantern);
  }
  houseGroup.traverse((o) => { o.userData.type = 'house'; });
}

/* ============================================================================
   CHUỒNG — 3 cấp + 2 gà đi lại trong sân
   ============================================================================ */
const COOP = { x0: 3.2, x1: 8.8, z0: 2.4, z1: 6.6 };
const coopGroup = new THREE.Group();
coopGroup.position.set(6, 0, 4.5);
scene.add(coopGroup);
function coopFence(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.max(2, Math.round(len / 1.1));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    cyl(0.05, 0.06, 0.8, MAT.woodDark, x1 + dx * t - 6, 0.4, z1 + dz * t - 4.5, coopGroup, 6, false);
  }
  const rail = box(0.07, 0.07, len, MAT.wood, (x1 + x2) / 2 - 6, 0.55, (z1 + z2) / 2 - 4.5, coopGroup, false);
  rail.rotation.y = -Math.atan2(dx, dz);
}
coopFence(COOP.x0, COOP.z0, COOP.x1, COOP.z0);
coopFence(COOP.x0, COOP.z1, COOP.x1, COOP.z1);
coopFence(COOP.x0, COOP.z0, COOP.x0, COOP.z1);
coopFence(COOP.x1, COOP.z0, COOP.x1, COOP.z1);
/* máng ăn trong chuồng — tạo 1 lần, không nằm trong buildCoop (tránh nhân đôi) */
const coopBowl = cyl(0.45, 0.32, 0.22, MAT.woodDark, -1.2, 0.11, 0.6, coopGroup, 12);
coopBowl.userData.type = 'coop';
const coopHut = new THREE.Group();
coopGroup.add(coopHut);
function buildCoop(level) {
  clearGroup(coopHut);
  if (level === 1) {
    box(1.6, 1.0, 1.3, MAT.bamboo, 2.1, 0.5, -1.3, coopHut);
    gableRoof(1.9, 1.6, 0.6, MAT.roofStraw, 2.1, 1.0, -1.3, coopHut);
  } else if (level === 2) {
    box(2.0, 1.3, 1.5, MAT.wood, 2.1, 0.65, -1.3, coopHut);
    gableRoof(2.3, 1.8, 0.7, MAT.roofStraw, 2.1, 1.3, -1.3, coopHut);
    box(0.6, 0.9, 0.08, MAT.dark, 2.1, 0.45, -0.52, coopHut);
  } else {
    box(2.4, 1.6, 1.8, MAT.wallCream, 2.1, 0.8, -1.3, coopHut);
    gableRoof(2.7, 2.1, 0.9, MAT.roofRed, 2.1, 1.6, -1.3, coopHut);
    box(0.7, 1.1, 0.08, MAT.dark, 2.1, 0.55, -0.38, coopHut);
    box(0.7, 0.6, 0.06, std(0x2e4a6b, 0.4), 1.4, 1.1, -0.38, coopHut);
  }
  coopHut.traverse((o) => { o.userData.type = 'coop'; });
}
const ANIMAL_HOME = [[5.2, 3.6], [7.4, 5.6]];
const animals = [];
function makeChicken(colorMat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), colorMat);
  body.scale.set(1, 0.85, 1.25); body.position.y = 0.42; body.castShadow = true;
  g.add(body);
  const head = new THREE.Group(); head.position.set(0, 0.72, 0.36); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), colorMat);
  skull.castShadow = true; head.add(skull);
  const beak = cone(0.06, 0.18, std(0xe08a2e, 0.6), 0, -0.02, 0.22, head, 6);
  beak.rotation.x = Math.PI / 2;
  const comb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xc0392b, 0.6));
  comb.scale.set(1, 0.7, 1.4); comb.position.set(0, 0.16, 0); head.add(comb);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), colorMat);
    wing.scale.set(0.25, 0.7, 0.9); wing.position.set(s * 0.32, 0.45, 0); wing.castShadow = true;
    g.add(wing);
    cyl(0.025, 0.025, 0.22, std(0xe08a2e, 0.6), s * 0.12, 0.11, 0, g, 5);
  }
  const tail = cone(0.16, 0.5, colorMat, 0, 0.62, -0.42, g, 5);
  tail.rotation.x = -0.9;
  return { group: g, head };
}
for (let i = 0; i < 2; i++) {
  const ch = makeChicken(i === 0 ? MAT.white : std(0xb07a45, 0.9));
  ch.group.position.set(ANIMAL_HOME[i][0], 0, ANIMAL_HOME[i][1]);
  ch.group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(ch.group);
  ch.group.traverse((o) => { o.userData.type = 'animal'; o.userData.animalId = i; });
  animals.push({ ...ch, id: i, target: null, waitT: 1 + Math.random() * 2, peckT: 0, speed: 0.45 + Math.random() * 0.15 });
}

/* ============================================================================
   NGƯỜI THIỀN — ngồi kiết già bên ao sen, thở chậm theo nhịp
   ============================================================================ */
const meditator = new THREE.Group();
meditator.position.set(-4, 0, -1.2);
meditator.rotation.y = Math.PI * 0.78; /* quay mặt về ao sen */
scene.add(meditator);
const medTorso = box(0.62, 0.62, 0.4, MAT.robeBrown, 0, 0.62, 0, meditator);
medTorso.castShadow = true;
const medLap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.28, 10), MAT.robeBrown);
medLap.position.y = 0.28; medLap.castShadow = true; meditator.add(medLap);
const medHead = new THREE.Group(); medHead.position.set(0, 1.12, 0); meditator.add(medHead);
const medSkull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), MAT.skinTone);
medSkull.castShadow = true; medHead.add(medSkull);
const medHair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), MAT.hairDark);
medHair.scale.set(1, 0.6, 1); medHair.position.set(0, 0.1, -0.04); medHead.add(medHair);
const medBun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), MAT.hairDark);
medBun.position.set(0, 0.28, -0.05); medHead.add(medBun);
for (const s of [-1, 1]) {
  const arm = box(0.13, 0.5, 0.15, MAT.robeBrown, s * 0.32, 0.72, 0.12, meditator);
  arm.rotation.x = 0.5; arm.rotation.z = -s * 0.25;
}
const medHands = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), MAT.skinTone);
medHands.scale.set(1.4, 0.6, 1); medHands.position.set(0, 0.48, 0.22); meditator.add(medHands);
meditator.traverse((o) => { o.userData.type = 'meditator'; });

/* ============================================================================
   XE — xe máy rồi ô tô, hiện trong sân khi mua
   ============================================================================ */
const vehicleGroup = new THREE.Group();
scene.add(vehicleGroup);
function makeMotorbike() {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.09, 8, 18);
  for (const wx of [-0.62, 0.62]) {
    const w = new THREE.Mesh(wheelGeo, MAT.tireDark);
    w.position.set(wx, 0.32, 0); w.rotation.y = Math.PI / 2; w.castShadow = true; g.add(w);
    const hub = cyl(0.1, 0.1, 0.06, MAT.bikeChrome, wx, 0.32, 0, g, 8);
    hub.rotation.z = Math.PI / 2;
  }
  box(1.15, 0.22, 0.3, MAT.bikeRed, 0, 0.55, 0, g);
  box(0.4, 0.28, 0.32, MAT.bikeRed, -0.25, 0.72, 0, g);
  box(0.55, 0.1, 0.3, MAT.dark, 0.35, 0.68, 0, g); /* yên */
  const handle = cyl(0.03, 0.03, 0.55, MAT.bikeChrome, 0.62, 0.95, 0, g, 6);
  handle.rotation.z = Math.PI / 2;
  const mirror = box(0.06, 0.14, 0.05, MAT.dark, 0.62, 1.05, 0.12, g, false);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), std(0xffe9a8, 0.3));
  lamp.position.set(0.68, 0.62, 0); g.add(lamp);
  return g;
}
function makeCar() {
  const g = new THREE.Group();
  box(2.6, 0.55, 1.3, MAT.carBlue, 0, 0.55, 0, g);
  box(1.4, 0.55, 1.2, MAT.carBlue, -0.2, 1.05, 0, g);
  box(1.3, 0.4, 1.22, MAT.carGlass, -0.2, 1.02, 0, g);
  for (const [wx, wz] of [[-0.85, 0.62], [0.85, 0.62], [-0.85, -0.62], [0.85, -0.62]]) {
    const w = cyl(0.3, 0.3, 0.18, MAT.tireDark, wx, 0.3, wz, g, 12);
    w.rotation.x = Math.PI / 2;
    const hub = cyl(0.13, 0.13, 0.2, MAT.bikeChrome, wx, 0.3, wz, g, 8);
    hub.rotation.x = Math.PI / 2;
  }
  box(0.5, 0.12, 0.2, std(0xffe9a8, 0.3), 1.32, 0.55, 0.4, g, false);
  box(0.5, 0.12, 0.2, std(0xffe9a8, 0.3), 1.32, 0.55, -0.4, g, false);
  return g;
}
const BIKE_POS = [9.0, -1.5], CAR_POS = [5.2, -1.2];
let bikeMesh = null, carMesh = null;
function renderVehicles() {
  if (bikeMesh) { vehicleGroup.remove(bikeMesh); bikeMesh = null; }
  if (carMesh) { vehicleGroup.remove(carMesh); carMesh = null; }
  if (state.vehicles.xemay) {
    bikeMesh = makeMotorbike();
    bikeMesh.position.set(BIKE_POS[0], 0, BIKE_POS[1]);
    bikeMesh.rotation.y = 0.4;
    bikeMesh.traverse((o) => { o.userData.type = 'vehicle'; o.userData.vehicle = 'xemay'; });
    vehicleGroup.add(bikeMesh);
  }
  if (state.vehicles.oto) {
    carMesh = makeCar();
    carMesh.position.set(CAR_POS[0], 0, CAR_POS[1]);
    carMesh.rotation.y = -0.15;
    carMesh.traverse((o) => { o.userData.type = 'vehicle'; o.userData.vehicle = 'oto'; });
    vehicleGroup.add(carMesh);
  }
}

/* ============================================================================
   CÂY MUA THÊM — tre / luống hoa / cây đa (vị trí cố định trong vườn)
   ============================================================================ */
const TRE_SPOTS = [[-11.5, -2.5], [-11, 3], [11.5, -6], [11, 6.5]];
const HOA_SPOTS = [[-4.5, 7.8], [3.5, 8.2], [-9, -6.8], [9.5, 7.8], [1.5, -8.2]];
const DA_SPOTS = [[-12, -5], [12.5, 2.5]];
const boughtTreesGroup = new THREE.Group();
scene.add(boughtTreesGroup);
function makeFlowerBed(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), MAT.soil);
  bed.rotation.x = -Math.PI / 2; bed.position.y = 0.03; bed.receiveShadow = true; g.add(bed);
  for (let i = 0; i < 7; i++) {
    const fm = [MAT.flowerRed, MAT.flowerYellow, MAT.flowerPurple][i % 3];
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), fm);
    const a = (i / 7) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.55, 0.16, Math.sin(a) * 0.55);
    g.add(f);
    cyl(0.02, 0.02, 0.16, MAT.leafDark, Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55, g, 5, false);
  }
  return g;
}
function renderBoughtTrees() {
  clearGroup(boughtTreesGroup);
  for (let i = 0; i < state.trees.tre; i++)
    bambooCluster(TRE_SPOTS[i][0], TRE_SPOTS[i][1], boughtTreesGroup);
  for (let i = 0; i < state.trees.hoa; i++)
    boughtTreesGroup.add(makeFlowerBed(HOA_SPOTS[i][0], HOA_SPOTS[i][1]));
  for (let i = 0; i < state.trees.da; i++)
    bigTree(DA_SPOTS[i][0], DA_SPOTS[i][1], boughtTreesGroup);
  boughtTreesGroup.traverse((o) => { o.userData.type = 'tree'; });
}

/* ---------- Toast ---------- */
let toastTimer = 0;
function toast(msg) {
  const t = $('ndToast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------- HUD ---------- */
function cdLeft(kind) {
  return Math.max(0, state.cd[kind] - Date.now());
}
function updateHUD() {
  /* Số dư Xu: đã đăng nhập = số dư tài khoản qua RPC; khách = ví chơi thử local. */
  $('ndXu').textContent = currentUid
    ? (accountBalanceOk ? accountBalance.toLocaleString('vi-VN') : '…')
    : state.xu.toLocaleString('vi-VN');
  $('ndMerit').textContent = state.merit.toLocaleString('vi-VN');
  /* huy hiệu giai đoạn người dưỡng tâm (§3B-P2) */
  const gs = meditatorStage();
  const next = MED_STAGES[gs + 1];
  const growEl = $('ndGrow');
  if (growEl) growEl.textContent = MED_STAGES[gs].name + (next ? ' · ' + state.merit + '/' + next.need : ' · đã trưởng thành');
  for (const kind of ['thien', 'tuoi', 'huong']) {
    const btn = $('ndAct' + kind[0].toUpperCase() + kind.slice(1));
    const left = cdLeft(kind);
    const small = btn.querySelector('small');
    if (left > 0) {
      btn.disabled = true;
      if (small) small.textContent = 'Nghỉ ' + Math.ceil(left / 1000) + 's nữa';
    } else {
      btn.disabled = !!activeSession;
      const a = ACTIONS[kind];
      if (small) {
        if (currentUid) {
          /* Đã đăng nhập: số Xu HIỂN THỊ từ giá trị RPC đã trả về hôm nay
             (không hardcode 20/8/12); chưa nhận thì chỉ ghi "Xu về tài khoản". */
          const got = state.earnedToday && state.earnedToday.date === dayKeySaigon(new Date())
            ? state.earnedToday[kind] : 0;
          small.textContent = got > 0
            ? 'Đã nhận +' + got + ' Xu hôm nay · +' + a.merit + ' công đức'
            : '+' + a.merit + ' công đức · Xu về tài khoản';
        } else {
          small.textContent = '+' + a.xu + ' Xu chơi thử · +' + a.merit + ' công đức';
        }
      }
    }
  }
  updateQuestStrip();
  updateAcctLine();
  if (!$('ndShop').hidden) {
    /* Shop chỉ vẽ lại khi số liệu đổi — tránh thay DOM giữa lúc người ta bấm nút Mua */
    const sig = spendableBalance() + '|' + state.merit + '|' + state.house + '|' + state.coop + '|' +
      state.trees.tre + ',' + state.trees.sen + ',' + state.trees.hoa + ',' + state.trees.da + '|' +
      (state.vehicles.xemay ? 1 : 0) + (state.vehicles.oto ? 1 : 0);
    if (sig !== lastShopSig) { lastShopSig = sig; renderShop(); }
  }
}
/* Dải nhiệm vụ ngày + chuỗi ngày (mới ở bản port — bản gốc không có). */
function updateQuestStrip() {
  const el = $('ndQuest');
  if (!el) return;
  const day = dayKeySaigon(new Date());
  const q = state.quest && state.quest.date === day ? state.quest : { thien: false, tuoi: false, huong: false, claimed: false };
  const done = (q.thien ? 1 : 0) + (q.tuoi ? 1 : 0) + (q.huong ? 1 : 0);
  const earned = state.earnedToday && state.earnedToday.date === day
    ? state.earnedToday.thien + state.earnedToday.tuoi + state.earnedToday.huong : 0;
  const streak = state.streak || { count: 0 };
  el.innerHTML = '🎯 Nhiệm vụ ngày: ' + (q.thien ? '🧘✓' : '🧘·') + ' ' + (q.tuoi ? '💧✓' : '💧·') + ' ' + (q.huong ? '🙏✓' : '🙏·') +
    ' (' + done + '/3' + (q.claimed ? ', đã nhận thưởng' : '') + ')' +
    ' · 🔥 Chuỗi ' + (streak.count || 0) + ' ngày' +
    (currentUid ? ' · Hôm nay đã nhận ' + earned + ' Xu vào tài khoản' : ' · Đăng nhập để nhận Xu vào tài khoản');
}
/* Dòng trạng thái tài khoản: khách chơi thử thì báo rõ Xu không ghi sổ. */
function updateAcctLine() {
  const el = $('ndAcct');
  if (!el) return;
  if (currentUid) {
    el.textContent = '👤 ' + (currentUserEmail || 'Đã đăng nhập') + ' · Xu tài khoản: ' +
      (accountBalanceOk ? accountBalance.toLocaleString('vi-VN') : '…') +
      ' · Công đức giữ riêng, không đổi ra Xu.';
  } else {
    el.textContent = '👤 Chưa đăng nhập — đang chơi thử: Xu trong game chỉ ở máy này, chưa ghi vào tài khoản. Đăng nhập Ver2Solution để Xu kiếm được ghi sổ.';
  }
}

/* Người dưỡng tâm lớn dần 3 giai đoạn (§3B-P2): áp scale + báo khi lên giai đoạn */
let curStage = meditatorStage();
function applyMeditatorStage(announce) {
  const s = meditatorStage();
  meditator.scale.setScalar(MED_STAGES[s].scale);
  if (announce && s > curStage) {
    toast('🎉 Người dưỡng tâm đã lớn lên — ' + MED_STAGES[s].name + '! Càng dưỡng tâm, người càng vững chãi. 🌱');
  }
  curStage = s;
}

/* ---------- Việc dưỡng tâm (phiên ngắn + cooldown) ---------- */
let activeSession = null; /* {kind, endsAt, startedAt} */
let lastShopSig = '';
function startAction(kind) {
  const a = ACTIONS[kind];
  if (activeSession) { toast('Đang ' + ACTIONS[activeSession.kind].name.toLowerCase() + ' — chờ xong đã nhé.'); return false; }
  if (cdLeft(kind) > 0) { toast(a.name + ' đang nghỉ — ' + Math.ceil(cdLeft(kind) / 1000) + ' giây nữa mới làm lại được.'); return false; }
  activeSession = { kind, startedAt: Date.now(), endsAt: Date.now() + a.durMs };
  closeShop();
  showSheet(a.emoji + ' ' + a.name, a.text, [{ cls: 'primary', html: '⏳ Đang ' + a.name.toLowerCase() + '…', disabled: true, onClick: () => {} }], 0);
  return true;
}
async function finishAction() {
  const a = ACTIONS[activeSession.kind];
  const kind = activeSession.kind;
  state.merit += a.merit; /* công đức: local, giữ riêng, không quy đổi ra Xu */
  state.cd[kind] = Date.now() + a.cdMs;
  activeSession = null;
  if (!currentUid) {
    /* KHÁCH CHƠI THỬ — ví Xu local, không đụng số dư tài khoản. */
    creditGuestXu(a.xu);
    save(); updateHUD();
    applyMeditatorStage(true);
    hideSheet();
    toast(a.emoji + ' Xong! +' + a.xu + ' Xu chơi thử · +' + a.merit + ' công đức. Đăng nhập để Xu ghi vào tài khoản nhé. 🙏');
    return;
  }
  /* ĐÃ ĐĂNG NHẬP — Xu chỉ ghi sổ qua RPC xu_game_earn; client không tự cộng. */
  const day = dayKeySaigon(new Date());
  if (!state.earnedToday || state.earnedToday.date !== day) state.earnedToday = { date: day, thien: 0, tuoi: 0, huong: 0 };
  const r = await earnGameXu(ACTION_TO_RPC[kind]);
  let msg;
  if (r.ok && r.amount > 0) {
    state.earnedToday[kind] = r.amount;
    msg = a.emoji + ' Xong! +' + r.amount + ' Xu vào tài khoản · +' + a.merit + ' công đức. Tâm an, lòng nhẹ. 🙏';
  } else if (r.ok) {
    msg = a.emoji + ' Xong! +' + a.merit + ' công đức · Xu hôm nay đã nhận rồi, mai nhận tiếp nhé. 🙏';
  } else if (r.code === 'rpc_missing') {
    msg = a.emoji + ' Xong! +' + a.merit + ' công đức · Xu game chưa nối sổ cái (đang chờ bật) — chưa ghi Xu lần này. 🙏';
  } else {
    msg = a.emoji + ' Xong! +' + a.merit + ' công đức · Ghi Xu lỗi, thử lại sau nhé. 🙏';
  }
  /* Nhiệm vụ ngày: đủ 3 việc trong ngày → thưởng daily_quest (RPC). */
  if (!state.quest || state.quest.date !== day) state.quest = { date: day, thien: false, tuoi: false, huong: false, claimed: false };
  state.quest[kind] = true;
  if (state.quest.thien && state.quest.tuoi && state.quest.huong && !state.quest.claimed) {
    const q = await earnGameXu('daily_quest');
    if (q.ok) {
      state.quest.claimed = true;
      if (q.amount > 0) msg += ' 🎯 Nhiệm vụ ngày xong! +' + q.amount + ' Xu thưởng.';
    }
  }
  /* Chuỗi ngày: ngày mới có chơi → cập nhật chuỗi; từ 2 ngày trở lên → thưởng streak_bonus (RPC). */
  if (!state.streak) state.streak = { lastDate: '', count: 0, claimedDate: '' };
  if (state.streak.lastDate !== day) {
    state.streak.count = (state.streak.lastDate === saigonDay(-1)) ? state.streak.count + 1 : 1;
    state.streak.lastDate = day;
    if (state.streak.count >= 2 && state.streak.claimedDate !== day) {
      const sb = await earnGameXu('streak_bonus');
      if (sb.ok) {
        state.streak.claimedDate = day;
        if (sb.amount > 0) msg += ' 🔥 Chuỗi ' + state.streak.count + ' ngày! +' + sb.amount + ' Xu thưởng.';
      }
    }
  }
  save(); updateHUD();
  applyMeditatorStage(true);
  hideSheet();
  toast(msg);
  refreshAccountBalance().then(() => updateHUD());
}
/* Ví Xu chơi thử của khách — hàm duy nhất được cộng/trừ Xu local, chỉ gọi
   khi chưa đăng nhập (xem finishAction/buyShop). Không dùng cho tài khoản. */
function creditGuestXu(n) { state.xu += n; }

setInterval(() => {
  /* tiến trình phiên đang chạy + đếm ngược cooldown trên nút */
  if (activeSession) {
    const a = ACTIONS[activeSession.kind];
    const pr = Math.min(1, (Date.now() - activeSession.startedAt) / a.durMs);
    const pw = $('ndSheetProg');
    if (pw) pw.style.width = Math.round(pr * 100) + '%';
    if (Date.now() >= activeSession.endsAt) finishAction();
  }
  updateHUD();
}, 200);

/* ---------- Bảng thao tác (action sheet) ---------- */
function showSheet(title, text, buttons, progress) {
  $('ndSheetTitle').textContent = title;
  $('ndSheetText').innerHTML = text;
  const pw = $('ndSheetProgWrap');
  if (progress != null) {
    pw.hidden = false;
    $('ndSheetProg').style.width = Math.round(progress * 100) + '%';
  } else pw.hidden = true;
  const boxEl = $('ndSheetBtns');
  boxEl.innerHTML = '';
  buttons.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nd-btn' + (b.cls ? ' ' + b.cls : '');
    btn.innerHTML = b.html;
    if (b.disabled) btn.disabled = true;
    btn.addEventListener('click', () => { b.onClick(); });
    boxEl.appendChild(btn);
  });
  $('ndSheet').classList.add('show');
}
function hideSheet() { $('ndSheet').classList.remove('show'); }

/* ---------- Mua sắm ---------- */
function shopPrice(kind, key) {
  if (kind === 'house') return state.house >= 3 ? null : HOUSE_LEVELS[state.house + 1].price;
  if (kind === 'coop') return state.coop >= 3 ? null : COOP_LEVELS[state.coop + 1].price;
  if (kind === 'tree') return TREES[key].price;
  if (kind === 'vehicle') return VEHICLES[key].price;
  return null;
}
function applyPurchaseVisual(kind, key) {
  if (kind === 'house') { state.house += 1; buildHouse(state.house); }
  else if (kind === 'coop') { state.coop += 1; buildCoop(state.coop); }
  else if (kind === 'tree') {
    state.trees[key] += 1;
    if (key === 'sen') renderLotus(); else renderBoughtTrees();
  } else if (kind === 'vehicle') { state.vehicles[key] = true; renderVehicles(); }
}
async function buyShop(kind, key) {
  if (currentUid) {
    /* ĐÃ ĐĂNG NHẬP — mua bằng Xu tài khoản, chỉ giao đồ khi server trừ Xu
       xong. Hiện CHƯA NỐI (spendGameXu fail-closed): không trừ, không giao. */
    if (kind === 'house' && state.house >= 3) return false;
    if (kind === 'coop' && state.coop >= 3) return false;
    if (kind === 'tree' && state.trees[key] >= TREES[key].max) return false;
    if (kind === 'vehicle' && state.vehicles[key]) return false;
    const price = shopPrice(kind, key);
    if (price == null) return false;
    if (spendableBalance() < price) {
      toast('Chưa đủ Xu tài khoản (cần ' + price + ' Xu). Thiền, tưới sen, thắp hương thêm nhé.');
      return false;
    }
    state.spendSeq = (state.spendSeq || 0) + 1;
    save();
    const sp = await spendGameXu(kind, key, price);
    if (!sp.ok) { toast(sp.message || 'Chưa mua được — cửa hàng chưa nối sổ cái.'); return false; }
    applyPurchaseVisual(kind, key);
    save(); updateHUD(); renderShop();
    refreshAccountBalance().then(() => updateHUD());
    toast('🎉 Đã mua xong bằng Xu tài khoản! Đồ hiện ngay trong sân nhà bạn.');
    return true;
  }
  /* KHÁCH CHƠI THỬ — ví Xu local, không đụng số dư tài khoản (giữ nguyên bản gốc). */
  if (kind === 'house') {
    const next = state.house + 1;
    if (next > 3) return false;
    const price = HOUSE_LEVELS[next].price;
    if (state.xu < price) { toast('Chưa đủ Xu để lên ' + HOUSE_LEVELS[next].name + ' (cần ' + price + ' Xu). Thiền, tưới sen, thắp hương thêm nhé.'); return false; }
    state.xu -= price;
    state.house = next;
    buildHouse(next);
    save(); updateHUD(); renderShop();
    toast('🏠 Nhà đã lên cấp ' + next + ' — ' + HOUSE_LEVELS[next].name + '! Ngôi nhà dưỡng tâm càng lúc càng khang trang. 🎉');
    return true;
  }
  if (kind === 'coop') {
    const next = state.coop + 1;
    if (next > 3) return false;
    const price = COOP_LEVELS[next].price;
    if (state.xu < price) { toast('Chưa đủ Xu để sửa chuồng lên ' + COOP_LEVELS[next].name + ' (cần ' + price + ' Xu).'); return false; }
    state.xu -= price;
    state.coop = next;
    buildCoop(next);
    save(); updateHUD(); renderShop();
    toast('🐔 Chuồng đã lên cấp ' + next + ' — ' + COOP_LEVELS[next].name + '! Gà ở thoải mái hơn rồi. 🎉');
    return true;
  }
  if (kind === 'tree') {
    const t = TREES[key];
    if (state.trees[key] >= t.max) return false;
    if (state.xu < t.price) { toast('Chưa đủ Xu mua ' + t.name + ' (cần ' + t.price + ' Xu).'); return false; }
    state.xu -= t.price;
    state.trees[key] += 1;
    if (key === 'sen') renderLotus(); else renderBoughtTrees();
    save(); updateHUD(); renderShop();
    toast(t.emoji + ' Đã trồng thêm 1 ' + t.name + ' trong vườn! 🌿');
    return true;
  }
  if (kind === 'vehicle') {
    const v = VEHICLES[key];
    if (state.vehicles[key]) return false;
    if (state.xu < v.price) { toast('Chưa đủ Xu mua ' + v.name + ' (cần ' + v.price + ' Xu). Cố gắng dưỡng tâm thêm nhé.'); return false; }
    state.xu -= v.price;
    state.vehicles[key] = true;
    renderVehicles();
    save(); updateHUD(); renderShop();
    toast(v.emoji + ' Đã mua ' + v.name + '! Xe đang đậu trong sân nhà bạn. 🎉');
    return true;
  }
  return false;
}
function shopRow(icon, name, sub, qtyText, buyKey, btnLabel, disabled) {
  return '<div class="nd-row"><span class="nd-row-ic">' + icon + '</span>' +
    '<span class="nd-row-nm">' + name + '<small>' + sub + '</small></span>' +
    '<span class="nd-row-qt">' + qtyText + '</span>' +
    '<button type="button" class="nd-act-btn" data-buy="' + buyKey + '"' + (disabled ? ' disabled' : '') + '>' + btnLabel + '</button></div>';
}
function renderShop() {
  $('ndShopXu').textContent = '🪙 ' + spendableBalance().toLocaleString('vi-VN') + ' Xu' + (currentUid ? ' (tài khoản)' : ' (chơi thử)') + ' · 🙏 ' + state.merit.toLocaleString('vi-VN') + ' công đức';
  const rows = $('ndShopRows');
  let html = '';
  /* Nhà */
  html += '<div class="nd-shop-sec">🏠 Nhà ở</div>';
  if (state.house >= 3) {
    html += shopRow('🏡', HOUSE_LEVELS[3].name, 'Đã là nhà đẹp nhất rồi — an cư lạc nghiệp.', 'Cấp 3/3', 'house', 'Đã có', true);
  } else {
    const nx = HOUSE_LEVELS[state.house + 1];
    html += shopRow(HOUSE_LEVELS[state.house].emoji, HOUSE_LEVELS[state.house].name + ' → ' + nx.name,
      'Nâng cấp nhà lên ' + nx.name + ' · ' + nx.price + ' Xu', 'Cấp ' + state.house + '/3', 'house', 'Mua', spendableBalance() < nx.price);
  }
  /* Chuồng */
  html += '<div class="nd-shop-sec">🐔 Chuồng trại</div>';
  if (state.coop >= 3) {
    html += shopRow('🏠', COOP_LEVELS[3].name, 'Chuồng đã khang trang nhất rồi.', 'Cấp 3/3', 'coop', 'Đã có', true);
  } else {
    const nx = COOP_LEVELS[state.coop + 1];
    html += shopRow(COOP_LEVELS[state.coop].emoji, COOP_LEVELS[state.coop].name + ' → ' + nx.name,
      'Sửa chuồng lên ' + nx.name + ' · ' + nx.price + ' Xu', 'Cấp ' + state.coop + '/3', 'coop', 'Mua', spendableBalance() < nx.price);
  }
  /* Cây */
  html += '<div class="nd-shop-sec">🌳 Trồng cây trong vườn</div>';
  for (const key of ['tre', 'sen', 'hoa', 'da']) {
    const t = TREES[key];
    const owned = state.trees[key];
    html += shopRow(t.emoji, t.name, t.price + ' Xu/cây · đã trồng ' + owned + '/' + t.max, owned + '/' + t.max, 'tree:' + key, owned >= t.max ? 'Đã có' : 'Mua', owned >= t.max || spendableBalance() < t.price);
  }
  /* Xe */
  html += '<div class="nd-shop-sec">🛵 Xe cộ</div>';
  for (const key of ['xemay', 'oto']) {
    const v = VEHICLES[key];
    const owned = state.vehicles[key];
    html += shopRow(v.emoji, v.name, owned ? 'Đang đậu trong sân nhà bạn.' : v.price + ' Xu · mua về đậu ngay trong sân', owned ? 'Đã mua' : v.price + ' Xu', 'vehicle:' + key, owned ? 'Đã có' : 'Mua', owned || spendableBalance() < v.price);
  }
  rows.innerHTML = html;
}
function openShop() {
  hideSheet();
  renderShop();
  $('ndShop').hidden = false;
}
function closeShop() { $('ndShop').hidden = true; }

/* ---------- Tương tác: bấm / kéo xem / lăn + chụm zoom ---------- */
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const pointers = new Map();
let downInfo = null, pinchDist = 0;
function setNDC(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}
function pickType(e) {
  setNDC(e);
  raycaster.setFromCamera(pointerNDC, camera);
  /* Người thiền giai đoạn 1 rất nhỏ (0,55×, cao ~0,75 đơn vị ≈ 15px ở 390px) —
     tia bấm lướt qua sát thân (trong vòng 0,6 đơn vị quanh tâm thân — tức là
     gần như chạm vào hình trên màn hình) thì tính là bấm người, kể cả khi tia
     trượt qua và trúng ao sen phía sau. Bán kính hẹp để không cướp mất cú bấm
     vào mép ao gần người (ao cách người ~4 đơn vị). */
  const medScale = MED_STAGES[meditatorStage()].scale;
  const medCenter = new THREE.Vector3(-4, 0.62 * medScale, -1.2);
  if (raycaster.ray.distanceToPoint(medCenter) < 0.6) return { type: 'meditator' };
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits) {
    const t = h.object.userData && h.object.userData.type;
    if (t === 'house' || t === 'coop' || t === 'pond' || t === 'shrine' || t === 'meditator' || t === 'vehicle' || t === 'animal' || t === 'tree' || t === 'pot' || t === 'lantern' || t === 'well')
      return h.object.userData;
  }
  return null;
}
function openHouseSheet() {
  if (state.house >= 3) {
    showSheet('🏡 ' + HOUSE_LEVELS[3].name, 'Nhà đã đẹp nhất rồi — an cư lạc nghiệp, tâm an vạn sự thành. 🪷',
      [{ cls: 'primary', html: '🪷 Ngắm nhà một lát', onClick: () => hideSheet() }]);
    return;
  }
  const nx = HOUSE_LEVELS[state.house + 1];
  const ok = spendableBalance() >= nx.price;
  showSheet('🏠 ' + HOUSE_LEVELS[state.house].name,
    'Nhà hiện tại: <b>' + HOUSE_LEVELS[state.house].name + '</b> (cấp ' + state.house + '/3). Nâng cấp lên <b>' + nx.name + '</b> tốn <b>' + nx.price + ' Xu</b> — bạn đang có ' + spendableBalance().toLocaleString('vi-VN') + ' Xu' + (currentUid ? ' tài khoản' : ' chơi thử') + '.' ,
    [{ cls: 'gold', html: '🏠 Nâng cấp nhà — ' + nx.price + ' Xu<small>Lên ' + nx.name + ' ngay</small>', disabled: !ok, onClick: () => { if (buyShop('house')) hideSheet(); } },
     { cls: 'primary', html: '🛒 Xem hết cửa hàng', onClick: () => openShop() }]);
}
function openCoopSheet() {
  if (state.coop >= 3) {
    showSheet('🏠 ' + COOP_LEVELS[3].name, 'Chuồng đã khang trang nhất rồi — gà ở thoải mái, tha hồ đẻ trứng. 🐔',
      [{ cls: 'primary', html: '🐔 Xem gà một lát', onClick: () => hideSheet() }]);
    return;
  }
  const nx = COOP_LEVELS[state.coop + 1];
  const ok = spendableBalance() >= nx.price;
  showSheet('🐔 ' + COOP_LEVELS[state.coop].name,
    'Chuồng hiện tại: <b>' + COOP_LEVELS[state.coop].name + '</b> (cấp ' + state.coop + '/3). Sửa lên <b>' + nx.name + '</b> tốn <b>' + nx.price + ' Xu</b> — bạn đang có ' + spendableBalance().toLocaleString('vi-VN') + ' Xu' + (currentUid ? ' tài khoản' : ' chơi thử') + '.' ,
    [{ cls: 'gold', html: '🐔 Sửa chuồng — ' + nx.price + ' Xu<small>Lên ' + nx.name + ' ngay</small>', disabled: !ok, onClick: () => { if (buyShop('coop')) hideSheet(); } },
     { cls: 'primary', html: '🛒 Xem hết cửa hàng', onClick: () => openShop() }]);
}
function handleTap(e) {
  const u = pickType(e);
  if (!u) { hideSheet(); return; }
  if (u.type === 'house') openHouseSheet();
  else if (u.type === 'coop') openCoopSheet();
  else if (u.type === 'pond') startAction('tuoi');
  else if (u.type === 'shrine') startAction('huong');
  else if (u.type === 'meditator') startAction('thien');
  else if (u.type === 'vehicle') toast((u.vehicle === 'oto' ? '🚗 Ô tô của bạn — đi đâu cũng tiện, nhớ lái chậm và an toàn nhé.' : '🛵 Xe máy của bạn — đi chợ, đi chùa đều tiện.'));
  else if (u.type === 'animal') toast('🐔 Gà trong chuồng — ở Nơi dưỡng tâm, gà được nuôi thong thả, không vội vàng.');
  else if (u.type === 'tree') toast('🌳 Cây trong vườn nhà bạn — cây lớn chậm, như tâm mình lớn dần mỗi ngày.');
  else if (u.type === 'pot') toast('🏺 Chum sành — đựng gạo, muối, nước mắm của nhà quê.');
  else if (u.type === 'lantern') toast('🏮 Đèn lồng đỏ son — tối đến đèn sáng lên, sân nhà thêm ấm cúng.');
  else if (u.type === 'well') toast('💧 Giếng đá — nước giếng mát lành, tưới vườn quanh năm.');
}
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) downInfo = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false };
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer tổng hợp: bỏ qua */ }
});
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (downInfo && Math.abs(e.clientX - downInfo.x) + Math.abs(e.clientY - downInfo.y) > 8) downInfo.moved = true;
  if (pointers.size === 1 && downInfo && downInfo.moved) {
    const wpp = (2 * viewSize) / (stage.clientHeight || 1);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    up.y = 0; up.normalize();
    camTarget.addScaledVector(right, -dx * wpp);
    camTarget.addScaledVector(up, dy * wpp);
    camTarget.x = Math.max(-8, Math.min(8, camTarget.x));
    camTarget.z = Math.max(-6, Math.min(9, camTarget.z));
    placeCamera();
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0 && d > 0) {
      viewSize = Math.max(8, Math.min(26, viewSize * (pinchDist / d)));
      fitCamera(); placeCamera();
    }
    pinchDist = d;
  }
});
cv.addEventListener('pointerup', (e) => {
  pointers.delete(e.pointerId);
  /* Cửa sổ 2000ms (thay vì 1000ms): trên máy yếu/main thread kẹt, 2 sự kiện
     pointerdown/up có thể được xử lý cách nhau >1s dù người bấm rất nhanh. */
  if (downInfo && !downInfo.moved && e.timeStamp - downInfo.t < 2000) handleTap(e);
  if (pointers.size === 0) downInfo = null;
});
cv.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); downInfo = null; });
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  viewSize = Math.max(8, Math.min(26, viewSize * (1 + e.deltaY * 0.001)));
  fitCamera(); placeCamera();
}, { passive: false });

/* ---------- Vòng lặp ---------- */
const timer = new THREE.Timer(); /* r186: THREE.Clock đã deprecated */
let lastSave = 0, lastRenderT = -1;
let lastFrameMs = 0, frameCount = 0;
function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  const now = Date.now();
  /* gà đi lang thang trong chuồng, mổ thóc */
  for (const a of animals) {
    if (a.peckT > 0) {
      a.peckT -= dt;
      a.head.rotation.x = 0.5 + Math.sin(t * 14) * 0.35;
      continue;
    }
    a.head.rotation.x = 0;
    if (a.waitT > 0) { a.waitT -= dt; if (a.waitT <= 0 && Math.random() < 0.5) a.peckT = 1.5 + Math.random(); continue; }
    if (!a.target) {
      a.target = { x: COOP.x0 + 0.4 + Math.random() * (COOP.x1 - COOP.x0 - 0.8), z: COOP.z0 + 0.4 + Math.random() * (COOP.z1 - COOP.z0 - 0.8) };
    }
    const dx = a.target.x - a.group.position.x, dz = a.target.z - a.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.15) { a.target = null; a.waitT = 2 + Math.random() * 3; }
    else {
      a.group.position.x += (dx / dist) * a.speed * dt;
      a.group.position.z += (dz / dist) * a.speed * dt;
      a.group.rotation.y = Math.atan2(dx, dz);
    }
  }
  /* người thiền: thở chậm — ngực phập phồng nhẹ, đầu cúi nhẹ theo nhịp */
  medTorso.scale.y = 1 + Math.sin(t * 0.9) * 0.03;
  medHead.rotation.x = 0.06 + Math.sin(t * 0.9) * 0.03;
  /* khói hương bay lên, mờ dần rồi quay lại */
  for (const p of smokePuffs) {
    p.phase += dt * 0.25;
    if (p.phase > 1) p.phase = 0;
    p.mesh.position.y = 2.1 + p.phase * 1.6;
    p.mesh.position.x = -2.5 + Math.sin(p.phase * 6 + t * 0.5) * 0.12;
    p.mesh.material.opacity = 0.4 * (1 - p.phase);
    const s = 0.8 + p.phase * 1.6;
    p.mesh.scale.setScalar(s);
  }
  /* sen đung đưa nhẹ */
  lotusGroup.rotation.y = Math.sin(t * 0.4) * 0.02;
  /* mây trôi qua núi (§3B-P1) */
  for (const c of clouds) {
    c.g.position.x += c.speed * dt;
    if (c.g.position.x > 48) c.g.position.x = -48;
  }
  /* bèo + lá sen trôi nhẹ trên ao — nước gợn (§3B-P1) */
  for (const f of pondFloaters) {
    f.mesh.position.x = f.bx + Math.sin(t * 0.3 + f.phase) * f.amp;
    f.mesh.position.z = f.bz + Math.cos(t * 0.23 + f.phase) * f.amp;
  }
  /* cây đung đưa nhẹ (§3B-P1) */
  for (const s of swayList) s.g.rotation.z = Math.sin(t * 0.8 + s.phase) * 0.02;
  if (now - lastSave > 5000) { lastSave = now; save(); }
  /* Giới hạn 30fps: tiết kiệm pin mobile + giảm tải CPU (SwiftShader) */
  if (t - lastRenderT < 1 / 30) return;
  lastRenderT = t;
  const rt0 = performance.now();
  renderer.render(scene, camera);
  lastFrameMs = performance.now() - rt0;
  frameCount++;
}

/* ---------- V2S: đổi tài khoản (nạp lại state theo key riêng) ---------- */
function reloadStateFor(uid) {
  state = loadState();
  if (uid) state.xu = 0; /* Xu tài khoản không giữ trong state.xu; state.xu chỉ là ví chơi thử của khách */
  curStage = meditatorStage();
  buildHouse(state.house);
  buildCoop(state.coop);
  renderLotus();
  renderBoughtTrees();
  renderVehicles();
  applyMeditatorStage(false);
  updateHUD();
}
async function refreshAccount() {
  let uid = null, email = '';
  try {
    const api = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (api && typeof api.getSessionRobust === 'function') {
      const s2 = await api.getSessionRobust();
      if (s2 && s2.user) { uid = s2.user.id; email = s2.user.email || ''; }
    } else if (api && typeof api.getSession === 'function') {
      const s2 = await api.getSession();
      if (s2 && s2.user) { uid = s2.user.id; email = s2.user.email || ''; }
    }
  } catch (e) { /* chưa đăng nhập / chưa nạp xong supabase: giữ chế độ khách */ }
  if (uid !== currentUid) {
    currentUid = uid;
    currentUserEmail = email;
    reloadStateFor(uid);
  } else if (uid) {
    currentUserEmail = email;
  }
  updateAcctLine();
  if (uid) refreshAccountBalance().then(() => updateHUD());
  else updateHUD();
}

/* ---------- Khởi tạo ---------- */
function init() {
  fitCamera();
  placeCamera();
  buildHouse(state.house);
  buildCoop(state.coop);
  renderLotus();
  renderBoughtTrees();
  renderVehicles();
  applyMeditatorStage(false); /* người thiền theo giai đoạn hiện tại (§3B-P2) */
  $('ndActThien').addEventListener('click', () => startAction('thien'));
  $('ndActTuoi').addEventListener('click', () => startAction('tuoi'));
  $('ndActHuong').addEventListener('click', () => startAction('huong'));
  $('ndShopBtn').addEventListener('click', openShop);
  $('ndShopClose').addEventListener('click', closeShop);
  $('ndShopRows').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-buy]');
    if (!b || b.disabled) return;
    const v = b.dataset.buy;
    if (v === 'house') { if (buyShop('house')) { /* ở lại shop để mua tiếp */ } }
    else if (v === 'coop') buyShop('coop');
    else if (v.startsWith('tree:')) buyShop('tree', v.slice(5));
    else if (v.startsWith('vehicle:')) buyShop('vehicle', v.slice(8));
  });
  $('ndSheetClose').addEventListener('click', () => {
    /* đóng bảng khi đang làm việc thì phiên vẫn chạy ngầm, xong sẽ báo */
    hideSheet();
  });
  $('ndStart').addEventListener('click', () => {
    $('ndIntro').style.display = 'none';
    state.seenIntro = true; save();
    toast('Chào mừng về Nơi dưỡng tâm! Bấm vào người đang thiền, ao sen hay bàn thờ để bắt đầu. 🪷');
  });
  if (state.seenIntro) $('ndIntro').style.display = 'none';
  window.addEventListener('resize', () => { fitCamera(); placeCamera(); });
  updateHUD();
  animate();
  /* V2S: nối tài khoản sau khi cảnh dựng xong (không chặn game). */
  refreshAccount();
  try {
    const api = window.McLivestreamAPI;
    if (api && api.client && api.client.auth && typeof api.client.auth.onAuthStateChange === 'function') {
      api.client.auth.onAuthStateChange(() => { refreshAccount(); });
    }
  } catch (e) {}
  setInterval(() => { if (currentUid) refreshAccountBalance().then(() => updateHUD()); }, 30000);
}
/* Hook cho test tự động (CDP): KHÔNG ảnh hưởng gameplay người chơi */
window.__NDT__ = {
  version: '2.0-v2s',
  get state() { return state; },
  screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  },
  houseScreen() { return this.screenOf(6.5, 2.0, -4.5); },
  coopScreen() { return this.screenOf(6, 1.0, 4.5); },
  pondScreen() { return this.screenOf(-7, 0.5, -4); },
  shrineScreen() { return this.screenOf(-2.5, 1.5, -6.5); },
  meditatorScreen() {
    /* Ngắm vào giữa thân người thiền — cao độ theo đúng giai đoạn hiện tại
       (giai đoạn 1 chỉ cao ~0,75 đơn vị; ngắm cố định y=1,0 thì tia đi qua
       trên đầu và trúng ao sen phía sau). */
    const s = MED_STAGES[meditatorStage()].scale;
    return this.screenOf(-4, 0.62 * s, -1.2);
  },
  vehicleScreen(kind) {
    if (kind === 'xemay') return this.screenOf(BIKE_POS[0], 0.7, BIKE_POS[1]);
    return this.screenOf(CAR_POS[0], 0.9, CAR_POS[1]);
  },
  pickAt(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    pointerNDC.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      const t = h.object.userData && h.object.userData.type;
      if (t) return { type: t, vehicle: h.object.userData.vehicle, dist: h.distance };
    }
    return null;
  },
  camInfo() { return { target: camTarget.toArray(), viewSize }; },
  meditatorStage() {
    const s = meditatorStage();
    return { stage: s + 1, name: MED_STAGES[s].name, merit: state.merit, scale: MED_STAGES[s].scale };
  },
  addMerit(n) { state.merit += n; applyMeditatorStage(true); save(); updateHUD(); return { merit: state.merit, stage: meditatorStage() + 1 }; },
  sceneStats() {
    const c = { lantern: 0, well: 0, pond: 0, cloud: clouds.length, floater: pondFloaters.length, sway: swayList.length };
    scene.traverse((o) => { const t = o.userData && o.userData.type; if (t === 'lantern') c.lantern++; if (t === 'well') c.well++; if (t === 'pond') c.pond++; });
    return c;
  },
  renderInfo() {
    return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      frameMs: Math.round(lastFrameMs), frames: frameCount,
      dpr: renderer.getPixelRatio(), size: [renderer.domElement.width, renderer.domElement.height] };
  },
  shopOpen() { return !$('ndShop').hidden; },
  /* V2S: KHÔNG còn addXu — client không tự cộng số dư (xem earnGameXu). */
  account() { return { loggedIn: !!currentUid, uid: currentUid, email: currentUserEmail, balance: accountBalance, balanceOk: accountBalanceOk, rpcEarnMissing }; },
  linkStatus() { return { mode: 'rpc-ledger', earnRpc: 'xu_game_earn', balanceRpc: 'get_my_points_balance', spendLinked: false, spendNote: 'spend_points (M7) chi nhan filter/contact_view/pin — cho RPC tru Xu game (M16/Rion, han 10/11)' }; },
  clearCooldowns() { state.cd = { thien: 0, tuoi: 0, huong: 0 }; save(); updateHUD(); return true; },
  fastForward(ms) {
    for (const k of ['thien', 'tuoi', 'huong']) if (state.cd[k]) state.cd[k] -= ms;
    save(); updateHUD();
    return true;
  },
  buy(kind, key) { return buyShop(kind, key); },
  start(kind) { return startAction(kind); },
  session() { return activeSession ? { kind: activeSession.kind, leftMs: activeSession.endsAt - Date.now() } : null; },
};
init();
