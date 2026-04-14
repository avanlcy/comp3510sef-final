-- ============================================================
-- BAZAAR — PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(64)  UNIQUE NOT NULL,
  name       VARCHAR(128) NOT NULL
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  emoji       VARCHAR(8)   NOT NULL DEFAULT '📦',
  badge       VARCHAR(64),
  image_key   VARCHAR(512),            -- MinIO object key
  image_url   TEXT,                    -- pre-signed or public URL (cached)
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  stock       INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(128),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User Credentials (passwords stored separately) ────────────
CREATE TABLE IF NOT EXISTS user_credentials (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  status             VARCHAR(32) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled')),
  shipping_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total              NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address   JSONB,
  tracking_number    VARCHAR(32),
  estimated_delivery DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Order Items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL
);

-- ── Order Events (tracking timeline) ─────────────────────────
CREATE TABLE IF NOT EXISTS order_events (
  id          SERIAL PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  location    VARCHAR(128),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user         ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order  ON order_events(order_id);

-- ── Seed: Categories ─────────────────────────────────────────
INSERT INTO categories (slug, name) VALUES
  ('electronics', 'Electronics'),
  ('fashion',     'Fashion'),
  ('home',        'Home'),
  ('books',       'Books'),
  ('sports',      'Sports'),
  ('beauty',      'Beauty')
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: Products ───────────────────────────────────────────
INSERT INTO products (name, description, price, emoji, badge, category_id) VALUES
  -- Electronics
  ('Wireless Headphones',   'Crystal-clear sound with 30hr battery life.',       89.99,  '🎧', 'Best Seller', (SELECT id FROM categories WHERE slug='electronics')),
  ('Smart Watch',           'Track fitness, messages, and more.',                199.99, '⌚', NULL,          (SELECT id FROM categories WHERE slug='electronics')),
  ('Portable Charger',      '20,000 mAh — charge three devices at once.',        34.99,  '🔋', 'Sale',        (SELECT id FROM categories WHERE slug='electronics')),
  ('Mechanical Keyboard',   'Tactile click switches, full RGB backlight.',       119.00, '⌨️', NULL,          (SELECT id FROM categories WHERE slug='electronics')),
  -- Fashion
  ('Classic White Sneakers','Clean minimal design, all-day comfort.',             74.99,  '👟', 'New',         (SELECT id FROM categories WHERE slug='fashion')),
  ('Canvas Tote Bag',       'Heavy-duty canvas, fits everything.',                28.00,  '👜', NULL,          (SELECT id FROM categories WHERE slug='fashion')),
  ('Sunglasses',            'UV400 protection, polarized lenses.',                45.00,  '🕶️', NULL,          (SELECT id FROM categories WHERE slug='fashion')),
  ('Slim Leather Wallet',   'Holds 8 cards, genuine leather, RFID block.',        39.99,  '👛', NULL,          (SELECT id FROM categories WHERE slug='fashion')),
  -- Home
  ('Scented Candle Set',    'Set of 3 — cedar, vanilla, eucalyptus.',             32.00,  '🕯️', 'Popular',     (SELECT id FROM categories WHERE slug='home')),
  ('Bamboo Desk Organizer', 'Keeps your workspace neat and stylish.',             22.50,  '🗂️', NULL,          (SELECT id FROM categories WHERE slug='home')),
  ('Throw Blanket',         'Ultra-soft sherpa fleece, 50×60 in.',               48.99,  '🛋️', 'Cozy Pick',   (SELECT id FROM categories WHERE slug='home')),
  ('Indoor Succulent Trio', 'Low-maintenance, comes in ceramic pots.',            19.99,  '🌵', NULL,          (SELECT id FROM categories WHERE slug='home')),
  -- Books
  ('The Design of Everyday','A timeless read on user-centred design.',            18.00,  '📗', NULL,          (SELECT id FROM categories WHERE slug='books')),
  ('Atomic Habits',         'Build habits that actually stick.',                  16.99,  '📙', 'Top Pick',    (SELECT id FROM categories WHERE slug='books')),
  ('Illustrated World Atlas','Stunning maps and geographic deep-dives.',          29.99,  '🗺️', NULL,          (SELECT id FROM categories WHERE slug='books')),
  ('Dot-Grid Notebook',     'A5 size, 200 pages, lay-flat binding.',              12.50,  '📓', NULL,          (SELECT id FROM categories WHERE slug='books')),
  -- Sports
  ('Resistance Band Set',   '5 resistance levels, full-body workout.',            24.99,  '🏋️', NULL,          (SELECT id FROM categories WHERE slug='sports')),
  ('Yoga Mat',              'Non-slip, 6mm thick, includes carry strap.',         38.00,  '🧘', 'New',         (SELECT id FROM categories WHERE slug='sports')),
  ('Stainless Water Bottle','32oz, keeps cold 24hr, hot 12hr.',                   27.99,  '🍶', NULL,          (SELECT id FROM categories WHERE slug='sports')),
  ('Jump Rope',             'Adjustable cable, ball-bearing handles.',            14.00,  '⚡', NULL,          (SELECT id FROM categories WHERE slug='sports')),
  -- Beauty
  ('Vitamin C Serum',       'Brightens, firms, and evens skin tone.',             36.99,  '✨', 'Best Seller', (SELECT id FROM categories WHERE slug='beauty')),
  ('Bamboo Toothbrush Set', 'Eco-friendly, pack of 4 with soft bristles.',        11.99,  '🪥', NULL,          (SELECT id FROM categories WHERE slug='beauty')),
  ('Hair Silk Pillowcase',  'Reduces frizz, gentle on skin while you sleep.',     29.00,  '💤', NULL,          (SELECT id FROM categories WHERE slug='beauty')),
  ('Lip Balm Collection',   'SPF 30, 6 sheer tints, all-day moisture.',           14.99,  '💄', NULL,          (SELECT id FROM categories WHERE slug='beauty'))
ON CONFLICT DO NOTHING;
