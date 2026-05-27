const { del } = require('@vercel/blob');
const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');

module.exports = async function handler(request, response) {
  if (request.method !== 'DELETE') {
    response.setHeader('Allow', 'DELETE');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  if (!requireAdmin(request, response)) {
    return;
  }

  try {
    const { url, pathname, source } = await readJson(request);

    if (source === 'static') {
      response.status(409).json({
        error: 'Musicas fixas do deploy nao podem ser apagadas pelo painel. Remova o arquivo do Git e faca um novo deploy.'
      });
      return;
    }

    const target = url || pathname;

    if (!target || !String(target).includes('uploads/')) {
      response.status(400).json({ error: 'Musica enviada invalida.' });
      return;
    }

    await del(target);

    response.status(200).json({
      ok: true
    });
  } catch (error) {
    response.status(400).json({
      error: error.message
    });
  }
};
