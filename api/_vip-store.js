const crypto = require('crypto');
const { get, put } = require('@vercel/blob');

const VIP_ORDERS_PATH = 'metadata/vip-orders.json';
const VIP_PRICE = Number(process.env.VIP_PRICE_BRL || 15.9);

async function streamToText(stream) {
  const response = new Response(stream);
  return response.text();
}

function generateOrderId() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

function getCodeSecret() {
  return process.env.VIP_CODE_SECRET || process.env.ADMIN_PASSWORD || 'mitos-da-rima-dev';
}

function createCodeSignature(orderId) {
  return crypto
    .createHmac('sha256', getCodeSecret())
    .update(orderId)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
}

function createVipCode(orderId) {
  return `MDR-${orderId}-${createCodeSignature(orderId)}`;
}

function parseVipCode(code = '') {
  const normalizedCode = String(code).trim().toUpperCase();
  const match = normalizedCode.match(/^MDR-([A-F0-9]{16})-([A-F0-9]{10})$/);

  if (!match) {
    return null;
  }

  return {
    code: normalizedCode,
    orderId: match[1],
    signature: match[2]
  };
}

function isValidCodeForOrder(code, orderId) {
  const parsedCode = parseVipCode(code);

  if (!parsedCode || parsedCode.orderId !== orderId) {
    return false;
  }

  return parsedCode.signature === createCodeSignature(orderId);
}

function normalizeOrder(order) {
  const now = new Date().toISOString();

  return {
    id: String(order.id || generateOrderId()).toUpperCase(),
    status: order.status || 'pending',
    amount: Number(order.amount || VIP_PRICE),
    buyerName: String(order.buyerName || '').trim(),
    buyerEmail: String(order.buyerEmail || '').trim().toLowerCase(),
    buyerPhone: String(order.buyerPhone || '').trim(),
    paymentId: order.paymentId ? String(order.paymentId) : '',
    pixQrCode: order.pixQrCode || '',
    pixQrCodeBase64: order.pixQrCodeBase64 || '',
    active: order.active !== false,
    createdAt: order.createdAt || now,
    updatedAt: order.updatedAt || now,
    approvedAt: order.approvedAt || ''
  };
}

async function readOrders() {
  try {
    const result = await get(VIP_ORDERS_PATH, {
      access: 'public'
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return [];
    }

    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text);

    return Array.isArray(parsed.orders) ? parsed.orders.map(normalizeOrder) : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders) {
  const orderedOrders = orders
    .map(normalizeOrder)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  await put(VIP_ORDERS_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    orders: orderedOrders
  }), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 30
  });

  return orderedOrders;
}

async function getOrders() {
  return readOrders();
}

async function getOrder(orderId) {
  const orders = await readOrders();
  return orders.find((order) => order.id === String(orderId || '').toUpperCase()) || null;
}

async function upsertOrder(order) {
  const orders = await readOrders();
  const normalizedOrder = normalizeOrder({
    ...order,
    updatedAt: new Date().toISOString()
  });
  const nextOrders = [
    normalizedOrder,
    ...orders.filter((item) => item.id !== normalizedOrder.id)
  ];

  await writeOrders(nextOrders);
  return normalizedOrder;
}

async function updateOrder(orderId, patch) {
  const order = await getOrder(orderId);

  if (!order) {
    return null;
  }

  return upsertOrder({
    ...order,
    ...patch
  });
}

async function validateVipCode(code) {
  const parsedCode = parseVipCode(code);

  if (!parsedCode) {
    return {
      valid: false,
      reason: 'Codigo VIP invalido.'
    };
  }

  const order = await getOrder(parsedCode.orderId);

  if (!order || !isValidCodeForOrder(parsedCode.code, parsedCode.orderId)) {
    return {
      valid: false,
      reason: 'Codigo VIP nao encontrado.'
    };
  }

  if (order.status !== 'approved' || !order.active) {
    return {
      valid: false,
      reason: 'Codigo VIP ainda nao esta ativo.'
    };
  }

  return {
    valid: true,
    order,
    code: parsedCode.code
  };
}

module.exports = {
  VIP_PRICE,
  createVipCode,
  generateOrderId,
  getOrder,
  getOrders,
  updateOrder,
  upsertOrder,
  validateVipCode
};
