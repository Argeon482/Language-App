import express from 'express';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = process.env.RENDER ? Number(process.env.PORT || 3000) : 3000;

  // Simple Request Logger
  app.use((req, res, next) => {
    console.log(`[Express] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());

  // YouTube transcript endpoint (returns informative guidance)
  app.get('/api/youtube-transcript', (req, res) => {
    return res.status(400).json({
      error: "Automatic transcript fetching is disabled on this server to ensure reliability and avoid hosting restrictions. Please find the song's lyrics or transcript online, format them with timestamps (e.g. '0:15 Lyric text'), and paste them directly into the 'Paste YouTube Transcript' box below!"
    });
  });

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === "production";

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
