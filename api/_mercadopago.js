function getAccessToken() {
  return process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
}

function requireAccessToken() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    const error = new Error('Configure MERCADO_PAGO_ACCESS_TOKEN na Vercel.');
    error.statusCode = 500;
    throw error;
  }

  return accessToken;
}

function getBaseUrl(request) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  return `${protocol}://${host}`;
}

async function mercadoPagoRequest(path, options = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${requireAccessToken()}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Falha na comunicacao com Mercado Pago.');
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function createPixPayment({ request, order }) {
  const baseUrl = getBaseUrl(request);
  const payment = await mercadoPagoRequest('/v1/payments', {
    method: 'POST',
    headers: {
      'x-idempotency-key': order.id
    },
    body: JSON.stringify({
      transaction_amount: order.amount,
      description: 'Mitos da Rima VIP vitalicio',
      payment_method_id: 'pix',
      external_reference: order.id,
      notification_url: `${baseUrl}/api/vip-webhook`,
      payer: {
        email: order.buyerEmail || `vip-${order.id.toLowerCase()}@mitosdarima.app`,
        first_name: order.buyerName || 'Mitos da Rima'
      }
    })
  });

  return payment;
}

async function getPayment(paymentId) {
  return mercadoPagoRequest(`/v1/payments/${paymentId}`, {
    method: 'GET'
  });
}

module.exports = {
  createPixPayment,
  getPayment
};
