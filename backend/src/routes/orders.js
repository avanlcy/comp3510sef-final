const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── Helpers ───────────────────────────────────────────────────

function generateTrackingNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BZR';
  for (let i = 0; i < 9; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function estimatedDelivery() {
  // 3–7 business days from now
  const days = Math.floor(Math.random() * 5) + 3;
  const d = new Date();
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Simulate order progression in the background.
 * In a real app this would be a queue / webhook from a carrier.
 * Statuses advance: confirmed → processing → shipped → out_for_delivery → delivered
 */
function simulateProgression(orderId, address) {
  const city    = address?.city    || 'Distribution Centre';
  const country = address?.country || '';

  const steps = [
    { delay: 5000,   status: 'confirmed',        description: 'Order confirmed and payment accepted.',             location: 'Bazaar Fulfilment Centre' },
    { delay: 15000,  status: 'processing',        description: 'Your order is being picked and packed.',           location: 'Bazaar Fulfilment Centre' },
    { delay: 35000,  status: 'shipped',           description: 'Package handed to carrier and in transit.',        location: 'Bazaar Fulfilment Centre' },
    { delay: 60000,  status: 'out_for_delivery',  description: `Package arrived at local depot near ${city}.`,     location: city + (country ? `, ${country}` : '') },
    { delay: 120000, status: 'delivered',         description: 'Package delivered. Enjoy your order!',             location: city + (country ? `, ${country}` : '') },
  ];

  steps.forEach(({ delay, status, description, location }) => {
    setTimeout(async () => {
      try {
        await db.query(
          `UPDATE orders SET status = $1 WHERE id = $2`,
          [status, orderId]
        );
        await db.query(
          `INSERT INTO order_events (order_id, status, description, location)
           VALUES ($1, $2, $3, $4)`,
          [orderId, status, description, location]
        );
      } catch (err) {
        console.error(`[tracking] Failed to advance order ${orderId} to ${status}:`, err.message);
      }
    }, delay);
  });
}

// ── Auth middleware (optional — attaches user if token present) ─
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bazaar-dev-secret-change-in-prod';

function optionalAuth(req, _res, next) {
  const header = req.headers['authorization'];
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch { /* ignore invalid tokens */ }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

// ── POST /api/orders ──────────────────────────────────────────
// Body: { items: [{ productId, quantity }], shippingAddress: { ... } }
router.post('/', optionalAuth, async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const productIds = items.map(i => i.productId);
    const { rows: products } = await client.query(
      `SELECT id, name, price, stock FROM products WHERE id = ANY($1::int[])`,
      [productIds]
    );

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    for (const item of items) {
      const p = productMap[item.productId];
      if (!p) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Product ${item.productId} not found` }); }
      if (p.stock < item.quantity) { await client.query('ROLLBACK'); return res.status(409).json({ error: `Insufficient stock for "${p.name}"` }); }
    }

    const subtotal  = items.reduce((s, i) => s + productMap[i.productId].price * i.quantity, 0);
    const shipping  = subtotal >= 50 ? 0 : 5.99;
    const total     = subtotal + shipping;
    const trackNum  = generateTrackingNumber();
    const estDelivery = estimatedDelivery();

    const { rows: [order] } = await client.query(
      `INSERT INTO orders (user_id, shipping_fee, total, shipping_address, tracking_number, estimated_delivery)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, shipping_fee, total, tracking_number, estimated_delivery, created_at`,
      [
        req.user?.id || null,
        shipping,
        total,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        trackNum,
        estDelivery,
      ]
    );

    for (const item of items) {
      const p = productMap[item.productId];
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [order.id, item.productId, item.quantity, p.price]
      );
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    // Seed the very first event immediately
    await client.query(
      `INSERT INTO order_events (order_id, status, description, location)
       VALUES ($1, 'pending', 'Order received and awaiting payment confirmation.', 'Bazaar')`,
      [order.id]
    );

    await client.query('COMMIT');

    // Kick off background simulation (non-blocking)
    simulateProgression(order.id, shippingAddress);

    res.status(201).json({
      data: {
        orderId:           order.id,
        status:            order.status,
        trackingNumber:    order.tracking_number,
        estimatedDelivery: order.estimated_delivery,
        shipping:          parseFloat(order.shipping_fee),
        total:             parseFloat(order.total),
        createdAt:         order.created_at,
        itemCount:         items.reduce((s, i) => s + i.quantity, 0),
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /orders]', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// ── GET /api/orders — current user's order history ────────────
router.get('/', optionalAuth, requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.id, o.status, o.total, o.tracking_number, o.estimated_delivery, o.created_at,
              COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[GET /orders]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── GET /api/orders/:id — order detail ───────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows: [order] } = await db.query(
      `SELECT id, status, shipping_fee, total, shipping_address,
              tracking_number, estimated_delivery, created_at
       FROM orders WHERE id = $1`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { rows: orderItems } = await db.query(
      `SELECT oi.quantity, oi.unit_price, p.name FROM order_items oi
       JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
      [req.params.id]
    );

    res.json({ data: { ...order, items: orderItems } });
  } catch (err) {
    console.error('[GET /orders/:id]', err.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ── GET /api/orders/:id/track — tracking timeline ────────────
router.get('/:id/track', optionalAuth, async (req, res) => {
  try {
    const { rows: [order] } = await db.query(
      `SELECT id, status, tracking_number, estimated_delivery,
              shipping_address, total, created_at
       FROM orders WHERE id = $1`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { rows: events } = await db.query(
      `SELECT status, description, location, occurred_at
       FROM order_events WHERE order_id = $1
       ORDER BY occurred_at ASC`,
      [req.params.id]
    );

    res.json({ data: { ...order, events } });
  } catch (err) {
    console.error('[GET /orders/:id/track]', err.message);
    res.status(500).json({ error: 'Failed to fetch tracking' });
  }
});

module.exports = router;
