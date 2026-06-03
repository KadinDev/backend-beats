const { get, put } = require('@vercel/blob');

const ARTISTS_MANIFEST_PATH = 'metadata/artists.json';

const CATEGORY_PRICES = {
  featured: 100,
  releases: 50,
  recent: 30
};

async function streamToText(stream) {
  const response = new Response(stream);
  return response.text();
}

function normalizeCategory(category) {
  if (category === 'featured' || category === 'releases' || category === 'recent') {
    return category;
  }

  return 'recent';
}

function normalizeUrl(url) {
  return typeof url === 'string' ? url.trim() : '';
}

function normalizeArtist(artist) {
  const now = new Date().toISOString();
  const category = normalizeCategory(artist.category);

  return {
    id: artist.id || `artist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    artistName: String(artist.artistName || '').trim(),
    projectName: String(artist.projectName || '').trim(),
    description: String(artist.description || '').trim(),
    imageUrl: normalizeUrl(artist.imageUrl),
    spotifyUrl: normalizeUrl(artist.spotifyUrl),
    youtubeUrl: normalizeUrl(artist.youtubeUrl),
    playsLabel: String(artist.playsLabel || '').trim(),
    fireLabel: String(artist.fireLabel || '').trim(),
    paidValue: Number(artist.paidValue || CATEGORY_PRICES[category]),
    active: artist.active !== false,
    createdAt: artist.createdAt || now,
    updatedAt: now
  };
}

function validateArtist(artist) {
  const requiredFields = ['artistName', 'projectName', 'description', 'imageUrl', 'spotifyUrl', 'youtubeUrl'];
  const missingField = requiredFields.find((field) => !artist[field]);

  if (missingField) {
    return `Campo obrigatorio: ${missingField}`;
  }

  return '';
}

async function readManifest() {
  try {
    const result = await get(ARTISTS_MANIFEST_PATH, {
      access: 'public'
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return { artists: [] };
    }

    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text);

    return {
      artists: Array.isArray(parsed.artists) ? parsed.artists.map(normalizeArtist) : []
    };
  } catch {
    return { artists: [] };
  }
}

async function writeManifest(artists) {
  const orderedArtists = artists
    .map(normalizeArtist)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  await put(ARTISTS_MANIFEST_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    artists: orderedArtists
  }), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });

  return orderedArtists;
}

async function getArtists({ includeInactive = false } = {}) {
  const manifest = await readManifest();

  if (includeInactive) {
    return manifest.artists;
  }

  return manifest.artists.filter((artist) => artist.active);
}

async function upsertArtist(artist) {
  const manifest = await readManifest();
  const normalizedArtist = normalizeArtist(artist);
  const validationError = validateArtist(normalizedArtist);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const nextArtists = [
    normalizedArtist,
    ...manifest.artists.filter((item) => item.id !== normalizedArtist.id)
  ];

  return writeManifest(nextArtists);
}

async function removeArtist(id) {
  const manifest = await readManifest();
  return writeManifest(manifest.artists.filter((artist) => artist.id !== id));
}

module.exports = {
  CATEGORY_PRICES,
  getArtists,
  removeArtist,
  upsertArtist
};
