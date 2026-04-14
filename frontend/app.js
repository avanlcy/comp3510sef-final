/* ============================================================
   BAZAAR — frontend app.js
   Features: product grid, cart, auth (JWT), payment mockup
   ============================================================ */
'use strict';

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : '/api';

// Unsplash product images keyed by product name (deterministic via seed)
// Using picsum.photos with a fixed seed per product for consistent images
const PRODUCT_IMAGES = {
  'Wireless Headphones':    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
  'Smart Watch':            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
  'Portable Charger':       'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80',
  'Mechanical Keyboard':    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
  'Classic White Sneakers': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
  'Canvas Tote Bag':        'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&q=80',
  'Sunglasses':             'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',
  'Slim Leather Wallet':    'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80',
  'Scented Candle Set':     'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&q=80',
  'Bamboo Desk Organizer':  'https://images.unsplash.com/photo-1593642532744-d377ab507dc8?w=600&q=80',
  'Throw Blanket':          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80',
  'Indoor Succulent Trio':  'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=600&q=80',
  'The Design of Everyday': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
  'Atomic Habits':          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80',
  'Illustrated World Atlas':'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80',
  'Dot-Grid Notebook':      'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80',
  'Resistance Band Set':    'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&q=80',
  'Yoga Mat':               'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&q=80',
  'Stainless Water Bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
  'Jump Rope':              'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=600&q=80',
  'Vitamin C Serum':        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
  'Bamboo Toothbrush Set':  'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&q=80',
  'Hair Silk Pillowcase':   'https://images.unsplash.com/photo-1631006807547-ebae01d0aa4e?w=600&q=80',
  'Lip Balm Collection':    'https://images.unsplash.com/photo-1586495777744-4e6232bf5763?w=600&q=80',
};

// ── State ─────────────────────────────────────────────────────
let cart         = [];
let allProducts  = [];
let activeFilter = 'all';
let currentUser  = null;   // { id, email, displayName, token }

// ── DOM refs ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const productGrid   = $('productGrid');
const productCount  = $('productCount');
const cartCount     = $('cartCount');
const cartItemsEl   = $('cartItems');
const cartEmpty     = $('cartEmpty');
const cartFooter    = $('cartFooter');
const cartSubtotal  = $('cartSubtotal');
const cartShipping  = $('cartShipping');
const cartTotal     = $('cartTotal');
const cartSidebar   = $('cartSidebar');
const cartOverlay   = $('cartOverlay');
const cartBtn       = $('cartBtn');
const cartClose     = $('cartClose');
const filtersEl     = $('filters');
const checkoutBtn   = $('checkoutBtn');
const toast         = $('toast');

// Auth
const authOverlay   = $('authOverlay');
const openAuthBtn   = $('openAuthBtn');
const authClose     = $('authClose');
const authControls  = $('authControls');
const userControls  = $('userControls');
const userAvatar    = $('userAvatar');
const userNameEl    = $('userName');
const logoutBtn     = $('logoutBtn');
const tabLogin      = $('tabLogin');
const tabRegister   = $('tabRegister');
const loginForm     = $('loginForm');
const registerForm  = $('registerForm');
const loginError    = $('loginError');
const registerError = $('registerError');
const loginSubmit   = $('loginSubmit');
const registerSubmit= $('registerSubmit');
const authModalTitle= $('authModalTitle');

// Payment
const paymentOverlay = $('paymentOverlay');
const cardForm       = $('cardForm');
const payBtn         = $('payBtn');
const payTotal       = $('payTotal');
const payShipping    = $('payShipping');
const payOrderLines  = $('paymentOrderLines');
const cardNumber     = $('cardNumber');
const cardExpiry     = $('cardExpiry');
const cardCvc        = $('cardCvc');
const cardName       = $('cardName');
const shippingForm   = $('shippingForm');

// Success
const successOverlay = $('successOverlay');
const successClose   = $('successClose');
const successBtn     = $('successBtn');
const successOrderId = $('successOrderId');

