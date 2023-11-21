const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Defina o diretório onde seus arquivos de áudio estão localizados
const audioDir = path.join(__dirname, 'audios');

// Lista de nomes de arquivos MP3
const audioFiles = [
  'audio1.mp3',
  'audio2.mp3',
  'audio3.mp3',
  'audio4.mp3',
  'audio5.mp3',
  'audio6.mp3',
  'audio7.mp3',
  'audio8.mp3',
  'audio9.mp3',
  'audio10.mp3',
  'audio11.mp3',
  'audio12.mp3',
  'audio13.mp3',
  'audio14.mp3',
  'audio15.mp3',
  'audio16.mp3',
  'audio17.mp3',
  'audio18.mp3',
  'audio19.mp3',
  'audio20.mp3',
  'audio21.mp3',
  'audio22.mp3',
  'audio23.mp3',
  'audio24.mp3',
  'audio25.mp3',
  'audio26.mp3',
  'audio27.mp3',
  'audio28.mp3',
  'audio29.mp3',
  'audio30.mp3',
  'audio31.mp3',
  'audio32.mp3',
  'audio33.mp3',
  'audio34.mp3',
  'audio35.mp3',
  'audio36.mp3',
  'audio37.mp3',
  'audio38.mp3',
  'audio39.mp3',
  'audio40.mp3',
  'audio41.mp3',
  'audio42.mp3',
  'audio43.mp3',
  'audio44.mp3',
  'audio45.mp3',
  'audio46.mp3',
  'audio47.mp3',
  'audio48.mp3',
  'audio49.mp3',
  'audio50.mp3',
  'audio51.mp3',
  'audio52.mp3',
  'audio53.mp3',
  'audio54.mp3',
  'audio55.mp3',
  'audio56.mp3',
  'audio57.mp3',
  'audio58.mp3',
  'audio59.mp3',
];

// Rota para servir arquivos de áudio
app.get('/audio/:id', (req, res) => {
  const audioId = req.params.id;
  const audioPath = path.join(audioDir, audioFiles[audioId - 1]);

  // Verifique se o arquivo existe
  if (fs.existsSync(audioPath)) {
    res.sendFile(audioPath);
  } else {
    res.status(404).send('Arquivo não encontrado');
  }
});

// Rota para a página HTML com links para os áudios
app.get('/', (req, res) => {
  let audioLinks = '';

  // Gere links para cada áudio
  for (let i = 0; i < audioFiles.length; i++) {
    audioLinks += `<audio controls><source src="/audio/${i + 1}" type="audio/mp3">Seu navegador não suporta o elemento de áudio.</audio><br>`;
  }

  // Página HTML com links para os áudios
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reprodução de Áudios</title>
      </head>
      <body>
        ${audioLinks}
      </body>
    </html>
  `;

  res.send(htmlContent);
});

// Inicie o servidor
/*
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
*/

// Inicie o servidor
app.listen(process.env.PORT || port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${process.env.PORT || port}`);
});