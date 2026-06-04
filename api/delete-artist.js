const { del } = require('@vercel/blob');
const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');
const { ARTISTS_IMAGES_PREFIX } = require('./_artists-store');
const { removeArtist } = require('./_artists-store');

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
    const { id, imageUrl, imagePathname } = await readJson(request);

    if (!id) {
      response.status(400).json({ error: 'Informe o id do artista.' });
      return;
    }

    const artists = await removeArtist(id);

    const imageTarget = imageUrl || imagePathname;
    const imageReference = String(imagePathname || imageUrl || '');

    if (imageTarget && imageReference.includes(ARTISTS_IMAGES_PREFIX)) {
      await del(imageTarget);
    }

    response.status(200).json({ artists, count: artists.length });
  } catch (error) {
    response.status(500).json({
      error: 'Nao foi possivel deletar o artista.',
      details: error.message
    });
  }
};