// ── API helpers ───────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (currentUser?.token) headers['Authorization'] = `Bearer ${currentUser.token}`;
  const res = await fetch(API + path, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || res.statusText), { status: res.status, data: json });
  return json;
}

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  // Restore session from localStorage
  const saved = localStorage.getItem('bazaar_user');
  if (saved) {
    try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('bazaar_user'); }
  }

  try {
    const [catData, prodData] = await Promise.all([
      apiFetch('/categories'),
      apiFetch('/products'),
    ]);
    allProducts = prodData.data;
    buildFilters(catData.data);
    renderProducts(allProducts);
  } catch (err) {
    productGrid.innerHTML = `<div class="api-error"><p>Could not reach the API.</p><small>${err.message}</small></div>`;
  }

  wireEvents();
}

// ── Build filters ─────────────────────────────────────────────
function buildFilters(categories) {
  const allBtn = filtersEl.querySelector('[data-cat="all"]');
  filtersEl.innerHTML = '';
  filtersEl.appendChild(allBtn);
  categories.forEach(({ slug, name }) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = slug;
    btn.textContent = name;
    filtersEl.appendChild(btn);
  });
}

filtersEl.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.cat;
  renderProducts(activeFilter === 'all' ? allProducts : allProducts.filter(p => p.category === activeFilter));
});

// ── Render products ───────────────────────────────────────────
function renderProducts(products) {
  productCount.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;
  productGrid.innerHTML = '';

  if (!products.length) {
    productGrid.innerHTML = '<div class="api-error"><p>No products found.</p></div>';
    return;
  }

  products.forEach((p, i) => {
    const imgSrc = p.image_url || PRODUCT_IMAGES[p.name] || `https://picsum.photos/seed/${p.id}/600/450`;

    const card = document.createElement('article');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 35}ms`;
    card.innerHTML = `
      <div class="card-image-wrap loading">
        <img class="card-img" src="${imgSrc}" alt="${p.name}" loading="lazy" />
        ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ''}
      </div>
      <div class="card-body">
        <span class="card-cat">${p.category_name || p.category}</span>
        <h3 class="card-name">${p.name}</h3>
        <p class="card-desc">${p.description || ''}</p>
      </div>
      <div class="card-footer">
        <span class="card-price">$${parseFloat(p.price).toFixed(2)}</span>
        <button class="add-btn" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          ${p.stock <= 0 ? 'Out of stock' : 'Add to bag'}
        </button>
      </div>
    `;

    // Remove loading skeleton once image loads
    const img = card.querySelector('.card-img');
    const wrap = card.querySelector('.card-image-wrap');
    img.addEventListener('load',  () => wrap.classList.remove('loading'));
    img.addEventListener('error', () => { wrap.classList.remove('loading'); img.style.objectFit = 'contain'; img.style.padding = '24px'; });

    productGrid.appendChild(card);
  });
}

// ── Add to cart ───────────────────────────────────────────────
productGrid.addEventListener('click', e => {
  const btn = e.target.closest('.add-btn');
  if (!btn || btn.disabled) return;
  const product = allProducts.find(p => p.id === parseInt(btn.dataset.id));
  if (product) addToCart(product);
});

function addToCart(product) {
  const existing = cart.find(c => c.product.id === product.id);
  existing ? existing.qty++ : cart.push({ product, qty: 1 });
  renderCart();
  updateCartCount();
  showToast(`${product.name} added to bag`);
}

// ── Render cart ───────────────────────────────────────────────
function renderCart() {
  cartItemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());

  if (!cart.length) {
    cartEmpty.style.display  = 'flex';
    cartFooter.style.display = 'none';
    return;
  }

  cartEmpty.style.display  = 'none';
  cartFooter.style.display = 'flex';

  cart.forEach(({ product, qty }) => {
    const imgSrc = product.image_url || PRODUCT_IMAGES[product.name] || `https://picsum.photos/seed/${product.id}/120/120`;
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `
      <div class="ci-thumb"><img src="${imgSrc}" alt="${product.name}" /></div>
      <div class="ci-info">
        <span class="ci-name">${product.name}</span>
        <span class="ci-price">$${(parseFloat(product.price) * qty).toFixed(2)}</span>
        <div class="ci-qty">
          <button class="qty-btn" data-id="${product.id}" data-action="dec">−</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" data-id="${product.id}" data-action="inc">+</button>
        </div>
      </div>
      <button class="ci-remove" data-id="${product.id}" aria-label="Remove">×</button>
    `;
    cartItemsEl.appendChild(item);
  });

  const subtotal = cartSubtotalVal();
  const shipping  = subtotal >= 50 ? 0 : 5.99;
  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartShipping.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  cartTotal.textContent    = `$${(subtotal + shipping).toFixed(2)}`;
}

