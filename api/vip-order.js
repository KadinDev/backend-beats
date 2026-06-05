const { getPayment } = require('./_mercadopago');
const { createVipCode, getOrder, updateOrder } = require('./_vip-store');

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

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

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
};
