const { requireAdmin } = require('./_auth');

module.exports = function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  if (!requireAdmin(request, response)) {
    return;
  }

  response.status(200).json({
    ok: true
  });
};