function cartSubtotalVal() {
  return cart.reduce((s, c) => s + parseFloat(c.product.price) * c.qty, 0);
}

cartItemsEl.addEventListener('click', e => {
  const removeBtn = e.target.closest('.ci-remove');
  const qtyBtn    = e.target.closest('.qty-btn');
  if (removeBtn) {
    cart = cart.filter(c => c.product.id !== parseInt(removeBtn.dataset.id));
    renderCart(); updateCartCount(); return;
  }
  if (qtyBtn) {
    const entry = cart.find(c => c.product.id === parseInt(qtyBtn.dataset.id));
    if (!entry) return;
    qtyBtn.dataset.action === 'inc' ? entry.qty++ : entry.qty--;
    if (entry.qty <= 0) cart = cart.filter(c => c !== entry);
    renderCart(); updateCartCount();
  }
});

function updateCartCount() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  cartCount.textContent = total;
  cartCount.classList.remove('bump');
  void cartCount.offsetWidth;
  cartCount.classList.add('bump');
}

const openCart  = () => { cartSidebar.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
const closeCart = () => { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = ''; };

// ── Auth ──────────────────────────────────────────────────────
function setUser(user) {
  currentUser = user;
  localStorage.setItem('bazaar_user', JSON.stringify(user));
  const initials = (user.displayName || user.email || '?').charAt(0).toUpperCase();
  userAvatar.textContent  = initials;
  userNameEl.textContent  = user.displayName || user.email;
  authControls.style.display = 'none';
  userControls.style.display = 'flex';
}

function clearUser() {
  currentUser = null;
  localStorage.removeItem('bazaar_user');
  authControls.style.display = '';
  userControls.style.display = 'none';
}

function showAuthTab(tab) {
  if (tab === 'login') {
    loginForm.style.display    = '';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    authModalTitle.textContent = 'Welcome back';
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = '';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    authModalTitle.textContent = 'Create account';
  }
  loginError.classList.remove('show');
  registerError.classList.remove('show');
}

// Login submit
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.classList.remove('show');
  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Signing in…';
  try {
    const json = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('loginEmail').value.trim(), password: $('loginPassword').value }),
    });
    setUser(json.data);
    authOverlay.style.display = 'none';
    showToast(`Welcome back, ${json.data.displayName || json.data.email}!`);
    loginForm.reset();
  } catch (err) {
    loginError.textContent = err.message || 'Login failed';
    loginError.classList.add('show');
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = 'Sign in';
  }
});

// Register submit
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  registerError.classList.remove('show');
  registerSubmit.disabled = true;
  registerSubmit.textContent = 'Creating account…';
  try {
    const json = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        displayName: $('regName').value.trim(),
        email:       $('regEmail').value.trim(),
        password:    $('regPassword').value,
      }),
    });
    setUser(json.data);
    authOverlay.style.display = 'none';
    showToast(`Account created! Welcome, ${json.data.displayName}!`);
    registerForm.reset();
  } catch (err) {
    registerError.textContent = err.message || 'Registration failed';
    registerError.classList.add('show');
  } finally {
    registerSubmit.disabled = false;
    registerSubmit.textContent = 'Create account';
  }
});

