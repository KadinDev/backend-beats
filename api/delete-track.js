const { del } = require('@vercel/blob');
const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');
const { removeTrack, UPLOADS_PREFIX } = require('./_tracks-store');

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
    const { url, pathname } = await readJson(request);
    const target = url || pathname;

    if (!target || !String(pathname || target).includes(UPLOADS_PREFIX)) {
      response.status(400).json({ error: 'Musica invalida.' });
      return;
    }

    await del(target);

    if (pathname) {
      await removeTrack(pathname);
    }

    response.status(200).json({
      ok: true
    });
  } catch (error) {
    response.status(400).json({
      error: error.message
    });
  }
};
