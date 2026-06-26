import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { YoutubeTranscript } from 'youtube-transcript';

// Function to extract 11-character video ID from a YouTube URL or standard ID string
function extractVideoId(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 11) return trimmed;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return trimmed; // fallback
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // YouTube transcript endpoint
  app.get('/api/youtube-transcript', async (req, res) => {
    const videoParam = req.query.video as string;
    const langParam = req.query.lang as string; // Optional language filter

    if (!videoParam) {
      return res.status(400).json({ error: 'Video URL or ID is required' });
    }

    const videoId = extractVideoId(videoParam);
    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ error: 'Invalid YouTube Video ID or URL' });
    }

    try {
      const options = langParam ? { lang: langParam } : undefined;
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, options);
      
      res.json({
        videoId,
        transcript
      });
    } catch (err: any) {
      const errString = err.toString();
      const isTranscriptDisabled = errString.includes('disabled') || errString.includes('Transcript is disabled');
      
      if (isTranscriptDisabled) {
        console.log(`[YouTube Subtitles] Info: Transcript is disabled or unavailable for video ${videoId}`);
        return res.status(400).json({
          error: 'Subtitles are disabled or unavailable for this video. Please try a different YouTube video that has captions enabled.'
        });
      }
      
      console.error(`[YouTube Subtitles] Error fetching transcript for ${videoId}:`, errString);
      res.status(500).json({ 
        error: err.message || 'Failed to fetch transcript. Captions might be disabled or unavailable for this video.',
        details: err.toString()
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
