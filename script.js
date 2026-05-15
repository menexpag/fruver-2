/* ═══════════════════════════════════════════
   Fruver – POS · script.js (Firebase edition)
   ═══════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════
//  FIREBASE
// ══════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, update }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEreWP1P4ZaeARkYgJclBo3sSNN0nSsrM",
  authDomain: "fruver-2.firebaseapp.com",
  databaseURL: "https://fruver-2-default-rtdb.firebaseio.com",
  projectId: "fruver-2",
  storageBucket: "fruver-2.firebasestorage.app",
  messagingSenderId: "277595648076",
  appId: "1:277595648076:web:03abeedcfe7def466fc4e9"
};

const fbApp = initializeApp(firebaseConfig);
const db    = getDatabase(fbApp);

async function fbSet(path, value)  { await set(ref(db, path), value); }
async function fbGet(path)         { const s = await get(ref(db, path)); return s.exists() ? s.val() : null; }
async function fbUpdate(path, val) { await update(ref(db, path), val); }

// ══════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════
let state = {
  products: [],
  cart: [],
  discount: 0,
  paymentMethod: 'efectivo',
  sales: [],
  invoiceCounter: 1,
  activeCategory: 'Todos',
  editingProductId: null,
};

let ADMIN_USER = 'admin';
let ADMIN_PASS = '1234';
const LOW_STOCK_THRESHOLD = 5;

function uid()  { return '_' + Math.random().toString(36).slice(2, 11); }
function fmt(n) { return '$' + Number(n).toLocaleString('es-CO'); }
function today(){ return new Date().toLocaleDateString('es-CO'); }
function now()  { return new Date().toLocaleString('es-CO'); }

function saveLS(key, val) {
  try { localStorage.setItem('fruver_' + key, JSON.stringify(val)); } catch(e) {}
}
function loadLS(key, def) {
  try { const v = localStorage.getItem('fruver_' + key); return v ? JSON.parse(v) : def; }
  catch(e) { return def; }
}

const DEFAULT_PRODUCTS = [
  { id: uid(), emoji: '🥔', name: 'Papa',      category: 'Tubérculos', price: 1800,  stock: 40, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🧅', name: 'Cebolla',   category: 'Verduras',   price: 2500,  stock: 30, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🍅', name: 'Tomate',    category: 'Verduras',   price: 3200,  stock: 25, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🥕', name: 'Zanahoria', category: 'Verduras',   price: 2200,  stock: 20, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🌿', name: 'Yuca',      category: 'Tubérculos', price: 1500,  stock: 35, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🍌', name: 'Plátano',   category: 'Frutas',     price: 1200,  stock: 50, unit: 'kg',     minStock: 8 },
  { id: uid(), emoji: '🧄', name: 'Ajo',       category: 'Aromáticas', price: 12000, stock: 10, unit: 'kg',     minStock: 2 },
  { id: uid(), emoji: '🍋', name: 'Limón',     category: 'Frutas',     price: 2800,  stock: 45, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🌿', name: 'Cilantro',  category: 'Aromáticas', price: 800,   stock: 15, unit: 'manojo', minStock: 3 },
  { id: uid(), emoji: '🥦', name: 'Brócoli',   category: 'Verduras',   price: 3500,  stock: 18, unit: 'kg',     minStock: 4 },
  { id: uid(), emoji: '🥬', name: 'Lechuga',   category: 'Verduras',   price: 1500,  stock: 20, unit: 'und',    minStock: 4 },
  { id: uid(), emoji: '🫚', name: 'Pepino',    category: 'Verduras',   price: 1800,  stock: 22, unit: 'kg',     minStock: 4 },
  { id: uid(), emoji: '🍠', name: 'Batata',    category: 'Tubérculos', price: 1600,  stock: 30, unit: 'kg',     minStock: 5 },
  { id: uid(), emoji: '🌽', name: 'Mazorca',   category: 'Verduras',   price: 1000,  stock: 60, unit: 'und',    minStock: 10 },
  { id: uid(), emoji: '🍐', name: 'Pera',      category: 'Frutas',     price: 3800,  stock: 12, unit: 'kg',     minStock: 3 },
];

// ══════════════════════════════════════════
//  TOAST / LOADING
// ══════════════════════════════════════════
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3200);
}

function showLoading(msg = 'Cargando…') {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.5);
      display:flex;align-items:center;justify-content:center;`;
    el.innerHTML = `<div style="background:var(--surface);border-radius:16px;padding:2rem 2.5rem;
      text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.25)">
      <div style="font-size:2rem;margin-bottom:.75rem">🌿</div>
      <p id="loadingMsg" style="font-weight:600;color:var(--green-700)">${msg}</p>
    </div>`;
    document.body.appendChild(el);
  } else {
    document.getElementById('loadingMsg').textContent = msg;
    el.style.display = 'flex';
  }
}
function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + .35);
    osc.start(); osc.stop(ctx.currentTime + .35);
  } catch(e) {}
}

// ══════════════════════════════════════════
//  LOGIN / LOGOUT
// ══════════════════════════════════════════
async function doLogin() {
  const user  = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  showLoading('Verificando credenciales…');

  try {
    if (navigator.onLine) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      const creds = await Promise.race([fbGet('config/credentials'), timeout]);
      if (creds) {
        ADMIN_USER = creds.user;
        ADMIN_PASS = creds.pass;
        saveLS('credentials', { user: creds.user, pass: creds.pass });
      }
    } else {
      const cached = loadLS('credentials', null);
      if (cached) { ADMIN_USER = cached.user; ADMIN_PASS = cached.pass; }
    }
  } catch(e) {
    const cached = loadLS('credentials', null);
    if (cached) { ADMIN_USER = cached.user; ADMIN_PASS = cached.pass; }
  }

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    saveLS('credentials', { user: ADMIN_USER, pass: ADMIN_PASS });
    hideLoading();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    await init();
  } else {
    hideLoading();
    errEl.textContent = navigator.onLine
      ? '❌ Usuario o contraseña incorrectos'
      : '❌ Credenciales incorrectas (modo offline)';
  }
}

document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogout() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
async function init() {
  await initWithOfflineFallback();
}

function listenRealtime() {
  onValue(ref(db, 'products'), snap => {
    if (!snap.exists()) return;
    state.products = Object.values(snap.val());
    renderProducts(); renderInventory(); buildCategoryChips(); updateDashboard();
  });
  onValue(ref(db, 'sales'), snap => {
    state.sales = snap.exists()
      ? Object.values(snap.val()).sort((a, b) => (b.invoiceNum || 0) - (a.invoiceNum || 0))
      : [];
    renderHistory(); updateDashboard();
  });
}

// ══════════════════════════════════════════
//  RELOJ
// ══════════════════════════════════════════
function startClock() {
  const tick = () => {
    const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el1 = document.getElementById('headerTime');
    const el2 = document.getElementById('mobileTime');
    if (el1) el1.textContent = t;
    if (el2) el2.textContent = t;
  };
  tick(); setInterval(tick, 1000);
}

// ══════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════
function switchSection(name, btn) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active'); s.classList.add('hidden');
  });
  const sec = document.getElementById('sec-' + name);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'admin')      updateDashboard();
  if (name === 'historial')  renderHistory();
  if (name === 'inventario') renderInventory();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function toggleTheme() {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('themeIcon').textContent = dark ? '🌙' : '☀️';
}

// ══════════════════════════════════════════
//  PRODUCTOS
// ══════════════════════════════════════════
function getCategories() { return ['Todos', ...new Set(state.products.map(p => p.category))]; }

function buildCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';
  getCategories().forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (cat === state.activeCategory ? ' active' : '');
    btn.textContent = cat;
    btn.onclick = () => { state.activeCategory = cat; buildCategoryChips(); filterProducts(); };
    container.appendChild(btn);
  });
}

function renderProducts(list) {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const products = list || state.products.filter(p => {
    const matchCat = state.activeCategory === 'Todos' || p.category === state.activeCategory;
    return matchCat && p.name.toLowerCase().includes(query);
  });
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';
  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem;">Sin productos encontrados.</p>';
    return;
  }
  products.forEach(p => {
    const low  = p.stock > 0 && p.stock <= (p.minStock || LOW_STOCK_THRESHOLD);
    const out  = p.stock <= 0;
    const card = document.createElement('div');
    card.className = 'product-card' + (low ? ' low-stock' : '') + (out ? ' out-stock' : '');
    card.innerHTML = `
      ${low ? '<span class="low-badge">Bajo</span>' : ''}
      <span class="product-emoji">${p.emoji}</span>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${fmt(p.price)}/${p.unit}</div>
      <div class="product-stock">${out ? '⚠ Sin stock' : `Stock: ${p.stock} ${p.unit}`}</div>
    `;
    card.onclick = () => openQtyModal(p.id);
    grid.appendChild(card);
  });
}

function filterProducts() { buildCategoryChips(); renderProducts(); }

// ══════════════════════════════════════════
//  MODAL CANTIDAD
// ══════════════════════════════════════════
const KG_TO_LB = 2.20462;
const LB_TO_KG = 1 / KG_TO_LB;
let qtyModalState = { productId: null, baseUnit: 'kg', saleUnit: 'kg' };

function openQtyModal(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  qtyModalState = { productId, baseUnit: p.unit, saleUnit: p.unit };
  document.getElementById('qtyModalTitle').textContent = `${p.emoji} ${p.name}`;
  document.getElementById('qtyInput').value = '1';
  const showSelector = p.unit === 'kg' || p.unit === 'lb';
  document.getElementById('unitSelectorWrap').classList.toggle('hidden', !showSelector);
  if (showSelector) selectSaleUnit(p.unit, true);
  else document.getElementById('qtyLabel').textContent = `Cantidad (${p.unit})`;
  updatePricePreview();
  document.getElementById('qtyModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('qtyInput').focus(), 100);
}

function selectSaleUnit(unit, silent) {
  qtyModalState.saleUnit = unit;
  document.getElementById('unitBtnKg').classList.toggle('active', unit === 'kg');
  document.getElementById('unitBtnLb').classList.toggle('active', unit === 'lb');
  const p = state.products.find(x => x.id === qtyModalState.productId);
  if (!p) return;
  document.getElementById('qtyLabel').textContent = unit === 'kg' ? 'Cantidad en Kilos (kg)' : 'Cantidad en Libras (lb)';
  const info = document.getElementById('unitInfo');
  if (unit !== p.unit) {
    if (unit === 'lb') info.textContent = `1 lb = 0.454 kg · Precio por libra: ${fmt(Math.round(p.price * LB_TO_KG))}`;
    else               info.textContent = `1 kg = 2.205 lb · Precio por kilo: ${fmt(Math.round(p.price * KG_TO_LB))}`;
  } else {
    info.textContent = `Precio base: ${fmt(p.price)}/${p.unit}`;
  }
  if (!silent) updatePricePreview();
}

function getSalePrice(product) {
  if (qtyModalState.saleUnit === qtyModalState.baseUnit) return product.price;
  if (qtyModalState.saleUnit === 'lb' && qtyModalState.baseUnit === 'kg') return product.price * LB_TO_KG;
  if (qtyModalState.saleUnit === 'kg' && qtyModalState.baseUnit === 'lb') return product.price * KG_TO_LB;
  return product.price;
}

function updatePricePreview() {
  const qty  = parseFloat(document.getElementById('qtyInput').value) || 0;
  const p    = state.products.find(x => x.id === qtyModalState.productId);
  const prev = document.getElementById('pricePreview');
  if (!p || qty <= 0) { prev.textContent = ''; return; }
  const unitPrice = getSalePrice(p);
  prev.textContent = `${qty} ${qtyModalState.saleUnit} × ${fmt(Math.round(unitPrice))}/${qtyModalState.saleUnit} = ${fmt(Math.round(unitPrice * qty))}`;
}

document.getElementById('qtyInput').addEventListener('input', updatePricePreview);

function closeQtyModal() {
  document.getElementById('qtyModal').classList.add('hidden');
  qtyModalState.productId = null;
}

function confirmQty() {
  const qty = parseFloat(document.getElementById('qtyInput').value);
  if (!qty || qty <= 0) { showToast('Cantidad inválida', 'error'); return; }
  addToCart(qtyModalState.productId, qty, qtyModalState.saleUnit);
  closeQtyModal();
}

document.getElementById('qtyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmQty();
});

// ══════════════════════════════════════════
//  CARRITO
// ══════════════════════════════════════════
function getQtyInBaseUnitFor(qty, saleUnit, baseUnit) {
  if (!saleUnit || saleUnit === baseUnit) return qty;
  if (saleUnit === 'lb' && baseUnit === 'kg') return qty * LB_TO_KG;
  if (saleUnit === 'kg' && baseUnit === 'lb') return qty * KG_TO_LB;
  return qty;
}
function getSalePriceFor(product, saleUnit) {
  if (!saleUnit || saleUnit === product.unit) return product.price;
  if (saleUnit === 'lb' && product.unit === 'kg') return product.price * LB_TO_KG;
  if (saleUnit === 'kg' && product.unit === 'lb') return product.price * KG_TO_LB;
  return product.price;
}

function addToCart(productId, qtySaleUnit, saleUnit) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  const qtyBase    = +getQtyInBaseUnitFor(qtySaleUnit, saleUnit, p.unit).toFixed(4);
  const unitPrice  = getSalePriceFor(p, saleUnit);
  const displayUnit = saleUnit || p.unit;
  if (p.stock < qtyBase) {
    showToast(`⚠ Stock insuficiente: ${p.stock} ${p.unit}`, 'warning'); return;
  }
  const key = productId + '_' + displayUnit;
  const existing = state.cart.find(c => c.cartKey === key);
  if (existing) {
    const newBase = +(existing.qtyBase + qtyBase).toFixed(4);
    if (p.stock < newBase) { showToast('⚠ Sin stock suficiente', 'warning'); return; }
    existing.qty     = +(existing.qty + qtySaleUnit).toFixed(4);
    existing.qtyBase = newBase;
  } else {
    state.cart.push({
      cartKey: key, productId,
      qty: +qtySaleUnit.toFixed(4), qtyBase,
      name: p.name, emoji: p.emoji,
      price: unitPrice, priceBase: p.price,
      unit: displayUnit, unitBase: p.unit,
    });
  }
  renderCart();
  showToast(`✅ ${p.name} – ${qtySaleUnit} ${displayUnit}`);
}

function removeFromCart(cartKey) {
  state.cart = state.cart.filter(c => c.cartKey !== cartKey);
  renderCart();
}

function changeQty(cartKey, delta) {
  const item = state.cart.find(c => c.cartKey === cartKey);
  if (!item) return;
  const newQty     = +(item.qty + delta).toFixed(4);
  const newQtyBase = +(item.qtyBase + getQtyInBaseUnitFor(delta, item.unit, item.unitBase)).toFixed(4);
  if (newQty <= 0) { removeFromCart(cartKey); return; }
  const p = state.products.find(x => x.id === item.productId);
  if (p && p.stock < newQtyBase) { showToast('⚠ Sin stock suficiente', 'warning'); return; }
  item.qty = newQty; item.qtyBase = newQtyBase;
  renderCart();
}

function clearCart() {
  if (!state.cart.length) return;
  state.cart = []; state.discount = 0;
  document.getElementById('discountRow').classList.add('hidden');
  renderCart();
}

function calcCartTotals() {
  const sub  = state.cart.reduce((a, c) => a + c.price * c.qty, 0);
  const disc = sub * state.discount / 100;
  return { sub, disc, total: sub - disc };
}

function renderCart() {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  if (!state.cart.length) {
    container.innerHTML = '<div class="cart-empty"><span>🥬</span><p>Carrito vacío</p></div>';
  } else {
    state.cart.forEach(item => {
      const subtotal  = item.price * item.qty;
      const unitLabel = item.unit !== item.unitBase
        ? `<span style="background:var(--accent-lt);color:var(--accent);font-size:.7rem;font-weight:800;padding:1px 5px;border-radius:8px;margin-left:3px">${item.unit}</span>`
        : '';
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <span class="cart-item-emoji">${item.emoji}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name} ${unitLabel}</div>
          <div class="cart-item-price">${fmt(Math.round(item.price))}/${item.unit} × ${item.qty} ${item.unit}</div>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-total">${fmt(Math.round(subtotal))}</div>
          <div class="cart-qty-controls">
            <button class="qty-btn del" onclick="removeFromCart('${item.cartKey}')">✕</button>
            <button class="qty-btn" onclick="changeQty('${item.cartKey}', -0.5)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.cartKey}', 0.5)">+</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }
  const { sub, disc, total } = calcCartTotals();
  document.getElementById('cartSubtotal').textContent = fmt(Math.round(sub));
  document.getElementById('cartTotal').textContent    = fmt(Math.round(total));
  if (state.discount > 0) {
    document.getElementById('discPct').textContent     = state.discount;
    document.getElementById('discountAmt').textContent = '-' + fmt(Math.round(disc));
    document.getElementById('discountRow').classList.remove('hidden');
  } else {
    document.getElementById('discountRow').classList.add('hidden');
  }
}

// ══════════════════════════════════════════
//  DESCUENTO
// ══════════════════════════════════════════
function openDiscountModal() {
  document.getElementById('discountInput').value = state.discount || '';
  document.getElementById('discountModal').classList.remove('hidden');
}
function closeDiscountModal() { document.getElementById('discountModal').classList.add('hidden'); }
function applyDiscount() {
  const v = parseFloat(document.getElementById('discountInput').value);
  if (isNaN(v) || v < 0 || v > 100) { showToast('Descuento inválido (0-100)', 'error'); return; }
  state.discount = v; renderCart(); closeDiscountModal();
  showToast(`Descuento del ${v}% aplicado`);
}

// ══════════════════════════════════════════
//  PAGO
// ══════════════════════════════════════════
function selectPayment(btn) {
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.paymentMethod = btn.dataset.method;
}

// ══════════════════════════════════════════
//  CONFIRMAR VENTA
// ══════════════════════════════════════════
async function confirmSale() {
  if (!state.cart.length) { showToast('El carrito está vacío', 'warning'); return; }
  const { sub, disc, total } = calcCartTotals();
  const invoiceNum = state.invoiceCounter;

  const sale = {
    id: uid(),
    invoice: '#' + String(invoiceNum).padStart(4, '0'),
    invoiceNum,
    date: now(),
    items: state.cart.map(c => ({ ...c })),
    subtotal: sub, discount: disc, discountPct: state.discount,
    total, method: state.paymentMethod,
  };

  showLoading('Guardando venta…');
  try {
    await fbSet('sales/' + sale.id, sale);
    const updates = {};
    state.cart.forEach(item => {
      const p = state.products.find(x => x.id === item.productId);
      if (p) {
        const newStock = Math.max(0, +(p.stock - (item.qtyBase ?? item.qty)).toFixed(4));
        updates['products/' + p.id + '/stock'] = newStock;
        p.stock = newStock;
      }
    });
    updates['config/invoiceCounter'] = invoiceNum + 1;
    await fbUpdate('/', updates);
    state.invoiceCounter = invoiceNum + 1;
    state.sales.unshift(sale);
    hideLoading();
    playBeep();
    showToast(`✅ Venta confirmada – ${fmt(total)}`);
    state.cart = []; state.discount = 0;
    renderCart(); updateInvoiceNum(); renderProducts(); checkLowStock();
    showInvoiceModal(sale);
  } catch(e) {
    hideLoading();
    showToast('❌ Error guardando venta. Verifica tu conexión.', 'error');
    console.error(e);
  }
}

function updateInvoiceNum() {
  document.getElementById('invoiceNum').textContent = '#' + String(state.invoiceCounter).padStart(4, '0');
}

function checkLowStock() {
  const low = state.products.filter(p => p.stock > 0 && p.stock <= (p.minStock || LOW_STOCK_THRESHOLD));
  if (low.length) showToast(`⚠ Stock bajo: ${low.map(p => p.name).join(', ')}`, 'warning');
}

// ══════════════════════════════════════════
//  FACTURA
// ══════════════════════════════════════════
function printInvoice() {
  if (!state.sales.length) { showToast('No hay ventas registradas', 'warning'); return; }
  showInvoiceModal(state.sales[0]);
}

function showInvoiceModal(sale) {
  const biz = getBizInfo();
  const methodLabel = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };
  const itemLines = sale.items.map(i => {
    const total = fmt(Math.round(i.price * i.qty));
    return `<span class="tkt-item-desc">${i.name} x${i.qty} ${i.unit}</span>
            <span class="tkt-item-price">${fmt(Math.round(i.price))}/${i.unit}  →  ${total}</span>`;
  }).join('');

  document.getElementById('invoiceContent').innerHTML = `
    <div class="invoice-thermal">
      <div class="tkt-center tkt-bold tkt-big">${biz.name.toUpperCase()}</div>
      ${biz.slogan  ? `<div class="tkt-center tkt-muted">${biz.slogan}</div>` : ''}
      ${biz.address ? `<div class="tkt-center tkt-muted">${biz.address}</div>` : ''}
      ${biz.phone   ? `<div class="tkt-center tkt-muted">Tel: ${biz.phone}</div>` : ''}
      <div class="tkt-line"></div>
      <div class="tkt-row"><span>Factura:</span><span>${sale.invoice}</span></div>
      <div class="tkt-row"><span>Fecha:</span><span>${sale.date}</span></div>
      <div class="tkt-line"></div>
      <div class="tkt-col-header"><span>DESCRIPCION</span><span>TOTAL</span></div>
      <div class="tkt-line tkt-line-thin"></div>
      <div class="tkt-items">${itemLines}</div>
      <div class="tkt-line"></div>
      <div class="tkt-row"><span>Subtotal</span><span>${fmt(Math.round(sale.subtotal))}</span></div>
      ${sale.discountPct > 0 ? `<div class="tkt-row"><span>Descuento (${sale.discountPct}%)</span><span>-${fmt(Math.round(sale.discount))}</span></div>` : ''}
      <div class="tkt-line tkt-line-double"></div>
      <div class="tkt-row tkt-total"><span>TOTAL</span><span>${fmt(Math.round(sale.total))}</span></div>
      <div class="tkt-row"><span>Pago</span><span>${methodLabel[sale.method] || sale.method}</span></div>
      <div class="tkt-line"></div>
      <div class="tkt-center tkt-muted tkt-sm">${biz.footer}</div>
      <div class="tkt-center tkt-muted tkt-sm" style="margin-top:.25rem">${biz.name}</div>
      <div style="height:1.5rem"></div>
    </div>
  `;
  document.getElementById('invoiceModal').classList.remove('hidden');
}

function closeInvoiceModal() { document.getElementById('invoiceModal').classList.add('hidden'); }

// ══════════════════════════════════════════
//  INVENTARIO
// ══════════════════════════════════════════
function renderInventory(filter = '') {
  const query = filter.toLowerCase() || (document.getElementById('invSearch')?.value || '').toLowerCase();
  const list  = state.products.filter(p => p.name.toLowerCase().includes(query));
  const tbody = document.getElementById('inventoryBody');
  tbody.innerHTML = '';
  list.forEach(p => {
    const low = p.stock > 0 && p.stock <= (p.minStock || LOW_STOCK_THRESHOLD);
    const out = p.stock <= 0;
    const badgeClass = out ? 'stock-out' : low ? 'stock-low' : 'stock-ok';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="inv-emoji">${p.emoji}</span><span class="inv-name"> ${p.name}</span></td>
      <td>${p.category}</td>
      <td>${fmt(p.price)}</td>
      <td>
        <span class="stock-badge ${badgeClass}">${p.stock} ${p.unit}</span>
        <small style="color:var(--text-muted);font-size:.72rem"> (mín: ${p.minStock || LOW_STOCK_THRESHOLD})</small>
      </td>
      <td>${p.unit}</td>
      <td>
        <div class="inv-actions">
          <button class="btn-edit" onclick="openProductModal('${p.id}')">✏ Editar</button>
          <button class="btn-del"  onclick="deleteProduct('${p.id}')">🗑</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (!list.length)
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">Sin productos</td></tr>';
}

function filterInventory() { renderInventory(); }

function openProductModal(id) {
  state.editingProductId = id || null;
  const title = document.getElementById('productModalTitle');
  if (id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    title.textContent = '✏ Editar Producto';
    document.getElementById('pEmoji').value    = p.emoji;
    document.getElementById('pName').value     = p.name;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value    = p.price;
    document.getElementById('pStock').value    = p.stock;
    document.getElementById('pUnit').value     = p.unit;
    document.getElementById('pMinStock').value = p.minStock || LOW_STOCK_THRESHOLD;
  } else {
    title.textContent = '+ Nuevo Producto';
    ['pEmoji','pName','pPrice','pStock','pMinStock'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pCategory').value = 'Verduras';
    document.getElementById('pUnit').value = 'kg';
  }
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  state.editingProductId = null;
}

async function saveProduct() {
  const emoji    = document.getElementById('pEmoji').value.trim()    || '🌿';
  const name     = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value;
  const price    = parseFloat(document.getElementById('pPrice').value);
  const stock    = parseFloat(document.getElementById('pStock').value);
  const unit     = document.getElementById('pUnit').value;
  const minStock = parseFloat(document.getElementById('pMinStock').value) || LOW_STOCK_THRESHOLD;

  if (!name)                     { showToast('El nombre es obligatorio', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Precio inválido', 'error'); return; }
  if (isNaN(stock) || stock < 0) { showToast('Stock inválido', 'error'); return; }

  showLoading('Guardando producto…');
  try {
    if (state.editingProductId) {
      const idx = state.products.findIndex(p => p.id === state.editingProductId);
      if (idx !== -1) {
        state.products[idx] = { ...state.products[idx], emoji, name, category, price, stock, unit, minStock };
        await fbSet('products/' + state.editingProductId, state.products[idx]);
      }
      showToast('Producto actualizado ✅');
    } else {
      const np = { id: uid(), emoji, name, category, price, stock, unit, minStock };
      state.products.push(np);
      await fbSet('products/' + np.id, np);
      showToast('Producto agregado ✅');
    }
    hideLoading();
    closeProductModal(); renderInventory(); renderProducts(); buildCategoryChips();
  } catch(e) {
    hideLoading();
    showToast('❌ Error guardando. Verifica conexión.', 'error');
    console.error(e);
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  showLoading('Eliminando…');
  try {
    await remove(ref(db, 'products/' + id));
    state.products = state.products.filter(p => p.id !== id);
    hideLoading(); renderInventory(); renderProducts(); buildCategoryChips();
    showToast('Producto eliminado');
  } catch(e) {
    hideLoading(); showToast('❌ Error eliminando. Verifica conexión.', 'error');
  }
}

// ══════════════════════════════════════════
//  HISTORIAL
// ══════════════════════════════════════════
function renderHistory() {
  const query      = (document.getElementById('histSearch')?.value || '').toLowerCase();
  const todayStr   = today();
  const todaySales = state.sales.filter(s => s.date.includes(todayStr));
  document.getElementById('todaySalesTotal').textContent = fmt(todaySales.reduce((a, s) => a + s.total, 0));
  document.getElementById('todaySalesCount').textContent = todaySales.length;

  const filtered = state.sales.filter(s =>
    s.invoice.toLowerCase().includes(query) ||
    s.date.toLowerCase().includes(query) ||
    s.items.some(i => i.name.toLowerCase().includes(query))
  );
  const container = document.getElementById('historyList');
  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Sin ventas registradas.</p>';
    return;
  }
  filtered.forEach(sale => {
    const card = document.createElement('div');
    card.className = 'history-card';
    const itemsStr = sale.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');
    card.innerHTML = `
      <div class="hist-card-header">
        <div>
          <span class="hist-invoice">${sale.invoice}</span>
          <span class="hist-date"> · ${sale.date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span class="hist-method">${sale.method}</span>
          <span class="hist-total">${fmt(sale.total)}</span>
          <button style="font-size:.8rem;padding:.2rem .5rem;border-radius:6px;background:var(--green-100);color:var(--green-700);font-weight:700"
            onclick='showInvoiceModal(${JSON.stringify(sale)})'>Ver</button>
        </div>
      </div>
      <div class="hist-items">${itemsStr}</div>
      ${sale.discountPct > 0 ? `<div style="font-size:.78rem;color:var(--accent);margin-top:.25rem">Descuento ${sale.discountPct}% (-${fmt(sale.discount)})</div>` : ''}
    `;
    container.appendChild(card);
  });
}

function filterHistory() { renderHistory(); }

function exportJSON() {
  const data = JSON.stringify({ sales: state.sales, products: state.products, exportDate: now() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `fruver_export_${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('Exportado correctamente ✅');
}

// ══════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════
let chartTop = null, chartPay = null;

function updateDashboard() {
  const todayStr   = today();
  const todaySales = state.sales.filter(s => s.date.includes(todayStr));
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0);
  const lowCount   = state.products.filter(p => p.stock <= (p.minStock || LOW_STOCK_THRESHOLD)).length;
  document.getElementById('statIngresos').textContent  = fmt(todayTotal);
  document.getElementById('statVentas').textContent    = todaySales.length;
  document.getElementById('statProductos').textContent = state.products.length;
  document.getElementById('statBajo').textContent      = lowCount;

  const prodSales = {};
  state.sales.forEach(s => s.items.forEach(i => {
    prodSales[i.name] = (prodSales[i.name] || 0) + i.qty;
  }));
  const sorted = Object.entries(prodSales).sort((a, b) => b[1] - a[1]).slice(0, 7);

  if (chartTop) chartTop.destroy();
  chartTop = new Chart(document.getElementById('chartTopProducts').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted.map(x => x[0]),
      datasets: [{ label: 'Kg / Und', data: sorted.map(x => +x[1].toFixed(2)),
        backgroundColor: '#52b788cc', borderColor: '#40916c', borderWidth: 2, borderRadius: 6 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });

  const byMethod = {};
  state.sales.forEach(s => { byMethod[s.method] = (byMethod[s.method] || 0) + s.total; });
  if (chartPay) chartPay.destroy();
  chartPay = new Chart(document.getElementById('chartPayments').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byMethod).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
      datasets: [{ data: Object.values(byMethod),
        backgroundColor: ['#52b788','#74c69d','#40916c','#2d6a4f'], borderWidth: 2 }]
    },
    options: { responsive: true, plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } }
    }}
  });
}

async function resetSales() {
  if (!confirm('¿Reiniciar TODAS las ventas? Esta acción no se puede deshacer.')) return;
  showLoading('Reiniciando ventas…');
  try {
    await remove(ref(db, 'sales'));
    await fbSet('config/invoiceCounter', 1);
    state.sales = []; state.invoiceCounter = 1;
    hideLoading(); updateDashboard(); updateInvoiceNum(); renderHistory();
    showToast('Ventas reiniciadas');
  } catch(e) {
    hideLoading(); showToast('❌ Error. Verifica conexión.', 'error');
  }
}

// ══════════════════════════════════════════
//  CALCULADORA
// ══════════════════════════════════════════
let calcState = { expr: '', result: '0', prevResult: null };

function calcNum(n)  { calcState.expr += n; updateCalcDisplay(); }
function calcOp(op) {
  if (op === '%') {
    try {
      const v = eval(calcState.expr || calcState.result);
      calcState.expr = String(v / 100); calcState.result = calcState.expr;
    } catch(e) { calcState.expr = '0'; }
  } else {
    if (!calcState.expr && calcState.prevResult !== null) calcState.expr = String(calcState.prevResult);
    calcState.expr += op;
  }
  updateCalcDisplay();
}
function calcClear() { calcState = { expr: '', result: '0', prevResult: null }; updateCalcDisplay(); }
function calcDel()   { calcState.expr = calcState.expr.slice(0, -1); updateCalcDisplay(); }
function calcEquals() {
  try {
    const res = eval(calcState.expr);
    if (res === undefined || isNaN(res)) throw new Error();
    const r = +res.toFixed(8);
    calcState.prevResult = r;
    document.getElementById('calcExpr').textContent   = calcState.expr + ' =';
    calcState.result = String(r); calcState.expr = '';
    document.getElementById('calcResult').textContent = calcState.result;
    return;
  } catch(e) { calcState.result = 'Error'; calcState.expr = ''; }
  updateCalcDisplay();
}
function updateCalcDisplay() {
  document.getElementById('calcExpr').textContent   = calcState.expr;
  document.getElementById('calcResult').textContent = calcState.result;
  if (calcState.expr) {
    try {
      const p = eval(calcState.expr);
      if (!isNaN(p) && p !== undefined)
        document.getElementById('calcResult').textContent = +(+p).toFixed(8);
    } catch(e) {}
  }
}

document.addEventListener('keydown', e => {
  if (!document.querySelector('#sec-calculadora.active')) return;
  if ('0123456789.'.includes(e.key))     calcNum(e.key);
  else if ('+-*/'.includes(e.key))       calcOp(e.key);
  else if (e.key==='Enter'||e.key==='=') calcEquals();
  else if (e.key==='Backspace')          calcDel();
  else if (e.key==='Escape')             calcClear();
  else if (e.key==='%')                  calcOp('%');
});

