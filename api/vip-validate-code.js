const { readJson } = require('./_body');
const { validateVipCode } = require('./_vip-store');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
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
  } catch (error) {
    response.status(500).json({
      isVip: false,
      error: error.message || 'Nao foi possivel validar o codigo.'
    });
  }
};
