async function readJson(request) {
  if (request.body) {
    return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

module.exports = {
  readJson
};
