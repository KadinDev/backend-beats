const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg'
};

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

function sendJson(response, statusCode, body) {
  send(response, statusCode, JSON.stringify(body), {
    'content-type': contentTypes['.json']
  });
}

function getStaticFilePath(urlPath) {
  if (urlPath === '/') {
    return path.join(publicDir, 'index.html');
  }

  const normalizedPath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  return path.join(publicDir, normalizedPath);
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const filePath = getStaticFilePath(url.pathname);

  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(response, 404, 'Arquivo nao encontrado', {
      'content-type': 'text/plain; charset=utf-8'
    });
    return;
  }

  const extension = path.extname(filePath);
  const headers = {
    'content-type': contentTypes[extension] || 'application/octet-stream'
  };

  if (extension === '.mp3') {
    headers['cache-control'] = 'public, max-age=31536000, immutable';
    headers['accept-ranges'] = 'bytes';
  }

  response.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(response);
}

function handleTracks(response) {
  sendJson(response, 200, {
    tracks: [],
    blobEnabled: false,
    warning: 'Servidor local nao acessa o Vercel Blob. Use o deploy para listar, enviar e deletar musicas reais.'
  });
}

function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/tracks' && request.method === 'GET') {
    handleTracks(response);
    return true;
  }

  if (url.pathname === '/api/admin-check' && request.method === 'POST') {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === '/api/upload' && request.method === 'POST') {
    sendJson(response, 501, {
      error: 'Upload local nao esta ativo. Use o deploy da Vercel com BLOB_READ_WRITE_TOKEN.'
    });
    return true;
  }

  if (url.pathname === '/api/delete-track' && request.method === 'DELETE') {
    sendJson(response, 501, {
      error: 'Delete local nao esta ativo. Use o deploy da Vercel com BLOB_READ_WRITE_TOKEN.'
    });
    return true;
  }

  return false;
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/') && handleApi(request, response)) {
    return;
  }

  serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`Backend Beats local: http://localhost:${port}`);
  console.log(`Admin: http://localhost:${port}/admin.html`);
  console.log(`API do app: http://localhost:${port}/api/tracks`);
});
