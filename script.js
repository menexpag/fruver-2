/* ═══════════════════════════════════════════
   La Legumbrería – POS · script.js
   ═══════════════════════════════════════════ */

'use strict';

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
  pendingProductId: null,   // para modal de cantidad
};

const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';
const LOW_STOCK_THRESHOLD = 5;

// Productos de ejemplo
const DEFAULT_PRODUCTS = [
  { id: uid(), emoji: '🥔', name: 'Papa', category: 'Tubérculos', price: 1800, stock: 40, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🧅', name: 'Cebolla', category: 'Verduras',  price: 2500, stock: 30, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🍅', name: 'Tomate', category: 'Verduras',  price: 3200, stock: 25, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🥕', name: 'Zanahoria', category: 'Verduras', price: 2200, stock: 20, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🌿', name: 'Yuca', category: 'Tubérculos', price: 1500, stock: 35, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🍌', name: 'Plátano', category: 'Frutas', price: 1200, stock: 50, unit: 'kg', minStock: 8 },
  { id: uid(), emoji: '🧄', name: 'Ajo', category: 'Aromáticas', price: 12000, stock: 10, unit: 'kg', minStock: 2 },
  { id: uid(), emoji: '🍋', name: 'Limón', category: 'Frutas', price: 2800, stock: 45, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🌿', name: 'Cilantro', category: 'Aromáticas', price: 800, stock: 15, unit: 'manojo', minStock: 3 },
  { id: uid(), emoji: '🥦', name: 'Brócoli', category: 'Verduras', price: 3500, stock: 18, unit: 'kg', minStock: 4 },
  { id: uid(), emoji: '🥬', name: 'Lechuga', category: 'Verduras', price: 1500, stock: 20, unit: 'und', minStock: 4 },
  { id: uid(), emoji: '🫚', name: 'Pepino', category: 'Verduras', price: 1800, stock: 22, unit: 'kg', minStock: 4 },
  { id: uid(), emoji: '🍠', name: 'Batata', category: 'Tubérculos', price: 1600, stock: 30, unit: 'kg', minStock: 5 },
  { id: uid(), emoji: '🌽', name: 'Mazorca', category: 'Verduras', price: 1000, stock: 60, unit: 'und', minStock: 10 },
  { id: uid(), emoji: '🍐', name: 'Pera', category: 'Frutas', price: 3800, stock: 12, unit: 'kg', minStock: 3 },
];

// ══════════════════════════════════════════
//  UTILIDADES
// ══════════════════════════════════════════
function uid() { return '_' + Math.random().toString(36).slice(2, 11); }
function fmt(n) { return '$' + Number(n).toLocaleString('es-CO'); }
function today() { return new Date().toLocaleDateString('es-CO'); }
function now() { return new Date().toLocaleString('es-CO'); }

function saveLS(key, val) {
  try { localStorage.setItem('legumbreria_' + key, JSON.stringify(val)); } catch(e) {}
}
function loadLS(key, def) {
  try {
    const v = localStorage.getItem('legumbreria_' + key);
    return v ? JSON.parse(v) : def;
  } catch(e) { return def; }
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3200);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
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
function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    init();
  } else {
    document.getElementById('loginError').textContent = '❌ Usuario o contraseña incorrectos';
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
function init() {
  state.products = loadLS('products', DEFAULT_PRODUCTS);
  state.sales    = loadLS('sales', []);
  state.invoiceCounter = loadLS('invoiceCounter', 1);
  renderProducts();
  renderInventory();
  renderHistory();
  buildCategoryChips();
  updateInvoiceNum();
  startClock();
  updateDashboard();
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
  tick();
  setInterval(tick, 1000);
}

// ══════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════
function switchSection(name, btn) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const sec = document.getElementById('sec-' + name);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Cerrar sidebar en móvil
  document.getElementById('sidebar').classList.remove('open');

  if (name === 'admin') updateDashboard();
  if (name === 'historial') renderHistory();
  if (name === 'inventario') renderInventory();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleTheme() {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('themeIcon').textContent = dark ? '🌙' : '☀️';
}

// ══════════════════════════════════════════
//  PRODUCTOS – RENDERIZADO
// ══════════════════════════════════════════
function getCategories() {
  const cats = ['Todos', ...new Set(state.products.map(p => p.category))];
  return cats;
}

function buildCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';
  getCategories().forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (cat === state.activeCategory ? ' active' : '');
    btn.textContent = cat;
    btn.onclick = () => {
      state.activeCategory = cat;
      buildCategoryChips();
      filterProducts();
    };
    container.appendChild(btn);
  });
}

