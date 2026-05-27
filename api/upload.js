const { handleUpload } = require('@vercel/blob/client');
const { isAuthorized } = require('./_auth');
const { readJson } = require('./_body');

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
    const body = await readJson(request);

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!isAuthorized(request)) {
          throw new Error('Nao autorizado.');
        }

        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/aac',
            'audio/ogg'
          ],
          maximumSizeInBytes: MAX_AUDIO_SIZE,
          addRandomSuffix: true,
          cacheControlMaxAge: 31536000
        };
      }
    });

    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({
      error: error.message
    });
  }
};
