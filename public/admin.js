import { upload } from 'https://esm.sh/@vercel/blob@2.4.0/client';

const passwordInput = document.querySelector('#password');
const loginButton = document.querySelector('#loginButton');
const logoutButton = document.querySelector('#logoutButton');
const loginStatus = document.querySelector('#loginStatus');
const uploadPanel = document.querySelector('#uploadPanel');
const listPanel = document.querySelector('#listPanel');
const audioFileInput = document.querySelector('#audioFile');
const uploadButton = document.querySelector('#uploadButton');
const refreshButton = document.querySelector('#refreshButton');
const uploadProgress = document.querySelector('#uploadProgress');
const uploadStatus = document.querySelector('#uploadStatus');
const listStatus = document.querySelector('#listStatus');
const trackList = document.querySelector('#trackList');

passwordInput.value = localStorage.getItem('adminPassword') || '';
let isAdmin = false;

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

function safeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
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
    deleteButton.disabled = false;
    deleteButton.title = track.deletable
      ? 'Remove a musica enviada do Vercel Blob'
      : 'Musicas fixas precisam ser removidas do Git e redeployadas';
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
    headers: {
      'content-type': 'application/json',
      'x-admin-password': getPassword()
    },
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
    uploadStatus.textContent = 'Musica enviada.';
    await loadTracks();
  } catch (error) {
    uploadStatus.textContent = error.message || 'Falha no envio.';
  } finally {
    uploadButton.disabled = false;
  }
}

function setAdminState(nextState) {
  isAdmin = nextState;
  uploadPanel.hidden = !nextState;
  listPanel.hidden = !nextState;
  logoutButton.hidden = !nextState;
  loginButton.hidden = nextState;
  passwordInput.disabled = nextState;

  if (!nextState) {
    trackList.innerHTML = '';
    listStatus.textContent = '';
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
    headers: {
      'x-admin-password': getPassword()
    }
  });

  if (!response.ok) {
    localStorage.removeItem('adminPassword');
    setAdminState(false);
    loginStatus.textContent = 'Senha invalida.';
    return;
  }

  localStorage.setItem('adminPassword', getPassword());
  setAdminState(true);
  loginStatus.textContent = 'Admin logado.';
  await loadTracks();
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

uploadButton.addEventListener('click', uploadTrack);
refreshButton.addEventListener('click', loadTracks);

if (getPassword()) {
  login();
} else {
  setAdminState(false);
}
