const { readJson } = require('./_body');
const { createPixPayment } = require('./_mercadopago');
const { generateOrderId, upsertOrder, VIP_PRICE } = require('./_vip-store');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json({
      error: error.message || 'Nao foi possivel gerar o Pix.'
    });
  }
};
