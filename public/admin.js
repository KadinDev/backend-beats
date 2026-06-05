import { upload } from 'https://esm.sh/@vercel/blob@2.4.0/client';

const passwordInput = document.querySelector('#password');
const loginButton = document.querySelector('#loginButton');
const logoutButton = document.querySelector('#logoutButton');
const loginStatus = document.querySelector('#loginStatus');
const adminTabs = document.querySelector('#adminTabs');
const beatsTab = document.querySelector('#beatsTab');
const artistsTab = document.querySelector('#artistsTab');
const vipTab = document.querySelector('#vipTab');
const uploadPanel = document.querySelector('#uploadPanel');
const listPanel = document.querySelector('#listPanel');
const trackTitleInput = document.querySelector('#trackTitle');
const audioFileInput = document.querySelector('#audioFile');
const uploadButton = document.querySelector('#uploadButton');
const refreshButton = document.querySelector('#refreshButton');
const uploadProgress = document.querySelector('#uploadProgress');
const uploadStatus = document.querySelector('#uploadStatus');
const listStatus = document.querySelector('#listStatus');
const trackList = document.querySelector('#trackList');
const artistFormPanel = document.querySelector('#artistFormPanel');
const artistListPanel = document.querySelector('#artistListPanel');
const artistFormTitle = document.querySelector('#artistFormTitle');
const artistIdInput = document.querySelector('#artistId');
const artistNameInput = document.querySelector('#artistName');
const projectNameInput = document.querySelector('#projectName');
const artistCategoryInput = document.querySelector('#artistCategory');
const paidValueInput = document.querySelector('#paidValue');
const artistDescriptionInput = document.querySelector('#artistDescription');
const artistImageFileInput = document.querySelector('#artistImageFile');
const imageUrlInput = document.querySelector('#imageUrl');
const imagePathnameInput = document.querySelector('#imagePathname');
const imageStatus = document.querySelector('#imageStatus');
const spotifyUrlInput = document.querySelector('#spotifyUrl');
const youtubeUrlInput = document.querySelector('#youtubeUrl');
const playsLabelInput = document.querySelector('#playsLabel');
const fireLabelInput = document.querySelector('#fireLabel');
const artistActiveInput = document.querySelector('#artistActive');
const saveArtistButton = document.querySelector('#saveArtistButton');
const clearArtistButton = document.querySelector('#clearArtistButton');
const refreshArtistsButton = document.querySelector('#refreshArtistsButton');
const artistStatus = document.querySelector('#artistStatus');
const artistListStatus = document.querySelector('#artistListStatus');
const artistList = document.querySelector('#artistList');
const vipListPanel = document.querySelector('#vipListPanel');
const refreshVipButton = document.querySelector('#refreshVipButton');
const vipListStatus = document.querySelector('#vipListStatus');
const vipList = document.querySelector('#vipList');

const categoryLabels = {
  featured: 'Destaques',
  releases: 'Lançamentos',
  recent: 'Recentes'
};

const categoryPrices = {
  featured: 100,
  releases: 50,
  recent: 30
};

passwordInput.value = localStorage.getItem('adminPassword') || '';
let isAdmin = false;
let artistsCache = [];

function getPassword() {
  return passwordInput.value.trim();
}

function formatBytes(bytes = 0) {
  if (!bytes) {
    return '';
  }

  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function safeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function safeImageName(artistName, fileName) {
  const extension = fileName.split('.').pop() || 'jpg';
  return `${safeFileName(artistName || 'artista')}-${Date.now()}.${safeFileName(extension)}`;
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    'x-admin-password': getPassword()
  };
}

function setActiveTab(tabName) {
  document.querySelectorAll('.tabButton').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  beatsTab.hidden = tabName !== 'beats';
  artistsTab.hidden = tabName !== 'artists';
  vipTab.hidden = tabName !== 'vip';
}

async function loadTracks() {
  if (!isAdmin) {
    return;
  }

  listStatus.textContent = 'Carregando musicas...';
  trackList.innerHTML = '';

  const response = await fetch('/api/tracks');
  const data = await response.json();

  listStatus.textContent = data.warning || `${data.tracks.length} musicas encontradas.`;

  for (const track of data.tracks) {
    const item = document.createElement('article');
    item.className = 'track';

    const title = document.createElement('div');
    title.className = 'trackInfo';
    title.innerHTML = `
      <strong>${track.title}</strong>
      <span>${track.source === 'static' ? 'Fixa no deploy' : `Enviada ${formatBytes(track.size)}`}</span>
    `;

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = track.url;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const openLink = document.createElement('a');
    openLink.href = track.url;
    openLink.target = '_blank';
    openLink.rel = 'noreferrer';
    openLink.textContent = 'Abrir';
    actions.append(openLink);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Deletar';
    deleteButton.title = 'Remove a musica do Vercel Blob';
    deleteButton.addEventListener('click', () => deleteTrack(track));
    actions.append(deleteButton);

    item.append(title, audio, actions);
    trackList.append(item);
  }
}

