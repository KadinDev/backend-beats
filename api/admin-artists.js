const { requireAdmin } = require('./_auth');
const { getArtists } = require('./_artists-store');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  if (!requireAdmin(request, response)) {
    return;
  }

  try {
    const artists = await getArtists({ includeInactive: true });
    response.status(200).json({ artists, count: artists.length });
  } catch (error) {
    response.status(500).json({
      error: 'Nao foi possivel listar os artistas.',
      details: error.message
    });
  }
};