// ── Country list ──────────────────────────────────────────────
const COUNTRIES = [
  ['AF','Afghanistan'],['AL','Albania'],['DZ','Algeria'],['AR','Argentina'],
  ['AU','Australia'],['AT','Austria'],['BE','Belgium'],['BR','Brazil'],
  ['CA','Canada'],['CL','Chile'],['CN','China'],['CO','Colombia'],
  ['HR','Croatia'],['CZ','Czech Republic'],['DK','Denmark'],['EG','Egypt'],
  ['FI','Finland'],['FR','France'],['DE','Germany'],['GH','Ghana'],
  ['GR','Greece'],['HK','Hong Kong'],['HU','Hungary'],['IN','India'],
  ['ID','Indonesia'],['IE','Ireland'],['IL','Israel'],['IT','Italy'],
  ['JP','Japan'],['JO','Jordan'],['KE','Kenya'],['KR','South Korea'],
  ['KW','Kuwait'],['LB','Lebanon'],['MY','Malaysia'],['MX','Mexico'],
  ['MA','Morocco'],['NL','Netherlands'],['NZ','New Zealand'],['NG','Nigeria'],
  ['NO','Norway'],['PK','Pakistan'],['PE','Peru'],['PH','Philippines'],
  ['PL','Poland'],['PT','Portugal'],['QA','Qatar'],['RO','Romania'],
  ['SA','Saudi Arabia'],['SG','Singapore'],['ZA','South Africa'],['ES','Spain'],
  ['SE','Sweden'],['CH','Switzerland'],['TW','Taiwan'],['TH','Thailand'],
  ['TR','Turkey'],['UA','Ukraine'],['AE','United Arab Emirates'],
  ['GB','United Kingdom'],['US','United States'],['VN','Vietnam'],
];

function populateCountries() {
  const sel = $('shipCountry');
  sel.innerHTML = '<option value="">Select country…</option>' +
    COUNTRIES.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
  // Default to US
  sel.value = 'US';
}

// ── Payment modal — two-step ───────────────────────────────────
function showCheckoutStep(step) {
  $('checkoutStep1').style.display = step === 1 ? '' : 'none';
  $('checkoutStep2').style.display = step === 2 ? '' : 'none';
  $('step1Indicator').classList.toggle('active', step === 1);
  $('step2Indicator').classList.toggle('active', step === 2);
}

