import { upload } from 'https://esm.sh/@vercel/blob@2.4.0/client';

const passwordInput = document.querySelector('#password');
const savePasswordButton = document.querySelector('#savePassword');
const audioFileInput = document.querySelector('#audioFile');
const uploadButton = document.querySelector('#uploadButton');
const refreshButton = document.querySelector('#refreshButton');
const uploadProgress = document.querySelector('#uploadProgress');
const uploadStatus = document.querySelector('#uploadStatus');
const listStatus = document.querySelector('#listStatus');
const trackList = document.querySelector('#trackList');

passwordInput.value = localStorage.getItem('adminPassword') || '';

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
    deleteButton.disabled = !track.deletable;
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

savePasswordButton.addEventListener('click', () => {
  localStorage.setItem('adminPassword', getPassword());
  uploadStatus.textContent = 'Senha salva neste navegador.';
});

uploadButton.addEventListener('click', uploadTrack);
refreshButton.addEventListener('click', loadTracks);

loadTracks();
