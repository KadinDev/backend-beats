const { get, put } = require('@vercel/blob');

const NEWS_MANIFEST_PATH = 'metadata/news.json';
const NEWS_IMAGES_PREFIX = 'news/';
const PUBLIC_NEWS_LIMIT = 30;

async function streamToText(stream) {
  const response = new Response(stream);
  return response.text();
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value, fallback) {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeNewsItem(item) {
  const now = new Date().toISOString();

  return {
    id: item.id || `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: normalizeText(item.title),
    content: normalizeText(item.content),
    imageUrl: normalizeText(item.imageUrl),
    imagePathname: normalizeText(item.imagePathname),
    publishedAt: normalizeDate(item.publishedAt, now),
    active: item.active !== false,
    createdAt: normalizeDate(item.createdAt, now),
    updatedAt: normalizeDate(item.updatedAt, now)
  };
}

function validateNewsItem(item) {
  const requiredFields = ['title', 'content', 'imageUrl', 'publishedAt'];
  const missingField = requiredFields.find((field) => !item[field]);

  if (missingField) {
    return `Campo obrigatorio: ${missingField}`;
  }

  return '';
}

async function readManifest() {
  try {
    const result = await get(NEWS_MANIFEST_PATH, {
      access: 'public'
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return { news: [] };
    }

    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text);

    return {
      news: Array.isArray(parsed.news) ? parsed.news.map(normalizeNewsItem) : []
    };
  } catch {
    return { news: [] };
  }
}

async function writeManifest(news) {
  const orderedNews = news
    .map(normalizeNewsItem)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  await put(NEWS_MANIFEST_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    news: orderedNews
  }), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });

  return orderedNews;
}

async function getNews({ includeInactive = false, limit = PUBLIC_NEWS_LIMIT } = {}) {
  const manifest = await readManifest();
  const visibleNews = includeInactive
    ? manifest.news
    : manifest.news.filter((item) => item.active);

  return Number.isFinite(limit) ? visibleNews.slice(0, limit) : visibleNews;
}

async function upsertNews(item) {
  const manifest = await readManifest();
  const currentItem = manifest.news.find((newsItem) => newsItem.id === item.id);
  const normalizedItem = normalizeNewsItem({
    ...item,
    createdAt: currentItem?.createdAt || item.createdAt,
    updatedAt: new Date().toISOString()
  });
  const validationError = validateNewsItem(normalizedItem);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const nextNews = [
    normalizedItem,
    ...manifest.news.filter((newsItem) => newsItem.id !== normalizedItem.id)
  ];

  return {
    news: await writeManifest(nextNews),
    previousItem: currentItem || null,
    savedItem: normalizedItem
  };
}

async function removeNews(id) {
  const manifest = await readManifest();
  const removedItem = manifest.news.find((item) => item.id === id) || null;
  const news = await writeManifest(manifest.news.filter((item) => item.id !== id));

  return {
    news,
    removedItem
  };
}

module.exports = {
  getNews,
  NEWS_IMAGES_PREFIX,
  PUBLIC_NEWS_LIMIT,
  removeNews,
  upsertNews
};
