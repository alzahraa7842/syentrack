import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createApiApp } from './src/server/app.ts';
import { isNeonConfigured } from './src/server/db.ts';

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Mount Vite in dev mode or serve static dist in production
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `AlumniTrack Server running on http://0.0.0.0:${PORT} (DB: ${
        isNeonConfigured() ? 'Neon PostgreSQL' : 'Local Persistent Store'
      })`
    );
  });
}

startServer();