function renderProducts(list) {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const products = list || state.products.filter(p => {
    const matchCat = state.activeCategory === 'Todos' || p.category === state.activeCategory;
    const matchQ   = p.name.toLowerCase().includes(query);
    return matchCat && matchQ;
  });

  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem;">Sin productos encontrados.</p>';
    return;
  }

  products.forEach(p => {
    const low = p.stock > 0 && p.stock <= (p.minStock || LOW_STOCK_THRESHOLD);
    const out = p.stock <= 0;
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

function filterProducts() {
  buildCategoryChips();
  renderProducts();
}

// ══════════════════════════════════════════
//  MODAL DE CANTIDAD
// ══════════════════════════════════════════
function openQtyModal(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  state.pendingProductId = productId;
  document.getElementById('qtyModalTitle').textContent = `${p.emoji} ${p.name} – cantidad`;
  document.getElementById('qtyInput').value = '1';
  document.getElementById('qtyModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('qtyInput').focus(), 100);
}
function closeQtyModal() {
  document.getElementById('qtyModal').classList.add('hidden');
  state.pendingProductId = null;
}
function confirmQty() {
  const qty = parseFloat(document.getElementById('qtyInput').value);
  if (!qty || qty <= 0) { showToast('Cantidad inválida', 'error'); return; }
  addToCart(state.pendingProductId, qty);
  closeQtyModal();
}
document.getElementById('qtyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmQty();
});

// ══════════════════════════════════════════
//  CARRITO
// ══════════════════════════════════════════
function addToCart(productId, qty) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  if (p.stock < qty) { showToast(`⚠ Stock insuficiente (${p.stock} ${p.unit})`, 'warning'); return; }

  const existing = state.cart.find(c => c.productId === productId);
  if (existing) {
    if (p.stock < existing.qty + qty) { showToast('⚠ Sin stock suficiente', 'warning'); return; }
    existing.qty = +(existing.qty + qty).toFixed(3);
  } else {
    state.cart.push({ productId, qty, name: p.name, emoji: p.emoji, price: p.price, unit: p.unit });
  }
  renderCart();
  showToast(`✅ ${p.name} agregado`);
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(c => c.productId !== productId);
  renderCart();
}

function changeQty(productId, delta) {
  const item = state.cart.find(c => c.productId === productId);
  if (!item) return;
  const newQty = +(item.qty + delta).toFixed(3);
  if (newQty <= 0) { removeFromCart(productId); return; }
  const p = state.products.find(x => x.id === productId);
  if (p && p.stock < newQty) { showToast('⚠ Sin stock suficiente', 'warning'); return; }
  item.qty = newQty;
  renderCart();
}

function clearCart() {
  if (!state.cart.length) return;
  state.cart = [];
  state.discount = 0;
  document.getElementById('discountRow').classList.add('hidden');
  renderCart();
}

function calcCartTotals() {
  const sub = state.cart.reduce((a, c) => a + c.price * c.qty, 0);
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
      const subtotal = item.price * item.qty;
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <span class="cart-item-emoji">${item.emoji}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${fmt(item.price)}/${item.unit} × ${item.qty}</div>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-total">${fmt(subtotal)}</div>
          <div class="cart-qty-controls">
            <button class="qty-btn del" onclick="removeFromCart('${item.productId}')">✕</button>
            <button class="qty-btn" onclick="changeQty('${item.productId}', -0.5)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.productId}', 0.5)">+</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  const { sub, disc, total } = calcCartTotals();
  document.getElementById('cartSubtotal').textContent = fmt(sub);
  document.getElementById('cartTotal').textContent = fmt(total);
  if (state.discount > 0) {
    document.getElementById('discPct').textContent = state.discount;
    document.getElementById('discountAmt').textContent = '-' + fmt(disc);
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
function closeDiscountModal() {
  document.getElementById('discountModal').classList.add('hidden');
}
function applyDiscount() {
  const v = parseFloat(document.getElementById('discountInput').value);
  if (isNaN(v) || v < 0 || v > 100) { showToast('Descuento inválido (0-100)', 'error'); return; }
  state.discount = v;
  renderCart();
  closeDiscountModal();
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
function confirmSale() {
  if (!state.cart.length) { showToast('El carrito está vacío', 'warning'); return; }

  const { sub, disc, total } = calcCartTotals();
  const invoiceNum = String(state.invoiceCounter).padStart(4, '0');

  // Registrar venta
  const sale = {
    id: uid(),
    invoice: '#' + invoiceNum,
    date: now(),
    items: state.cart.map(c => ({ ...c })),
    subtotal: sub,
    discount: disc,
    discountPct: state.discount,
    total,
    method: state.paymentMethod,
  };
  state.sales.unshift(sale);
  saveLS('sales', state.sales);

  // Descontar stock
  state.cart.forEach(item => {
    const p = state.products.find(x => x.id === item.productId);
    if (p) p.stock = Math.max(0, +(p.stock - item.qty).toFixed(3));
  });
  saveLS('products', state.products);

  // Actualizar contador
  state.invoiceCounter++;
  saveLS('invoiceCounter', state.invoiceCounter);

  playBeep();
  showToast(`✅ Venta confirmada – ${fmt(total)}`);

  // Limpiar
  state.cart = [];
  state.discount = 0;
  renderCart();
  updateInvoiceNum();
  renderProducts();
  checkLowStock();
}

function updateInvoiceNum() {
  document.getElementById('invoiceNum').textContent = '#' + String(state.invoiceCounter).padStart(4, '0');
}

function checkLowStock() {
  const low = state.products.filter(p => p.stock > 0 && p.stock <= (p.minStock || LOW_STOCK_THRESHOLD));
  if (low.length) showToast(`⚠ Stock bajo: ${low.map(p=>p.name).join(', ')}`, 'warning');
}

// ══════════════════════════════════════════
//  FACTURA / IMPRESIÓN
// ══════════════════════════════════════════
function printInvoice() {
  if (!state.sales.length) { showToast('No hay ventas registradas', 'warning'); return; }
  showInvoiceModal(state.sales[0]);
}

function showInvoiceModal(sale) {
  const rows = sale.items.map(i => `
    <tr>
      <td>${i.emoji} ${i.name}</td>
      <td style="text-align:center">${i.qty} ${i.unit}</td>
      <td style="text-align:right">${fmt(i.price)}</td>
      <td style="text-align:right">${fmt(i.price * i.qty)}</td>
    </tr>
  `).join('');

  document.getElementById('invoiceContent').innerHTML = `
    <div class="invoice-print">
      <div class="inv-header">
        <div style="font-size:2rem">🌿</div>
        <h2>La Legumbrería</h2>
        <p>Tu mercado de confianza</p>
        <hr style="margin:.5rem 0;border-color:var(--border)">
        <p><b>${sale.invoice}</b> · ${sale.date}</p>
      </div>
      <table>
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left">Producto</th>
            <th style="text-align:center">Cant.</th>
            <th style="text-align:right">Precio</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">${fmt(sale.subtotal)}</td></tr>
        ${sale.discountPct > 0 ? `<tr><td>Descuento (${sale.discountPct}%)</td><td style="text-align:right">-${fmt(sale.discount)}</td></tr>` : ''}
        <tr class="inv-total"><td><b>TOTAL</b></td><td style="text-align:right"><b>${fmt(sale.total)}</b></td></tr>
        <tr><td>Método de pago</td><td style="text-align:right;text-transform:capitalize">${sale.method}</td></tr>
      </table>
      <div class="inv-footer">
        <p>¡Gracias por su compra!</p>
        <p>Vuelva pronto 🌿</p>
      </div>
    </div>
  `;
  document.getElementById('invoiceModal').classList.remove('hidden');
}

function closeInvoiceModal() {
  document.getElementById('invoiceModal').classList.add('hidden');
}

// ══════════════════════════════════════════
//  INVENTARIO
// ══════════════════════════════════════════
function renderInventory(filter = '') {
  const query = filter.toLowerCase() || (document.getElementById('invSearch')?.value || '').toLowerCase();
  const list = state.products.filter(p => p.name.toLowerCase().includes(query));
  const tbody = document.getElementById('inventoryBody');
  tbody.innerHTML = '';

  list.forEach(p => {
    const low = p.stock > 0 && p.stock <= (p.minStock || LOW_STOCK_THRESHOLD);
    const out = p.stock <= 0;
    const badgeClass = out ? 'stock-out' : low ? 'stock-low' : 'stock-ok';
    const badgeLabel = out ? 'Sin stock' : low ? 'Stock bajo' : 'OK';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="inv-emoji">${p.emoji}</span>
        <span class="inv-name"> ${p.name}</span>
      </td>
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
          <button class="btn-del" onclick="deleteProduct('${p.id}')">🗑</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">Sin productos</td></tr>';
  }
}

function filterInventory() {
  renderInventory();
}

// ── Modal producto ──
function openProductModal(id) {
  state.editingProductId = id || null;
  const modal = document.getElementById('productModal');
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
  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  state.editingProductId = null;
}

function saveProduct() {
  const emoji    = document.getElementById('pEmoji').value.trim() || '🌿';
  const name     = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value;
  const price    = parseFloat(document.getElementById('pPrice').value);
  const stock    = parseFloat(document.getElementById('pStock').value);
  const unit     = document.getElementById('pUnit').value;
  const minStock = parseFloat(document.getElementById('pMinStock').value) || LOW_STOCK_THRESHOLD;

  if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Precio inválido', 'error'); return; }
  if (isNaN(stock) || stock < 0) { showToast('Stock inválido', 'error'); return; }

  if (state.editingProductId) {
    const idx = state.products.findIndex(p => p.id === state.editingProductId);
    if (idx !== -1) state.products[idx] = { ...state.products[idx], emoji, name, category, price, stock, unit, minStock };
    showToast('Producto actualizado ✅');
  } else {
    state.products.push({ id: uid(), emoji, name, category, price, stock, unit, minStock });
    showToast('Producto agregado ✅');
  }

  saveLS('products', state.products);
  closeProductModal();
  renderInventory();
  renderProducts();
  buildCategoryChips();
}

function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  state.products = state.products.filter(p => p.id !== id);
  saveLS('products', state.products);
  renderInventory();
  renderProducts();
  buildCategoryChips();
  showToast('Producto eliminado');
}

// ══════════════════════════════════════════
//  HISTORIAL
// ══════════════════════════════════════════
function renderHistory() {
  const query = (document.getElementById('histSearch')?.value || '').toLowerCase();
  const todayStr = today();
  const todaySales = state.sales.filter(s => s.date.includes(todayStr));
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0);

  document.getElementById('todaySalesTotal').textContent = fmt(todayTotal);
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
      ${sale.discountPct > 0 ? `<div style="font-size:.78rem;color:var(--accent);margin-top:.25rem">Descuento ${sale.discountPct}% aplicado (-${fmt(sale.discount)})</div>` : ''}
    `;
    container.appendChild(card);
  });
}

function filterHistory() { renderHistory(); }

function exportJSON() {
  const data = JSON.stringify({ sales: state.sales, products: state.products, exportDate: now() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `legumbreria_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exportado correctamente ✅');
}

// ══════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════
let chartTop = null;
let chartPay = null;

function updateDashboard() {
  const todayStr = today();
  const todaySales = state.sales.filter(s => s.date.includes(todayStr));
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0);
  const lowStockCount = state.products.filter(p => p.stock <= (p.minStock || LOW_STOCK_THRESHOLD)).length;

  document.getElementById('statIngresos').textContent = fmt(todayTotal);
  document.getElementById('statVentas').textContent   = todaySales.length;
  document.getElementById('statProductos').textContent = state.products.length;
  document.getElementById('statBajo').textContent     = lowStockCount;

  // Productos más vendidos (todas las ventas)
  const prodSales = {};
  state.sales.forEach(s => s.items.forEach(i => {
    prodSales[i.name] = (prodSales[i.name] || 0) + i.qty;
  }));
  const sorted = Object.entries(prodSales).sort((a, b) => b[1] - a[1]).slice(0, 7);

  if (chartTop) chartTop.destroy();
  const ctx1 = document.getElementById('chartTopProducts').getContext('2d');
  chartTop = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: sorted.map(x => x[0]),
      datasets: [{
        label: 'Kg / Und vendidos',
        data: sorted.map(x => +x[1].toFixed(2)),
        backgroundColor: '#52b788cc',
        borderColor: '#40916c',
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Ingresos por método de pago
  const byMethod = {};
  state.sales.forEach(s => {
    byMethod[s.method] = (byMethod[s.method] || 0) + s.total;
  });

  if (chartPay) chartPay.destroy();
  const ctx2 = document.getElementById('chartPayments').getContext('2d');
  chartPay = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: Object.keys(byMethod).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
      datasets: [{
        data: Object.values(byMethod),
        backgroundColor: ['#52b788', '#74c69d', '#40916c', '#2d6a4f'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + fmt(ctx.raw)
          }
        }
      }
    }
  });
}

function resetSales() {
  if (!confirm('¿Reiniciar TODAS las ventas? Esta acción no se puede deshacer.')) return;
  state.sales = [];
  state.invoiceCounter = 1;
  saveLS('sales', state.sales);
  saveLS('invoiceCounter', state.invoiceCounter);
  updateDashboard();
  updateInvoiceNum();
  renderHistory();
  showToast('Ventas reiniciadas');
}

// ══════════════════════════════════════════
//  CALCULADORA
// ══════════════════════════════════════════
let calcState = { expr: '', result: '0', prevResult: null };

function calcNum(n) {
  calcState.expr += n;
  updateCalcDisplay();
}
function calcOp(op) {
  if (op === '%') {
    // Calcular porcentaje del valor actual
    try {
      const val = eval(calcState.expr || calcState.result);
      calcState.expr = String(val / 100);
      calcState.result = calcState.expr;
    } catch(e) { calcState.expr = '0'; }
  } else {
    if (!calcState.expr && calcState.prevResult !== null) {
      calcState.expr = String(calcState.prevResult);
    }
    calcState.expr += op;
  }
  updateCalcDisplay();
}
function calcClear() {
  calcState = { expr: '', result: '0', prevResult: null };
  updateCalcDisplay();
}
function calcDel() {
  calcState.expr = calcState.expr.slice(0, -1);
  updateCalcDisplay();
}
function calcEquals() {
  try {
    const res = eval(calcState.expr);
    if (res === undefined || isNaN(res)) throw new Error();
    const rounded = +res.toFixed(8);
    calcState.prevResult = rounded;
    document.getElementById('calcExpr').textContent = calcState.expr + ' =';
    calcState.result = String(rounded);
    calcState.expr = '';
    document.getElementById('calcResult').textContent = calcState.result;
    return;
  } catch(e) {
    calcState.result = 'Error';
    calcState.expr = '';
  }
  updateCalcDisplay();
}
function updateCalcDisplay() {
  document.getElementById('calcExpr').textContent   = calcState.expr;
  document.getElementById('calcResult').textContent = calcState.result;
  if (calcState.expr) {
    try {
      const preview = eval(calcState.expr);
      if (!isNaN(preview) && preview !== undefined) {
        document.getElementById('calcResult').textContent = +(+preview).toFixed(8);
      }
    } catch(e) {}
  }
}

// Soporte teclado para calculadora
document.addEventListener('keydown', e => {
  const active = document.querySelector('#sec-calculadora.active');
  if (!active) return;
  if ('0123456789.'.includes(e.key)) calcNum(e.key);
  else if ('+-*/'.includes(e.key)) calcOp(e.key);
  else if (e.key === 'Enter' || e.key === '=') calcEquals();
  else if (e.key === 'Backspace') calcDel();
  else if (e.key === 'Escape') calcClear();
  else if (e.key === '%') calcOp('%');
});
