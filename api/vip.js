const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');
const { createPixPayment, getPayment } = require('./_mercadopago');
const {
  createVipCode,
  generateOrderId,
  getOrder,
  getOrders,
  updateOrder,
  upsertOrder,
  validateVipCode,
  VIP_PRICE
} = require('./_vip-store');

async function refreshOrderStatus(order) {
  if (!order.paymentId || order.status === 'approved') {
    return order;
  }

  try {
    const payment = await getPayment(order.paymentId);

    if (payment.status === 'approved') {
      return updateOrder(order.id, {
        status: 'approved',
        approvedAt: payment.date_approved || new Date().toISOString()
      });
    }

    if (payment.status && payment.status !== order.status) {
      return updateOrder(order.id, {
        status: payment.status
      });
    }
  } catch {
    return order;
  }

  return order;
}

function getPaymentId(request, body) {
  return (
    body?.data?.id ||
    body?.id ||
    request.query?.['data.id'] ||
    request.query?.id
  );
}

async function createPayment(request, response) {
  const body = await readJson(request);
  const order = await upsertOrder({
    id: generateOrderId(),
    amount: VIP_PRICE,
    buyerName: body.buyerName,
    buyerEmail: body.buyerEmail,
    buyerPhone: body.buyerPhone,
    status: 'pending'
  });

  const payment = await createPixPayment({
    request,
    order
  });
  const transactionData = payment.point_of_interaction?.transaction_data || {};
  const nextOrder = await upsertOrder({
    ...order,
    paymentId: payment.id,
    pixQrCode: transactionData.qr_code || '',
    pixQrCodeBase64: transactionData.qr_code_base64 || '',
    status: payment.status || 'pending'
  });

  response.status(201).json({
    orderId: nextOrder.id,
    status: nextOrder.status,
    amount: nextOrder.amount,
    paymentId: nextOrder.paymentId,
    pixQrCode: nextOrder.pixQrCode,
    pixQrCodeBase64: nextOrder.pixQrCodeBase64
  });
}

async function getOrderStatus(request, response) {
  const orderId = request.query?.id;

  if (!orderId) {
    response.status(400).json({ error: 'Informe o pedido.' });
    return;
  }

  const order = await getOrder(orderId);

  if (!order) {
    response.status(404).json({ error: 'Pedido nao encontrado.' });
    return;
  }

  const refreshedOrder = await refreshOrderStatus(order);
  const isApproved = refreshedOrder.status === 'approved' && refreshedOrder.active;

  response.status(200).json({
    orderId: refreshedOrder.id,
    status: refreshedOrder.status,
    amount: refreshedOrder.amount,
    approved: isApproved,
    vipCode: isApproved ? createVipCode(refreshedOrder.id) : ''
  });
}

async function validateCode(request, response) {
  const body = await readJson(request);
  const result = await validateVipCode(body.code);

  if (!result.valid) {
    response.status(400).json({
      isVip: false,
      error: result.reason
    });
    return;
  }

  response.status(200).json({
    isVip: true,
    code: result.code,
    activatedAt: new Date().toISOString()
  });
}

async function handleWebhook(request, response) {
  const body = await readJson(request).catch(() => ({}));
  const paymentId = getPaymentId(request, body);

  if (!paymentId) {
    response.status(200).json({ ok: true });
    return;
  }

  const payment = await getPayment(paymentId);
  const orderId = payment.external_reference;

  if (orderId) {
    await updateOrder(orderId, {
      paymentId: payment.id,
      status: payment.status || 'pending',
      approvedAt: payment.status === 'approved' ? payment.date_approved || new Date().toISOString() : ''
    });
  }

  response.status(200).json({ ok: true });
}

async function listAdminOrders(request, response) {
  if (!requireAdmin(request, response)) {
    return;
  }

  const orders = await getOrders();

  response.status(200).json({
    orders: orders.map((order) => ({
      ...order,
      vipCode: order.status === 'approved' && order.active ? createVipCode(order.id) : ''
    }))
  });
}

async function updateAdminOrder(request, response) {
  if (!requireAdmin(request, response)) {
    return;
  }

  const body = await readJson(request);

  if (!body.id) {
    response.status(400).json({ error: 'Informe o pedido.' });
    return;
  }

  const patch = {};

  if (typeof body.active === 'boolean') {
    patch.active = body.active;
  }

  if (body.status) {
    patch.status = body.status;
  }

  const order = await updateOrder(body.id, patch);

  if (!order) {
    response.status(404).json({ error: 'Pedido nao encontrado.' });
    return;
  }

  response.status(200).json({
    order,
    vipCode: order.status === 'approved' && order.active ? createVipCode(order.id) : ''
  });
}

module.exports = async function handler(request, response) {
  const action = request.query?.action || '';

  try {
    if (request.method === 'POST' && action === 'create-payment') {
      await createPayment(request, response);
      return;
    }

    if (request.method === 'GET' && action === 'order') {
      await getOrderStatus(request, response);
      return;
    }

    if (request.method === 'POST' && action === 'validate-code') {
      await validateCode(request, response);
      return;
    }

    if (request.method === 'POST' && action === 'webhook') {
      await handleWebhook(request, response);
      return;
    }

    if (request.method === 'GET' && action === 'admin-orders') {
      await listAdminOrders(request, response);
      return;
    }

    if (request.method === 'PATCH' && action === 'admin-order') {
      await updateAdminOrder(request, response);
      return;
    }

    response.status(404).json({ error: 'Rota VIP nao encontrada.' });
  } catch (error) {
    const statusCode = action === 'webhook' ? 200 : error.statusCode || 500;

    response.status(statusCode).json({
      ok: false,
      error: error.message || 'Falha na rota VIP.'
    });
  }
};
