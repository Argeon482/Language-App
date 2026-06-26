import express from 'express';
import path from 'path';
import { YoutubeTranscript } from 'youtube-transcript';

// Function to extract 11-character video ID from a YouTube URL or standard ID string
function extractVideoId(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 11) return trimmed;
  
  // Try matching standard watch URLs, embed URLs, short URLs, and shorts URLs
  const patterns = [
    /youtube\.com\/watch\?v=([^#\&\?]+)/i,
    /youtube\.com\/embed\/([^#\&\?]+)/i,
    /youtube\.com\/v\/([^#\&\?]+)/i,
    /youtu\.be\/([^#\&\?]+)/i,
    /youtube\.com\/shorts\/([^#\&\?]+)/i,
    /youtube\.com\/user\/[^\/]+\/([^#\&\?]+)/i,
    /youtube\.com\/[^\/]+\/[^\/]+\/([^#\&\?]+)/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }
  
  // If no patterns match but there is an 11-char string at the end of the URL
  const matchEnd = trimmed.match(/[a-zA-Z0-9_-]{11}$/);
  if (matchEnd) {
    return matchEnd[0];
  }

  return trimmed; // fallback
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Simple Request Logger
  app.use((req, res, next) => {
    console.log(`[Express] ${req.method} ${req.url}`);
    next();
  });

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
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('(.*)', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
