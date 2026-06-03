const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');
const { upsertArtist } = require('./_artists-store');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  if (!requireAdmin(request, response)) {
    return;
  }

  try {
    const artist = await readJson(request);
    const artists = await upsertArtist(artist);
    response.status(200).json({ artists, count: artists.length });
  } catch (error) {
    response.status(error.statusCode || 500).json({
      error: error.message || 'Nao foi possivel salvar o artista.'
    });
  }
};
