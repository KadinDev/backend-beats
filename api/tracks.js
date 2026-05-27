const { getTracks } = require('./_tracks-store');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
    const tracks = await getTracks();

    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    response.status(200).json({
      tracks,
      count: tracks.length,
      blobEnabled: true
    });
  } catch (error) {
    response.status(500).json({
      error: 'Nao foi possivel listar as musicas.',
      details: error.message
    });
  }
};
