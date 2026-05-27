# Backend Beats

Backend do app Mitos da Rima.

## Arquitetura

- `public/`: painel HTML/CSS/JS estatico.
- `api/`: funcoes serverless pequenas para login admin, upload, delete e listagem.
- Vercel Blob: armazenamento real dos audios.
- Sem banco de dados pago: os metadados ficam em `metadata/tracks.json` no proprio Blob.

## Variaveis de ambiente

```env
ADMIN_PASSWORD=sua-senha-admin
BLOB_READ_WRITE_TOKEN=token-do-vercel-blob
```

## Endpoints

### `GET /api/tracks`

Endpoint que o app deve consumir.

Resposta:

```json
{
  "tracks": [
    {
      "id": "uploads/arquivo.mp3",
      "title": "Nome da musica",
      "url": "https://...blob.vercel-storage.com/uploads/arquivo.mp3",
      "downloadUrl": "https://...blob.vercel-storage.com/uploads/arquivo.mp3?download=1",
      "pathname": "uploads/arquivo.mp3",
      "size": 123456,
      "uploadedAt": "2026-05-27T00:00:00.000Z",
      "source": "blob",
      "deletable": true
    }
  ],
  "count": 1,
  "blobEnabled": true
}
```

O app deve mostrar `title` para o usuario e tocar/cachear `url`.

## Admin

Painel:

```text
/admin.html
```

O admin informa a senha, o nome da musica e o arquivo de audio.
Uploads vao direto do navegador para o Vercel Blob usando client upload.
Delete remove o arquivo do Blob e atualiza o manifest.

## Economia

- Nenhum MP3 fica dentro do deploy.
- Nenhum audio passa por funcao Node.
- O Blob entrega os arquivos por URL publica e cacheavel.
- `GET /api/tracks` tem cache curto na borda.
- O app mobile deve manter cache local dos audios para reduzir bandwidth.
