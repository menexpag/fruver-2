// --- ESTADO GLOBAL ---
let products = JSON.parse(localStorage.getItem('inventory')) || [
    { id: 1, name: 'Zanahoria', price: 800, icon: '🥕', stock: 100 },
    { id: 2, name: 'Papa', price: 600, icon: '🥔', stock: 150 },
    { id: 3, name: 'Cebolla', price: 700, icon: '🧅', stock: 80 },
    { id: 4, name: 'Tomate', price: 1200, icon: '🍅', stock: 60 },
    { id: 5, name: 'Lechuga', price: 400, icon: '🥬', stock: 40 }
];

let cart = [];
let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
let currentInput = ""; // Para la calculadora/cantidad

// --- NAVEGACIÓN ---
function showSection(sectionId) {
    // Ocultar todas las secciones principales
    document.querySelector('.sidebar').style.display = sectionId === 'venta' ? 'flex' : 'none';
    const mainArea = document.querySelector('.products-area');
    
    if (sectionId === 'venta') {
        renderVenta();
    } else if (sectionId === 'inventario') {
        renderInventario();
    } else if (sectionId === 'historial') {
        renderHistorial();
    }
}

// --- MÓDULO: CALCULADORA / CANTIDAD ---
function addNum(n) {
    if (n === '.' && currentInput.includes('.')) return;
    currentInput += n;
    updateDisplay();
}

function deleteNum() {
    currentInput = currentInput.slice(0, -1);
    updateDisplay();
}

function clearQty() {
    currentInput = "";
    updateDisplay();
}

function updateDisplay() {
    document.getElementById('qty-display').innerText = currentInput || "0";
}

// --- MÓDULO: VENTA ---
function renderVenta() {
    const area = document.querySelector('.products-area');
    area.innerHTML = `
        <input type="text" id="search" placeholder="🔍 Buscar producto..." onkeyup="filterProducts()">
        <div class="product-grid" id="product-grid"></div>
    `;
    renderProductCards(products);
}

function renderProductCards(data) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = data.map(p => `
        <div class="card" onclick="addToCart(${p.id})">
            <div style="font-size: 40px">${p.icon}</div>
            <h4>${p.name}</h4>
            <p style="color: green; font-weight: bold;">$${p.price}/kg</p>
            <small>Stock: ${p.stock}kg</small>
        </div>
    `).join('');
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    const qty = parseFloat(currentInput) || 1;

    if (qty > product.stock) {
        alert("No hay suficiente stock");
        return;
    }

    const item = { 
        ...product, 
        qty, 
        total: product.price * qty,
        timestamp: new Date().toLocaleString()
    };
    
    cart.push(item);
    updateCartUI();
    clearQty();
}

function confirmSale() {
    if (cart.length === 0) return;

    // Restar stock y guardar historial
    cart.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        p.stock -= item.qty;
    });

    const sale = {
        id: Date.now(),
        items: [...cart],
        total: cart.reduce((acc, i) => acc + i.total, 0),
        date: new Date().toLocaleString()
    };

    salesHistory.push(sale);
    localStorage.setItem('inventory', JSON.stringify(products));
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    
    cart = [];
    updateCartUI();
    renderVenta();
    alert("Venta realizada con éxito");
}

// --- MÓDULO: INVENTARIO ---
function renderInventario() {
    const area = document.querySelector('.products-area');
    area.innerHTML = `
        <h2>Gestión de Inventario</h2>
        <table style="width:100%; background:white; border-collapse: collapse;">
            <thead>
                <tr style="background:#ddd"><th>Producto</th><th>Precio/kg</th><th>Stock Actual</th><th>Acción</th></tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td>${p.icon} ${p.name}</td>
                        <td>$${p.price}</td>
                        <td>${p.stock} kg</td>
                        <td><button onclick="addStock(${p.id})">+ Stock</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function addStock(id) {
    const qty = prompt("¿Cuántos kg desea añadir?");
    if (qty) {
        products.find(p => p.id === id).stock += parseFloat(qty);
        localStorage.setItem('inventory', JSON.stringify(products));
        renderInventario();
    }
}

// --- MÓDULO: HISTORIAL ---
function renderHistorial() {
    const area = document.querySelector('.products-area');
    area.innerHTML = `
        <h2>Historial de Ventas</h2>
        <div style="background:white; padding:20px;">
            ${salesHistory.reverse().map(sale => `
                <div style="border-bottom:1px solid #eee; padding:10px 0;">
                    <strong>Ticket #${sale.id}</strong> - ${sale.date}<br>
                    ${sale.items.map(i => `${i.name} (x${i.qty})`).join(', ')}<br>
                    <strong>Total: $${sale.total.toFixed(2)}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

// Inicialización corregida
document.querySelectorAll('nav button').forEach((btn, index) => {
    const views = ['venta', 'inventario', 'historial'];
    btn.onclick = () => {
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showSection(views[index]);
    };
});

showSection('venta');
