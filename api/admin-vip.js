const { requireAdmin } = require('./_auth');
const { createVipCode, getOrders, updateOrder } = require('./_vip-store');
const { readJson } = require('./_body');

module.exports = async function handler(request, response) {
  if (!requireAdmin(request, response)) {
    return;
  }

  if (request.method === 'GET') {
    const orders = await getOrders();

    response.status(200).json({
      orders: orders.map((order) => ({
        ...order,
        vipCode: order.status === 'approved' && order.active ? createVipCode(order.id) : ''
      }))
    });
    return;
  }

  if (request.method === 'PATCH') {
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
    return;
  }

  response.status(405).json({ error: 'Metodo nao permitido.' });
};
