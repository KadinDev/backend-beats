const { getArtists } = require('./_artists-store');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
    const artists = await getArtists();

    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    response.status(200).json({
      artists,
      count: artists.length,
      blobEnabled: true
    });
  } catch (error) {
    response.status(500).json({
      error: 'Nao foi possivel listar os artistas.',
      details: error.message
    });
  }
};
