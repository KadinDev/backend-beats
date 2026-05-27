const { list } = require('@vercel/blob');

const STATIC_TRACKS = Array.from({ length: 59 }, (_, index) => {
  const id = index + 1;

  return {
    id: String(id),
    title: `Beat ${id}`,
    url: `/audio/${id}`,
    source: 'static',
    deletable: false
  };
});

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
    const { blobs } = await list({
      prefix: 'uploads/',
      limit: 1000
    });

    const uploadedTracks = blobs.map((blob) => ({
      id: blob.pathname,
      title: blob.pathname.replace(/^uploads\//, ''),
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      source: 'blob',
      deletable: true
    }));

    response.status(200).json({
      tracks: [...STATIC_TRACKS, ...uploadedTracks],
      blobEnabled: true
    });
  } catch (error) {
    response.status(200).json({
      tracks: STATIC_TRACKS,
      blobEnabled: false,
      warning: 'Vercel Blob ainda nao esta configurado neste ambiente.'
    });
  }
};