async function deleteTrack(track) {
  if (!isAdmin) {
    alert('Entre como admin.');
    return;
  }

  if (!getPassword()) {
    alert('Informe a senha admin.');
    return;
  }

  const confirmed = confirm(`Deletar "${track.title}"?`);

  if (!confirmed) {
    return;
  }

  const response = await fetch('/api/delete-track', {
    method: 'DELETE',
    headers: authHeaders({
      'content-type': 'application/json'
    }),
    body: JSON.stringify(track)
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.error || 'Nao foi possivel deletar.');
    return;
  }

  await loadTracks();
}

async function uploadTrack() {
  if (!isAdmin) {
    alert('Entre como admin.');
    return;
  }

  const file = audioFileInput.files?.[0];
  const title = trackTitleInput.value.trim();

  if (!title) {
    alert('Informe o nome da musica.');
    return;
  }

  if (!file) {
    alert('Escolha um arquivo de audio.');
    return;
  }

  if (!getPassword()) {
    alert('Informe a senha admin.');
    return;
  }

  uploadButton.disabled = true;
  uploadProgress.value = 0;
  uploadStatus.textContent = 'Enviando...';

  try {
    await upload(`uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ title }),
      contentType: file.type || 'audio/mpeg',
      multipart: true,
      headers: {
        'x-admin-password': getPassword()
      },
      onUploadProgress(event) {
        uploadProgress.value = event.percentage;
        uploadStatus.textContent = `Enviando... ${event.percentage}%`;
      }
    });

    audioFileInput.value = '';
    trackTitleInput.value = '';
    uploadStatus.textContent = 'Musica enviada.';
    await loadTracks();
  } catch (error) {
    uploadStatus.textContent = error.message || 'Falha no envio.';
  } finally {
    uploadButton.disabled = false;
  }
}

function resetArtistForm() {
  artistFormTitle.textContent = 'Cadastrar anunciante';
  artistIdInput.value = '';
  artistNameInput.value = '';
  projectNameInput.value = '';
  artistCategoryInput.value = 'recent';
  paidValueInput.value = categoryPrices.recent;
  artistDescriptionInput.value = '';
  artistImageFileInput.value = '';
  imageUrlInput.value = '';
  imagePathnameInput.value = '';
  imageStatus.textContent = 'Envie JPG, PNG ou WebP de ate 5 MB. Ao editar, escolha uma nova imagem somente se quiser trocar a capa.';
  spotifyUrlInput.value = '';
  youtubeUrlInput.value = '';
  playsLabelInput.value = '';
  fireLabelInput.value = '';
  artistActiveInput.checked = true;
  artistStatus.textContent = 'Valores sugeridos: Recentes R$ 30, Lançamentos R$ 50, Destaques R$ 100.';
}

function readArtistForm() {
  return {
    id: artistIdInput.value || undefined,
    artistName: artistNameInput.value.trim(),
    projectName: projectNameInput.value.trim(),
    category: artistCategoryInput.value,
    paidValue: Number(paidValueInput.value || categoryPrices[artistCategoryInput.value]),
    description: artistDescriptionInput.value.trim(),
    imageUrl: imageUrlInput.value.trim(),
    imagePathname: imagePathnameInput.value.trim(),
    spotifyUrl: spotifyUrlInput.value.trim(),
    youtubeUrl: youtubeUrlInput.value.trim(),
    playsLabel: playsLabelInput.value.trim(),
    fireLabel: fireLabelInput.value.trim(),
    active: artistActiveInput.checked
  };
}

function fillArtistForm(artist) {
  artistFormTitle.textContent = 'Editar anunciante';
  artistIdInput.value = artist.id;
  artistNameInput.value = artist.artistName || '';
  projectNameInput.value = artist.projectName || '';
  artistCategoryInput.value = artist.category || 'recent';
  paidValueInput.value = artist.paidValue || categoryPrices[artistCategoryInput.value];
  artistDescriptionInput.value = artist.description || '';
  artistImageFileInput.value = '';
  imageUrlInput.value = artist.imageUrl || '';
  imagePathnameInput.value = artist.imagePathname || '';
  imageStatus.textContent = artist.imageUrl ? 'Capa atual mantida. Escolha uma nova imagem somente se quiser trocar.' : 'Nenhuma capa enviada ainda.';
  spotifyUrlInput.value = artist.spotifyUrl || '';
  youtubeUrlInput.value = artist.youtubeUrl || '';
  playsLabelInput.value = artist.playsLabel || '';
  fireLabelInput.value = artist.fireLabel || '';
  artistActiveInput.checked = artist.active !== false;
  artistStatus.textContent = `Editando ${artist.artistName}.`;
  artistFormPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function uploadArtistImageIfNeeded(artist) {
  const file = artistImageFileInput.files?.[0];

  if (!file) {
    return artist;
  }

  imageStatus.textContent = 'Enviando capa...';

  const blob = await upload(`artists/${safeImageName(artist.artistName, file.name)}`, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ kind: 'artist-image' }),
    contentType: file.type || 'image/jpeg',
    multipart: true,
    headers: {
      'x-admin-password': getPassword()
    },
    onUploadProgress(event) {
      imageStatus.textContent = `Enviando capa... ${event.percentage}%`;
    }
  });

  imageStatus.textContent = 'Capa enviada.';

  return {
    ...artist,
    imageUrl: blob.url,
    imagePathname: blob.pathname
  };
}

async function loadArtists() {
  if (!isAdmin) {
    return;
  }

  artistListStatus.textContent = 'Carregando artistas...';
  artistList.innerHTML = '';

  const response = await fetch('/api/admin-artists', {
    headers: authHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    artistListStatus.textContent = data.error || 'Nao foi possivel carregar os artistas.';
    return;
  }

  artistsCache = data.artists || [];
  artistListStatus.textContent = `${artistsCache.length} artistas cadastrados.`;

  for (const artist of artistsCache) {
    const item = document.createElement('article');
    item.className = 'artist';

    const image = document.createElement('img');
    image.src = artist.imageUrl;
    image.alt = artist.artistName;
    image.loading = 'lazy';

    const info = document.createElement('div');
    info.className = 'trackInfo';
    info.innerHTML = `
      <strong>${artist.artistName} - ${artist.projectName}</strong>
      <span>${categoryLabels[artist.category] || artist.category} • ${formatCurrency(artist.paidValue)} • ${artist.active ? 'Ativo' : 'Inativo'}</span>
      <span>${artist.description || ''}</span>
    `;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const spotifyLink = document.createElement('a');
    spotifyLink.href = artist.spotifyUrl;
    spotifyLink.target = '_blank';
    spotifyLink.rel = 'noreferrer';
    spotifyLink.textContent = 'Spotify';
    actions.append(spotifyLink);

    const youtubeLink = document.createElement('a');
    youtubeLink.href = artist.youtubeUrl;
    youtubeLink.target = '_blank';
    youtubeLink.rel = 'noreferrer';
    youtubeLink.textContent = 'YouTube';
    actions.append(youtubeLink);

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => fillArtistForm(artist));
    actions.append(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Deletar';
    deleteButton.addEventListener('click', () => deleteArtist(artist));
    actions.append(deleteButton);

    item.append(image, info, actions);
    artistList.append(item);
  }
}

async function saveArtist() {
  if (!isAdmin) {
    alert('Entre como admin.');
    return;
  }

  if (!getPassword()) {
    alert('Informe a senha admin.');
    return;
  }

  let artist = readArtistForm();
  saveArtistButton.disabled = true;
  artistStatus.textContent = 'Salvando artista...';

  try {
    artist = await uploadArtistImageIfNeeded(artist);

    const response = await fetch('/api/upsert-artist', {
      method: 'POST',
      headers: authHeaders({
        'content-type': 'application/json'
      }),
      body: JSON.stringify(artist)
    });
    const data = await response.json();

    if (!response.ok) {
      artistStatus.textContent = data.error || 'Nao foi possivel salvar.';
      return;
    }

    artistStatus.textContent = 'Artista salvo.';
    resetArtistForm();
    await loadArtists();
  } catch (error) {
    artistStatus.textContent = error.message || 'Falha ao salvar artista.';
  } finally {
    saveArtistButton.disabled = false;
  }
}

async function deleteArtist(artist) {
  const confirmed = confirm(`Deletar "${artist.artistName}" do Palco Mitos?`);

  if (!confirmed) {
    return;
  }

  const response = await fetch('/api/delete-artist', {
    method: 'DELETE',
    headers: authHeaders({
      'content-type': 'application/json'
    }),
    body: JSON.stringify({
      id: artist.id,
      imageUrl: artist.imageUrl,
      imagePathname: artist.imagePathname
    })
  });
  const data = await response.json();

  if (!response.ok) {
    alert(data.error || 'Nao foi possivel deletar.');
    return;
  }

  await loadArtists();
}

async function loadVipOrders() {
  if (!isAdmin) {
    return;
  }

  vipListStatus.textContent = 'Carregando pedidos VIP...';
  vipList.innerHTML = '';

  const response = await fetch('/api/vip?action=admin-orders', {
    headers: authHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    vipListStatus.textContent = data.error || 'Nao foi possivel carregar os pedidos VIP.';
    return;
  }

  const orders = data.orders || [];
  vipListStatus.textContent = `${orders.length} pedidos encontrados.`;

  for (const order of orders) {
    const item = document.createElement('article');
    item.className = 'track';

    const info = document.createElement('div');
    info.className = 'trackInfo';
    info.innerHTML = `
      <strong>${order.buyerName || order.buyerEmail || order.id}</strong>
      <span>${formatCurrency(order.amount)} â€¢ ${order.status} â€¢ ${order.active ? 'Ativo' : 'Inativo'}</span>
      <span>Pedido: ${order.id}${order.paymentId ? ` â€¢ Pagamento: ${order.paymentId}` : ''}</span>
    `;

    const code = document.createElement('div');
    code.className = 'trackInfo';
    code.innerHTML = order.vipCode
      ? `<strong>Codigo VIP</strong><span>${order.vipCode}</span>`
      : '<span>Codigo liberado somente apos aprovacao.</span>';

    const actions = document.createElement('div');
    actions.className = 'actions';

    if (order.vipCode) {
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = 'Copiar';
      copyButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(order.vipCode);
        vipListStatus.textContent = 'Codigo copiado.';
      });
      actions.append(copyButton);
    }

    const activeButton = document.createElement('button');
    activeButton.type = 'button';
    activeButton.textContent = order.active ? 'Desativar' : 'Ativar';
    activeButton.addEventListener('click', () => updateVipOrder(order, {
      active: !order.active
    }));
    actions.append(activeButton);

    item.append(info, code, actions);
    vipList.append(item);
  }
}

async function updateVipOrder(order, patch) {
  const response = await fetch('/api/vip?action=admin-order', {
    method: 'PATCH',
    headers: authHeaders({
      'content-type': 'application/json'
    }),
    body: JSON.stringify({
      id: order.id,
      ...patch
    })
  });
  const data = await response.json();

  if (!response.ok) {
    alert(data.error || 'Nao foi possivel atualizar o pedido VIP.');
    return;
  }

  await loadVipOrders();
}

function setAdminState(nextState) {
  isAdmin = nextState;
  adminTabs.hidden = !nextState;
  uploadPanel.hidden = !nextState;
  listPanel.hidden = !nextState;
  artistFormPanel.hidden = !nextState;
  artistListPanel.hidden = !nextState;
  vipListPanel.hidden = !nextState;
  logoutButton.hidden = !nextState;
  loginButton.hidden = nextState;
  passwordInput.disabled = nextState;

  if (!nextState) {
    trackList.innerHTML = '';
    artistList.innerHTML = '';
    vipList.innerHTML = '';
    listStatus.textContent = '';
    artistListStatus.textContent = '';
    vipListStatus.textContent = '';
  }
}

async function login() {
  if (!getPassword()) {
    loginStatus.textContent = 'Informe a senha admin.';
    return;
  }

  loginStatus.textContent = 'Validando...';

  const response = await fetch('/api/admin-check', {
    method: 'POST',
    headers: authHeaders()
  });

  if (!response.ok) {
    localStorage.removeItem('adminPassword');
    setAdminState(false);
    loginStatus.textContent = 'Senha invalida.';
    return;
  }

  localStorage.setItem('adminPassword', getPassword());
  setAdminState(true);
  resetArtistForm();
  loginStatus.textContent = 'Admin logado.';
  await Promise.all([loadTracks(), loadArtists(), loadVipOrders()]);
}

function logout() {
  localStorage.removeItem('adminPassword');
  passwordInput.value = '';
  setAdminState(false);
  loginStatus.textContent = 'Sessao encerrada.';
}

loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    login();
  }
});

document.querySelectorAll('.tabButton').forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

artistCategoryInput.addEventListener('change', () => {
  paidValueInput.value = categoryPrices[artistCategoryInput.value];
});

uploadButton.addEventListener('click', uploadTrack);
refreshButton.addEventListener('click', loadTracks);
saveArtistButton.addEventListener('click', saveArtist);
clearArtistButton.addEventListener('click', resetArtistForm);
refreshArtistsButton.addEventListener('click', loadArtists);
refreshVipButton.addEventListener('click', loadVipOrders);

if (getPassword()) {
  login();
} else {
  setAdminState(false);
  setActiveTab('beats');
  resetArtistForm();
}
