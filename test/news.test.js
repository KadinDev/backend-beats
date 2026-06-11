const assert = require('node:assert/strict');
const test = require('node:test');

const blobModulePath = require.resolve('@vercel/blob');
const originalBlobModule = require(blobModulePath);
const storage = new Map();

require.cache[blobModulePath].exports = {
  ...originalBlobModule,
  async get(pathname) {
    if (!storage.has(pathname)) {
      return null;
    }

    return {
      statusCode: 200,
      stream: new Blob([storage.get(pathname)]).stream()
    };
  },
  async put(pathname, body) {
    storage.set(pathname, String(body));
    return {
      pathname,
      url: `https://blob.test/${pathname}`
    };
  },
  async del() {}
};

const {
  getNews,
  removeNews,
  upsertNews
} = require('../api/_news-store');
const newsHandler = require('../api/news');

function createResponse() {
  return {
    body: null,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test.beforeEach(() => {
  storage.clear();
  process.env.ADMIN_PASSWORD = 'test-password';
});

test('public news contains only the 30 newest active items', async () => {
  for (let index = 0; index < 35; index += 1) {
    await upsertNews({
      id: `news-${index}`,
      title: `Noticia ${index}`,
      content: `Conteudo ${index}`,
      imageUrl: `https://images.test/${index}.jpg`,
      publishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      active: index !== 34
    });
  }

  const news = await getNews();

  assert.equal(news.length, 30);
  assert.equal(news[0].id, 'news-33');
  assert.equal(news.some((item) => item.id === 'news-34'), false);
});

test('updating an item preserves createdAt and removing it updates the manifest', async () => {
  const firstResult = await upsertNews({
    id: 'news-fixed',
    title: 'Titulo inicial',
    content: 'Conteudo inicial',
    imageUrl: 'https://images.test/initial.jpg',
    publishedAt: '2026-06-01T12:00:00.000Z'
  });
  const createdAt = firstResult.savedItem.createdAt;

  const updatedResult = await upsertNews({
    id: 'news-fixed',
    title: 'Titulo atualizado',
    content: 'Conteudo atualizado',
    imageUrl: 'https://images.test/updated.jpg',
    publishedAt: '2026-06-02T12:00:00.000Z'
  });

  assert.equal(updatedResult.savedItem.createdAt, createdAt);
  assert.equal(updatedResult.previousItem.title, 'Titulo inicial');

  const removedResult = await removeNews('news-fixed');

  assert.equal(removedResult.removedItem.id, 'news-fixed');
  assert.equal(removedResult.news.length, 0);
});

test('public route is cached and admin route requires the configured password', async () => {
  await upsertNews({
    id: 'public-news',
    title: 'Noticia publica',
    content: 'Conteudo',
    imageUrl: 'https://images.test/public.jpg',
    publishedAt: '2026-06-10T12:00:00.000Z'
  });

  const publicResponse = createResponse();
  await newsHandler({
    method: 'GET',
    query: {},
    headers: {}
  }, publicResponse);

  assert.equal(publicResponse.statusCode, 200);
  assert.equal(publicResponse.body.count, 1);
  assert.match(publicResponse.headers['Cache-Control'], /s-maxage=60/);

  const unauthorizedResponse = createResponse();
  await newsHandler({
    method: 'GET',
    query: { action: 'admin' },
    headers: {}
  }, unauthorizedResponse);

  assert.equal(unauthorizedResponse.statusCode, 401);
});
