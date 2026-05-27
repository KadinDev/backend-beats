const { get, list, put } = require('@vercel/blob');

const TRACKS_MANIFEST_PATH = 'metadata/tracks.json';
const UPLOADS_PREFIX = 'uploads/';

async function streamToText(stream) {
  const response = new Response(stream);
  return response.text();
}

function normalizeTrack(track) {
  return {
    id: track.id || track.pathname,
    title: track.title,
    url: track.url,
    downloadUrl: track.downloadUrl || track.url,
    pathname: track.pathname,
    size: track.size || 0,
    uploadedAt: track.uploadedAt || new Date().toISOString(),
    source: 'blob',
    deletable: true
  };
}

function titleFromPathname(pathname) {
  return pathname
    .replace(/^uploads\//, '')
    .replace(/^\d+-/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/-/g, ' ')
    .trim() || 'Musica sem nome';
}

async function readManifest() {
  try {
    const result = await get(TRACKS_MANIFEST_PATH, {
      access: 'public'
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return { tracks: [] };
    }

    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text);

    return {
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks.map(normalizeTrack) : []
    };
  } catch {
    return { tracks: [] };
  }
}

async function writeManifest(tracks) {
  const orderedTracks = tracks
    .map(normalizeTrack)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  await put(TRACKS_MANIFEST_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    tracks: orderedTracks
  }), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });

  return orderedTracks;
}

async function listBlobTracks() {
  const { blobs } = await list({
    prefix: UPLOADS_PREFIX,
    limit: 1000
  });

  return blobs.map((blob) => normalizeTrack({
    id: blob.pathname,
    title: titleFromPathname(blob.pathname),
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    pathname: blob.pathname,
    size: blob.size,
    uploadedAt: blob.uploadedAt
  }));
}

async function getTracks() {
  const manifest = await readManifest();

  if (manifest.tracks.length > 0) {
    return manifest.tracks;
  }

  const blobTracks = await listBlobTracks();

  if (blobTracks.length > 0) {
    await writeManifest(blobTracks);
  }

  return blobTracks;
}

async function upsertTrack(track) {
  const manifest = await readManifest();
  const normalizedTrack = normalizeTrack(track);
  const nextTracks = [
    normalizedTrack,
    ...manifest.tracks.filter((item) => item.pathname !== normalizedTrack.pathname)
  ];

  return writeManifest(nextTracks);
}

async function removeTrack(pathname) {
  const manifest = await readManifest();
  return writeManifest(manifest.tracks.filter((track) => track.pathname !== pathname));
}

module.exports = {
  getTracks,
  removeTrack,
  titleFromPathname,
  upsertTrack,
  UPLOADS_PREFIX
};
