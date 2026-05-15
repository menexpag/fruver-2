const products = [
    { id: 1, name: 'Zanahoria', price: 800, icon: '🥕' },
    { id: 2, name: 'Papa', price: 600, icon: '🥔' },
    { id: 3, name: 'Cebolla', price: 700, icon: '🧅' },
    { id: 4, name: 'Tomate', price: 1200, icon: '🍅' },
    { id: 5, name: 'Lechuga', price: 400, icon: '🥬' }
];

let cart = [];
let currentQty = "";

// Renderizar productos
function renderProducts(data = products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = data.map(p => `
        <div class="card" onclick="addToCart(${p.id})">
            <div style="font-size: 40px">${p.icon}</div>
            <h4>${p.name}</h4>
            <p style="color: green; font-weight: bold;">$${p.price}/kg</p>
        </div>
    `).join('');
}

// Lógica del Teclado
function addNum(n) {
    currentQty += n;
    document.getElementById('qty-display').innerText = currentQty;
}

function clearQty() {
    currentQty = "";
    document.getElementById('qty-display').innerText = "0";
}

function deleteNum() {
    currentQty = currentQty.slice(0, -1);
    document.getElementById('qty-display').innerText = currentQty || "0";
}

// Lógica del Carrito
function addToCart(id) {
    const product = products.find(p => p.id === id);
    const qty = parseFloat(currentQty) || 1;
    
    cart.push({ ...product, qty, total: product.price * qty });
    updateCartUI();
    clearQty();
}

function updateCartUI() {
    const container = document.getElementById('cart-items');
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">El carrito está vacío</p>';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div style="display:flex; justify-content:space-between; padding: 5px 10px; border-bottom: 1px solid #eee">
            <span>${item.name} (x${item.qty})</span>
            <span>$${item.total.toFixed(2)}</span>
        </div>
    `).join('');

    const total = cart.reduce((acc, item) => acc + item.total, 0);
    document.getElementById('total').innerText = `$${total.toFixed(2)}`;
}

// Filtro de búsqueda
function filterProducts() {
    const term = document.getElementById('search').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

// Inicialización
renderProducts();
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString();
}, 1000);