// ══════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════
function loadConfigSection() {
  const biz = loadLS('bizInfo', {
    name: 'Fruver', slogan: 'Tu mercado de confianza',
    phone: '', address: '', footer: '¡Gracias por su compra!'
  });
  document.getElementById('sessionUser').textContent       = ADMIN_USER;
  document.getElementById('sessionLastChange').textContent = loadLS('lastCredChange', 'Sin cambios');
  document.getElementById('bizName').value    = biz.name    || '';
  document.getElementById('bizSlogan').value  = biz.slogan  || '';
  document.getElementById('bizPhone').value   = biz.phone   || '';
  document.getElementById('bizAddress').value = biz.address || '';
  document.getElementById('bizFooter').value  = biz.footer  || '';
  ['currentUser','currentPass','newUser','newPass','confirmPass'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('credError').textContent = '';
}

async function saveCredentials() {
  const currentUser = document.getElementById('currentUser').value.trim();
  const currentPass = document.getElementById('currentPass').value;
  const newUser     = document.getElementById('newUser').value.trim();
  const newPass     = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  const errEl       = document.getElementById('credError');
  errEl.textContent = '';

  if (!currentUser || !currentPass) { errEl.textContent = '❌ Ingresa tu usuario y contraseña actuales.'; return; }
  if (currentUser !== ADMIN_USER || currentPass !== ADMIN_PASS) { errEl.textContent = '❌ Credenciales actuales incorrectas.'; return; }
  if (!newUser)           { errEl.textContent = '❌ El nuevo usuario no puede estar vacío.'; return; }
  if (newPass.length < 4) { errEl.textContent = '❌ La contraseña debe tener al menos 4 caracteres.'; return; }
  if (newPass !== confirmPass) { errEl.textContent = '❌ Las contraseñas no coinciden.'; return; }

  showLoading('Guardando credenciales…');
  try {
    await fbSet('config/credentials', { user: newUser, pass: newPass });
    ADMIN_USER = newUser; ADMIN_PASS = newPass;
    const ts = now(); saveLS('lastCredChange', ts);
    document.getElementById('sessionUser').textContent       = newUser;
    document.getElementById('sessionLastChange').textContent = ts;
    ['currentUser','currentPass','newUser','newPass','confirmPass'].forEach(id => {
      document.getElementById(id).value = '';
    });
    hideLoading(); showToast('✅ Credenciales actualizadas correctamente');
  } catch(e) {
    hideLoading(); errEl.textContent = '❌ Error guardando. Verifica conexión.';
  }
}

function saveBizInfo() {
  const biz = {
    name:    document.getElementById('bizName').value.trim()    || 'Fruver',
    slogan:  document.getElementById('bizSlogan').value.trim()  || 'Tu mercado de confianza',
    phone:   document.getElementById('bizPhone').value.trim(),
    address: document.getElementById('bizAddress').value.trim(),
    footer:  document.getElementById('bizFooter').value.trim()  || '¡Gracias por su compra!',
  };
  saveLS('bizInfo', biz);
  showToast('✅ Datos del negocio guardados');
}

function getBizInfo() {
  return loadLS('bizInfo', {
    name: 'Fruver', slogan: 'Tu mercado de confianza',
    phone: '', address: '', footer: '¡Gracias por su compra!'
  });
}

// ══════════════════════════════════════════
//  MODO OFFLINE
// ══════════════════════════════════════════

function getPendingSales() { return loadLS('pendingSales', []); }
function savePendingSales(list) { saveLS('pendingSales', list); }

function updateOnlineIndicator(online) {
  let el = document.getElementById('onlineIndicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'onlineIndicator';
    el.style.cssText = `
      position:fixed; top:.75rem; right:1rem; z-index:7000;
      padding:.3rem .8rem; border-radius:20px; font-size:.75rem;
      font-weight:700; display:flex; align-items:center; gap:.4rem;
      box-shadow:0 2px 8px rgba(0,0,0,.2); transition:all .3s ease;
    `;
    document.body.appendChild(el);
  }
  if (online) {
    el.style.background = '#d8f3dc'; el.style.color = '#2d6a4f';
    el.innerHTML = '🟢 En línea';
  } else {
    el.style.background = '#fff3cd'; el.style.color = '#856404';
    el.innerHTML = '🟡 Sin internet – modo offline';
  }
}

function queueSaleOffline(sale) {
  const pending = getPendingSales();
  pending.push(sale);
  savePendingSales(pending);
  saveLS('products_cache', state.products);
  saveLS('sales_cache', state.sales);
  saveLS('invoiceCounter_cache', state.invoiceCounter);
}

async function syncPendingSales() {
  const pending = getPendingSales().filter(s => !s._isInit);
  if (!pending.length) return;
  showToast(`🔄 Sincronizando ${pending.length} venta(s) pendiente(s)…`);
  const synced = [];
  for (const sale of pending) {
    try {
      const { _pendingSync, ...cleanSale } = sale;
      await fbSet('sales/' + cleanSale.id, cleanSale);
      const updates = {};
      updates['config/invoiceCounter'] = state.invoiceCounter;
      await fbUpdate('/', updates);
      synced.push(sale.id);
    } catch(e) { break; }
  }
  if (synced.length) {
    savePendingSales(getPendingSales().filter(s => !synced.includes(s.id)));
    showToast(`✅ ${synced.length} venta(s) sincronizadas con Firebase`);
  }
}

async function confirmSaleOffline() {
  if (!state.cart.length) { showToast('El carrito está vacío', 'warning'); return; }
  const { sub, disc, total } = calcCartTotals();
  const invoiceNum = state.invoiceCounter;
  const sale = {
    id: uid(),
    invoice: '#' + String(invoiceNum).padStart(4, '0'),
    invoiceNum, date: now(),
    items: state.cart.map(c => ({ ...c })),
    subtotal: sub, discount: disc, discountPct: state.discount,
    total, method: state.paymentMethod, _pendingSync: true,
  };
  state.cart.forEach(item => {
    const p = state.products.find(x => x.id === item.productId);
    if (p) p.stock = Math.max(0, +(p.stock - (item.qtyBase ?? item.qty)).toFixed(4));
  });
  state.invoiceCounter = invoiceNum + 1;
  state.sales.unshift(sale);
  queueSaleOffline(sale);
  playBeep();
  showToast(`✅ Venta guardada offline – ${fmt(total)}`, 'warning');
  state.cart = []; state.discount = 0;
  renderCart(); updateInvoiceNum(); renderProducts(); checkLowStock();
  showInvoiceModal(sale);
}

window._confirmSaleWithOffline = async function() {
  if (navigator.onLine) { await confirmSale(); }
  else { await confirmSaleOffline(); }
};

window.addEventListener('online', async () => {
  updateOnlineIndicator(true);
  showToast('🌐 Conexión restaurada');
  await syncPendingSales();
  try {
    const fbProducts = await fbGet('products');
    if (fbProducts) { state.products = Object.values(fbProducts); saveLS('products_cache', state.products); renderProducts(); renderInventory(); buildCategoryChips(); }
    const fbSales = await withTimeout(fbGet('sales'), 5000);
    if (fbSales) { state.sales = Object.values(fbSales).sort((a,b)=>(b.invoiceNum||0)-(a.invoiceNum||0)); saveLS('sales_cache', state.sales); renderHistory(); updateDashboard(); }
    const counter = await withTimeout(fbGet('config/invoiceCounter'), 5000);
    if (counter) { state.invoiceCounter = counter; updateInvoiceNum(); }
  } catch(e) {}
});

window.addEventListener('offline', () => {
  updateOnlineIndicator(false);
  showToast('⚠ Sin internet – ventas se guardan localmente', 'warning');
});

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function initWithOfflineFallback() {
  showLoading('Cargando datos…');
  try {
    if (!navigator.onLine) throw new Error('offline');
    const creds = await withTimeout(fbGet('config/credentials'), 5000);
    if (creds) { ADMIN_USER = creds.user; ADMIN_PASS = creds.pass; saveLS('credentials', {user: creds.user, pass: creds.pass}); }
    const fbProducts = await withTimeout(fbGet('products'), 5000);
    if (fbProducts) {
      state.products = Object.values(fbProducts);
      saveLS('products_cache', state.products);
    } else if (!navigator.onLine) {
      state.products = loadLS('products_cache', DEFAULT_PRODUCTS);
    } else {
      state.products = DEFAULT_PRODUCTS;
      const obj = {}; DEFAULT_PRODUCTS.forEach(p => { obj[p.id] = p; });
      await fbSet('products', obj);
      saveLS('products_cache', state.products);
    }
    const fbSales = await withTimeout(fbGet('sales'), 5000);
    state.sales = fbSales
      ? Object.values(fbSales).sort((a,b)=>(b.invoiceNum||0)-(a.invoiceNum||0))
      : loadLS('sales_cache', []);
    saveLS('sales_cache', state.sales);
    const counter = await withTimeout(fbGet('config/invoiceCounter'), 5000);
    state.invoiceCounter = counter || loadLS('invoiceCounter_cache', 1);
    updateOnlineIndicator(true);
    listenRealtime();
  } catch(e) {
    console.warn('Firebase no disponible, usando caché local');
    state.products     = loadLS('products_cache', DEFAULT_PRODUCTS);
    state.sales        = loadLS('sales_cache', []);
    state.invoiceCounter = loadLS('invoiceCounter_cache', 1);
    updateOnlineIndicator(false);
    showToast('📦 Cargando datos locales (sin internet)', 'warning');
  }
  hideLoading();
  renderProducts(); renderInventory(); renderHistory();
  buildCategoryChips(); updateInvoiceNum();
  startClock(); updateDashboard(); loadConfigSection();
}

// ══════════════════════════════════════════
//  EXPONER FUNCIONES AL SCOPE GLOBAL
//  (necesario porque este archivo es un módulo ES)
// ══════════════════════════════════════════
Object.assign(window, {
  doLogin, doLogout,
  switchSection, toggleSidebar, toggleTheme,
  filterProducts,
  openQtyModal, selectSaleUnit, closeQtyModal, confirmQty,
  removeFromCart, changeQty, clearCart,
  openDiscountModal, closeDiscountModal, applyDiscount,
  selectPayment,
  confirmSale, printInvoice, showInvoiceModal, closeInvoiceModal,
  filterInventory, openProductModal, closeProductModal, saveProduct, deleteProduct,
  filterHistory, exportJSON,
  resetSales,
  calcNum, calcOp, calcClear, calcDel, calcEquals,
  saveCredentials, saveBizInfo,
});
