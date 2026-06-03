const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');
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
    const { id } = await readJson(request);

    if (!id) {
      response.status(400).json({ error: 'Informe o id do artista.' });
      return;
    }

    const artists = await removeArtist(id);
    response.status(200).json({ artists, count: artists.length });
  } catch (error) {
    response.status(500).json({
      error: 'Nao foi possivel deletar o artista.',
      details: error.message
    });
  }
};