function openPayment() {
  closeCart();
  populateCountries();
  shippingForm.reset();
  $('shipCountry').value = 'US';
  cardForm.reset();
  clearCardErrors();
  showCheckoutStep(1);
  paymentOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePayment() {
  paymentOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

function goToPaymentStep() {
  const subtotal = cartSubtotalVal();
  const shipping  = subtotal >= 50 ? 0 : 5.99;
  const total     = subtotal + shipping;
  const countryName = $('shipCountry').options[$('shipCountry').selectedIndex]?.text || '';

  payOrderLines.innerHTML = cart.map(c =>
    `<div class="order-line"><span>${c.product.name} × ${c.qty}</span><span>$${(parseFloat(c.product.price) * c.qty).toFixed(2)}</span></div>`
  ).join('');
  payShipping.textContent      = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  payTotal.textContent         = `$${total.toFixed(2)}`;
  $('payShipCountry').textContent = countryName;

  showCheckoutStep(2);
}

shippingForm.addEventListener('submit', e => {
  e.preventDefault();
  const err = $('shippingError');
  err.classList.remove('show');
  if (!$('shipCountry').value) {
    err.textContent = 'Please select a country.';
    err.classList.add('show');
    return;
  }
  goToPaymentStep();
});

// Card number formatting + brand detection
cardNumber.addEventListener('input', () => {
  let v = cardNumber.value.replace(/\D/g, '').slice(0, 16);
  cardNumber.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
  // Brand
  $('cardBrandVisa').style.display = /^4/.test(v) ? '' : 'none';
  $('cardBrandMC').style.display   = /^5[1-5]/.test(v) ? '' : 'none';
});

// Expiry formatting
cardExpiry.addEventListener('input', () => {
  let v = cardExpiry.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2);
  cardExpiry.value = v;
});

// CVC: digits only
cardCvc.addEventListener('input', () => {
  cardCvc.value = cardCvc.value.replace(/\D/g, '').slice(0, 4);
});

function clearCardErrors() {
  ['cardNumberError','cardExpiryError','cardCvcError','cardFormError'].forEach(id => {
    $(id).classList.remove('show');
    $(id).textContent = '';
  });
  [cardNumber, cardExpiry, cardCvc, cardName].forEach(el => el.classList.remove('error'));
}

function showFieldError(fieldEl, errEl, msg) {
  fieldEl.classList.add('error');
  errEl.textContent = msg;
  errEl.classList.add('show');
}

function validateCard() {
  clearCardErrors();
  let valid = true;

  const num = cardNumber.value.replace(/\s/g, '');
  if (!/^\d{16}$/.test(num)) {
    showFieldError(cardNumber, $('cardNumberError'), 'Enter a valid 16-digit card number.');
    valid = false;
  } else {
    // Luhn check
    let sum = 0;
    for (let i = 0; i < 16; i++) {
      let d = parseInt(num[15 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    if (sum % 10 !== 0) {
      showFieldError(cardNumber, $('cardNumberError'), 'Invalid card number.');
      valid = false;
    }
  }

  // Expiry
  // Strip all spaces then split on '/'
  const expClean = cardExpiry.value.replace(/\s/g, '');
  const [mm, yy] = expClean.split('/').map(s => parseInt(s, 10));
  const now = new Date();
  // Card is valid through the last day of the expiry month
  const expDate = new Date(2000 + yy, mm, 1); // first day of the month AFTER expiry
  if (!/^\d{2}\/\d{2}$/.test(expClean) || mm < 1 || mm > 12 || expDate <= now) {
    showFieldError(cardExpiry, $('cardExpiryError'), 'Invalid or expired date.');
    valid = false;
  }

  if (!/^\d{3,4}$/.test(cardCvc.value)) {
    showFieldError(cardCvc, $('cardCvcError'), 'Enter 3 or 4 digits.');
    valid = false;
  }

  return valid;
}

cardForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateCard()) return;

  // Simulate declined card
  const num = cardNumber.value.replace(/\s/g, '');
  if (num === '4000000000000002') {
    $('cardFormError').textContent = 'Your card was declined. Please try a different card.';
    $('cardFormError').classList.add('show');
    return;
  }

  payBtn.disabled = true;
  payBtn.innerHTML = `<div class="spinner"></div> Processing…`;

  // Simulate 1.5s processing delay
  await new Promise(r => setTimeout(r, 1500));

  try {
    // Collect shipping address from step 1
    const shippingAddress = {
      firstName: $('shipFirstName').value.trim(),
      lastName:  $('shipLastName').value.trim(),
      address:   $('shipAddress').value.trim(),
      address2:  $('shipAddress2').value.trim(),
      city:      $('shipCity').value.trim(),
      state:     $('shipState').value.trim(),
      zip:       $('shipZip').value.trim(),
      country:   $('shipCountry').value,
      phone:     $('shipPhone').value.trim(),
    };

    const res = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: cart.map(c => ({ productId: c.product.id, quantity: c.qty })),
        shippingAddress,
      }),
    });

    closePayment();
    successOrderId.textContent = `Order #${res.data.orderId.slice(0, 8).toUpperCase()} · ${res.data.trackingNumber}`;
    successOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } catch (err) {
    $('cardFormError').textContent = err.message || 'Payment failed. Please try again.';
    $('cardFormError').classList.add('show');
  } finally {
    payBtn.disabled = false;
    payBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay now`;
  }
});

function closeSuccess() {
  successOverlay.style.display = 'none';
  document.body.style.overflow = '';
  cart = [];
  renderCart();
  updateCartCount();
  // Refresh stock
  apiFetch('/products').then(d => {
    allProducts = d.data;
    renderProducts(activeFilter === 'all' ? allProducts : allProducts.filter(p => p.category === activeFilter));
  }).catch(() => {});
}

// ── My Orders ─────────────────────────────────────────────────
const ordersOverlay  = $('ordersOverlay');
const trackingOverlay= $('trackingOverlay');
let currentTrackingId = null;
let trackingPollTimer = null;

const STATUS_LABELS = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  processing:       'Processing',
  shipped:          'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

function openOrders() {
  ordersOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  loadOrders();
}

function closeOrders() {
  ordersOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

async function loadOrders() {
  const loading = $('ordersLoading');
  const list    = $('ordersList');
  const empty   = $('ordersEmpty');
  loading.style.display = 'flex';
  list.style.display    = 'none';
  empty.style.display   = 'none';

  try {
    const { data } = await apiFetch('/orders');
    loading.style.display = 'none';

    if (!data.length) {
      empty.style.display = 'flex';
      return;
    }

    list.style.display = 'block';
    list.innerHTML = data.map(o => `
      <div class="order-row">
        <div class="order-row-left">
          <span class="order-row-id">#${o.id.slice(0,8).toUpperCase()}</span>
          <span class="order-row-meta">
            ${new Date(o.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
            &nbsp;·&nbsp; ${o.item_count} item${o.item_count != 1 ? 's' : ''}
          </span>
          <span class="status-pill ${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
        </div>
        <div class="order-row-right">
          <span class="order-row-total">$${parseFloat(o.total).toFixed(2)}</span>
          <button class="track-btn" data-id="${o.id}">
            Track
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.track-btn').forEach(btn => {
      btn.addEventListener('click', () => openTracking(btn.dataset.id));
    });
  } catch (err) {
    loading.style.display = 'none';
    list.style.display = 'block';
    list.innerHTML = `<div style="padding:24px;color:var(--accent);font-size:14px">${err.message}</div>`;
  }
}

