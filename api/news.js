const { del } = require('@vercel/blob');
const { requireAdmin } = require('./_auth');
const { readJson } = require('./_body');
const {
  getNews,
  NEWS_IMAGES_PREFIX,
  PUBLIC_NEWS_LIMIT,
  removeNews,
  upsertNews
} = require('./_news-store');

function isManagedNewsImage(item) {
  const reference = String(item?.imagePathname || item?.imageUrl || '');
  return reference.includes(NEWS_IMAGES_PREFIX);
}

async function deleteManagedImage(item) {
  if (!isManagedNewsImage(item)) {
    return;
  }

  const target = item.imageUrl || item.imagePathname;

  if (target) {
    await del(target);
  }
}

module.exports = async function handler(request, response) {
  const action = String(request.query?.action || 'list');

  try {
    if (request.method === 'GET' && action === 'list') {
      const news = await getNews({ limit: PUBLIC_NEWS_LIMIT });

      response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      response.status(200).json({
        news,
        count: news.length
      });
      return;
    }

    if (request.method === 'GET' && action === 'admin') {
      if (!requireAdmin(request, response)) {
        return;
      }

      const news = await getNews({
        includeInactive: true,
        limit: Number.POSITIVE_INFINITY
      });

      response.status(200).json({
        news,
        count: news.length
      });
      return;
    }

    if (request.method === 'POST' && action === 'save') {
      if (!requireAdmin(request, response)) {
        return;
      }

      const item = await readJson(request);
      const result = await upsertNews(item);

      if (
        result.previousItem &&
        result.previousItem.imageUrl !== result.savedItem.imageUrl
      ) {
        await deleteManagedImage(result.previousItem);
      }

      response.status(200).json({
        news: result.news,
        count: result.news.length,
        item: result.savedItem
      });
      return;
    }

    if (request.method === 'DELETE' && action === 'delete') {
      if (!requireAdmin(request, response)) {
        return;
      }

      const { id } = await readJson(request);

      if (!id) {
        response.status(400).json({ error: 'Informe o id da noticia.' });
        return;
      }

      const result = await removeNews(id);
      await deleteManagedImage(result.removedItem);

      response.status(200).json({
        news: result.news,
        count: result.news.length
      });
      return;
    }

    response.setHeader('Allow', 'GET, POST, DELETE');
    response.status(405).json({ error: 'Metodo ou acao nao permitida.' });
  } catch (error) {
    response.status(error.statusCode || 500).json({
      error: error.message || 'Nao foi possivel processar as noticias.'
    });
  }
};
