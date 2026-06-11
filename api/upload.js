const { handleUpload } = require('@vercel/blob/client');
const { isAuthorized } = require('./_auth');
const { readJson } = require('./_body');
const { upsertTrack, UPLOADS_PREFIX } = require('./_tracks-store');
const { ARTISTS_IMAGES_PREFIX } = require('./_artists-store');
const { NEWS_IMAGES_PREFIX } = require('./_news-store');

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function parsePayload(clientPayload) {
  try {
    return clientPayload ? JSON.parse(clientPayload) : {};
  } catch {
    return {};
  }
}

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
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isAuthorized(request)) {
          throw new Error('Nao autorizado.');
        }

        const payload = parsePayload(clientPayload);
        const kind = String(payload.kind || 'track');

        if (kind === 'artist-image' || kind === 'news-image') {
          const expectedPrefix = kind === 'news-image'
            ? NEWS_IMAGES_PREFIX
            : ARTISTS_IMAGES_PREFIX;

          if (!pathname.startsWith(expectedPrefix)) {
            throw new Error('Caminho de imagem invalido.');
          }

          return {
            allowedContentTypes: [
              'image/jpeg',
              'image/png',
              'image/webp'
            ],
            maximumSizeInBytes: MAX_IMAGE_SIZE,
            addRandomSuffix: true,
            cacheControlMaxAge: 31536000,
            tokenPayload: JSON.stringify({ kind })
          };
        }

        const title = String(payload.title || '').trim();

        if (!title) {
          throw new Error('Informe o nome da musica.');
        }

        if (!pathname.startsWith(UPLOADS_PREFIX)) {
          throw new Error('Caminho de upload invalido.');
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
          cacheControlMaxAge: 31536000,
          tokenPayload: JSON.stringify({ title })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parsePayload(tokenPayload);

        if (payload.kind === 'artist-image' || payload.kind === 'news-image') {
          return;
        }

        await upsertTrack({
          id: blob.pathname,
          title: payload.title || blob.pathname,
          url: blob.url,
          downloadUrl: blob.downloadUrl,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: new Date().toISOString()
        });
      }
    });

    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({
      error: error.message
    });
  }
};