function openTracking(orderId) {
  currentTrackingId = orderId;
  // hide orders, show tracking
  ordersOverlay.style.display  = 'none';
  trackingOverlay.style.display = 'flex';
  loadTracking(orderId);

  // Auto-refresh every 8s while modal is open
  clearInterval(trackingPollTimer);
  trackingPollTimer = setInterval(() => {
    if (trackingOverlay.style.display !== 'none') loadTracking(currentTrackingId);
    else clearInterval(trackingPollTimer);
  }, 8000);
}

function closeTracking() {
  clearInterval(trackingPollTimer);
  trackingOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

async function loadTracking(orderId) {
  const loading = $('trackingLoading');
  const content = $('trackingContent');
  if (content.style.display === 'none') {
    loading.style.display = 'flex';
  }

  try {
    const { data } = await apiFetch(`/orders/${orderId}/track`);
    loading.style.display = 'none';
    content.style.display = '';

    // Tracking number & ETA
    $('trackingNumber').textContent = data.tracking_number || '—';
    $('trackingEta').textContent = data.estimated_delivery
      ? new Date(data.estimated_delivery + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
      : '—';

    // Status pill
    const pill = $('trackingStatusPill');
    pill.textContent = STATUS_LABELS[data.status] || data.status;
    pill.className = `tracking-status-pill status-pill ${data.status}`;

    // Shipping address
    const addr = data.shipping_address;
    $('trackingAddress').innerHTML = addr
      ? `<strong>Shipping to:</strong><br>
         ${addr.firstName || ''} ${addr.lastName || ''}<br>
         ${addr.address}${addr.address2 ? ', ' + addr.address2 : ''}<br>
         ${addr.city}, ${addr.state} ${addr.zip}<br>
         ${COUNTRIES.find(c=>c[0]===addr.country)?.[1] || addr.country || ''}`
      : '<em style="color:var(--ink-faint)">No address on file</em>';

    // Timeline
    const allStatuses = ['pending','confirmed','processing','shipped','out_for_delivery','delivered'];
    const doneSet = new Set(data.events.map(e => e.status));
    const eventMap = Object.fromEntries(data.events.map(e => [e.status, e]));

    $('trackingTimeline').innerHTML = allStatuses.map(s => {
      const done  = doneSet.has(s);
      const ev    = eventMap[s];
      const time  = ev ? new Date(ev.occurred_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
      const loc   = ev?.location ? ` · ${ev.location}` : '';
      return `
        <div class="timeline-event ${done ? 'done' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-info">
            <span class="timeline-desc">${ev?.description || STATUS_LABELS[s]}</span>
            ${done ? `<span class="timeline-meta">${time}${loc}</span>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    loading.style.display = 'none';
    content.style.display = '';
    $('trackingTimeline').innerHTML = `<p style="color:var(--accent);font-size:14px">${err.message}</p>`;
  }
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ── Wire all events ───────────────────────────────────────────
function wireEvents() {
  // Cart
  cartBtn.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  checkoutBtn.addEventListener('click', () => {
    if (!cart.length) return;
    if (!currentUser) {
      closeCart();
      authOverlay.style.display = 'flex';
      showToast('Please sign in to checkout.');
      return;
    }
    openPayment();
  });

  // Auth modal
  openAuthBtn.addEventListener('click', () => { showAuthTab('login'); authOverlay.style.display = 'flex'; });
  authClose.addEventListener('click', () => { authOverlay.style.display = 'none'; });
  // Track where mousedown started — only close if the drag began AND ended on the overlay itself
  let mousedownTarget = null;
  document.addEventListener('mousedown', e => { mousedownTarget = e.target; });
  authOverlay.addEventListener('click', e => { if (e.target === authOverlay && mousedownTarget === authOverlay) authOverlay.style.display = 'none'; });
  tabLogin.addEventListener('click', () => showAuthTab('login'));
  tabRegister.addEventListener('click', () => showAuthTab('register'));
  $('switchToRegister').addEventListener('click', e => { e.preventDefault(); showAuthTab('register'); });
  $('switchToLogin').addEventListener('click',    e => { e.preventDefault(); showAuthTab('login'); });
  logoutBtn.addEventListener('click', () => { clearUser(); showToast('Signed out.'); });

  // Payment — two close buttons (one per step) + back button
  $('paymentClose').addEventListener('click', closePayment);
  $('paymentClose2').addEventListener('click', closePayment);
  $('backToShippingBtn').addEventListener('click', () => showCheckoutStep(1));
  paymentOverlay.addEventListener('click', e => { if (e.target === paymentOverlay && mousedownTarget === paymentOverlay) closePayment(); });

  // Success
  successClose.addEventListener('click', closeSuccess);
  successBtn.addEventListener('click', closeSuccess);
  successOverlay.addEventListener('click', e => { if (e.target === successOverlay && mousedownTarget === successOverlay) closeSuccess(); });

  // My Orders
  $('myOrdersBtn').addEventListener('click', openOrders);
  $('ordersClose').addEventListener('click', closeOrders);
  ordersOverlay.addEventListener('click', e => { if (e.target === ordersOverlay && mousedownTarget === ordersOverlay) closeOrders(); });

  // Tracking
  $('trackingClose').addEventListener('click', closeTracking);
  $('backToOrdersBtn').addEventListener('click', () => {
    clearInterval(trackingPollTimer);
    trackingOverlay.style.display = 'none';
    ordersOverlay.style.display   = 'flex';
  });
  $('refreshTrackingBtn').addEventListener('click', () => loadTracking(currentTrackingId));
  trackingOverlay.addEventListener('click', e => { if (e.target === trackingOverlay && mousedownTarget === trackingOverlay) closeTracking(); });

  // Hero CTA
  $('heroShopBtn').addEventListener('click', () => {
    $('shopSection').scrollIntoView({ behavior: 'smooth' });
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeCart();
    authOverlay.style.display    = 'none';
    paymentOverlay.style.display = 'none';
    if (successOverlay.style.display  !== 'none') closeSuccess();
    if (ordersOverlay.style.display   !== 'none') closeOrders();
    if (trackingOverlay.style.display !== 'none') closeTracking();
  });
}

// ── Go ────────────────────────────────────────────────────────
init();
