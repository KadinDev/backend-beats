const { getPayment } = require('./_mercadopago');
const { updateOrder } = require('./_vip-store');
const { readJson } = require('./_body');

function getPaymentId(request, body) {
  return (
    body?.data?.id ||
    body?.id ||
    request.query?.['data.id'] ||
    request.query?.id
  );
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
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
  } catch (error) {
    response.status(200).json({
      ok: false,
      error: error.message || 'Falha ao processar webhook.'
    });
  }
};
