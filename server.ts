import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// A library of high-quality sample tracks for dynamic mapping
const FREE_AUDIO_SHACK = [
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1487180142328-054b783fc471?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&auto=format&fit=crop&q=60',
  },
  {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300&auto=format&fit=crop&q=60',
  }
];

// Helper to map dynamically to real, original song previews from the iTunes Search API
async function fetchiTunesTrack(title: string, artist: string, index: number): Promise<any> {
  const query = `${title} ${artist}`;
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        let cover = item.artworkUrl100 || "";
        if (cover.includes("100x100bb")) {
          cover = cover.replace("100x100bb", "400x400bb");
        }
        return {
          trackId: `ai-track-${Date.now()}-${index}-${item.trackId || Math.floor(Math.random() * 1000)}`,
          title: item.trackName || title,
          artist: item.artistName || artist,
          genre: item.primaryGenreName || "AI Vibe",
          vibeFactor: "Original Clip",
          duration: Math.round(item.trackTimeMillis / 1000) || 30,
          audioUrl: item.previewUrl,
          coverUrl: cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60'
        };
      }
    }
  } catch (err) {
    console.error(`iTunes match failed for query: "${query}"`, err);
  }

  // Fallback to title only search
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=music&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        let cover = item.artworkUrl100 || "";
        if (cover.includes("100x100bb")) {
          cover = cover.replace("100x100bb", "400x400bb");
        }
        return {
          trackId: `ai-track-${Date.now()}-${index}-${item.trackId || Math.floor(Math.random() * 1000)}`,
          title: item.trackName || title,
          artist: item.artistName || artist,
          genre: item.primaryGenreName || "AI Vibe",
          vibeFactor: "Original Clip",
          duration: Math.round(item.trackTimeMillis / 1000) || 30,
          audioUrl: item.previewUrl,
          coverUrl: cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60'
        };
      }
    }
  } catch (err) {
    console.error(`iTunes second match failed for study search: "${title}"`, err);
  }

  // Consistent fallback to real high-fidelity popular tracks to avoid empty results
  const fallbacks = [
    {
      title: "Blinding Lights",
      artist: "The Weeknd",
      audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/95/6a/e4/956ae476-cda1-d112-9c98-4cbd63bd0ef2/m4a.aud.up.epub.ac.m4a",
      coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/83/c5/43/83c54326-bf31-2ff8-89c0-99939aae661b/10UMGIM10695.rgb.jpg/400x400bb.jpg"
    },
    {
      title: "Shape of You",
      artist: "Ed Sheeran",
      audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/b0/78/3c/b0783c55-fb07-4e3d-0e36-79cfdb8fa707/m4a.aud.up.epub.ac.m4a",
      coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/46/76/64467666-4c48-18e3-0d5b-bf74718db0dc/190295851275.jpg/400x400bb.jpg"
    },
    {
      title: "Stay",
      artist: "The Kid LAROI & Justin Bieber",
      audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/ef/cb/20/efcb2020-fc6d-ef72-9fa4-1dd052d9a941/m4a.aud.up.epub.ac.m4a",
      coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bf/f4/f8/bff4f8fa-ec71-42cb-0d86-b485a08996b7/21UMGIM56687.rgb.jpg/400x400bb.jpg"
    }
  ];

  const selectedFallback = fallbacks[index % fallbacks.length];
  return {
    trackId: `ai-track-fallback-${Date.now()}-${index}`,
    title: selectedFallback.title,
    artist: selectedFallback.artist,
    genre: "Pop Vibe",
    vibeFactor: "Original Clip",
    duration: 30,
    audioUrl: selectedFallback.audioUrl,
    coverUrl: selectedFallback.coverUrl
  };
}

// ------------------- API ROUTES -------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI DJ playlist curator endpoint
app.post('/api/ai-dj', async (req, res) => {
  try {
    const { mood, explanation = false } = req.body;
    if (!mood || typeof mood !== 'string') {
      res.status(400).json({ error: 'Valuable mood or prompt string is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      // Graceful fallback with high-quality default playlists if API key is not ready yet
      console.warn("GEMINI_API_KEY environment variable is not defined. Emulating smart DJ response.");
      res.json(getMockPlaylistResponse(mood));
      return;
    }

    console.log(`Querying Gemini AI-DJ for mood: "${mood}"`);
    const prompt = `You are the Spotify Smart AI Music DJ. Create a customized playlist of 5 real-world songs or highly representative tracks that perfectly matches this mood search request: "${mood}". For each track, generate a real-world track title, real-world artist name, and tempo/energy state. Back up your choices with creative, premium curation descriptions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playlistTitle: {
              type: Type.STRING,
              description: "A highly creative, punchy playlist title relating to the mood"
            },
            playlistDescription: {
              type: Type.STRING,
              description: "A professional and warm Spotify-like description detailing the music direction"
            },
            tracks: {
              type: Type.ARRAY,
              description: "A highly targeted list of 5 generated songs matching the vibe",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Title of the song" },
                  artist: { type: Type.STRING, description: "Artist or band name" },
                  genre: { type: Type.STRING, description: "Vibe genre (e.g. Dream Pop, Lo-fi, Metal, Classical)" },
                  vibeFactor: { type: Type.STRING, description: "A creative tag matching the tempo (e.g. 'Cozy Sleep', 'Hyper Burst')" },
                  durationSec: { type: Type.INTEGER, description: "Duration of the track in seconds, between 120 and 340" }
                },
                required: ["title", "artist", "genre", "durationSec"]
              }
            }
          },
          required: ["playlistTitle", "playlistDescription", "tracks"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response received from Gemini.");
    }

    const payload = JSON.parse(textOutput);

    // Dynamic track resolution via real-time iTunes indexing
    const trackResolutions = payload.tracks.map((track: any, idx: number) => {
      return fetchiTunesTrack(track.title, track.artist, idx);
    });

    const enrichedTracks = await Promise.all(trackResolutions);

    res.json({
      playlistTitle: payload.playlistTitle,
      playlistDescription: payload.playlistDescription,
      tracks: enrichedTracks
    });

  } catch (error: any) {
    console.error("AI DJ Error:", error);
    res.status(500).json({
      error: "Failed to generate AI curation",
      details: error?.message || String(error),
      fallback: getMockPlaylistResponse(req.body.mood || "Chill")
    });
  }
});

// Local mock function to guarantee 100% reliability if key is absent or throws network quotas
// Local mock function to guarantee 100% reliability if key is absent or throws network quotas
function getMockPlaylistResponse(mood: string) {
  const normalized = mood.toLowerCase();
  
  if (normalized.includes('study') || normalized.includes('focus') || normalized.includes('lofi') || normalized.includes('chill')) {
    return {
      playlistTitle: "Lofi Focus Vault",
      playlistDescription: "A curated flow designed to help you lock in and find your absolute flow state. Powered by real lofi study clips.",
      tracks: [
        {
          trackId: "mock-itunes-1",
          title: "Lofi Rain Study",
          artist: "Lofi Fruits Music",
          genre: "Lo-Fi Beats",
          vibeFactor: "Original Clip",
          duration: 140,
          audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/cc/75/ca/cc75caae-910a-3fff-9d7a-b9c2ed093b58/m4a.aud.up.epub.ac.m4a",
          coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/31/6f/a9/316fa96a-0ef1-6a56-adcc-5b4cf53ced1a/9705051493630.png/400x400bb.jpg"
        },
        {
          trackId: "mock-itunes-2",
          title: "Deep Focus Flow",
          artist: "Lofi Fruits Music",
          genre: "Lo-Fi Beats",
          vibeFactor: "Original Clip",
          duration: 153,
          audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/91/34/08/91340809-565d-cf42-b06f-f29e2954a780/m4a.aud.up.epub.ac.m4a",
          coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/91/81/b1/9181b17a-5147-3f95-1ae9-d41c888126e3/9705051410491.png/400x400bb.jpg"
        },
        {
          trackId: "mock-itunes-3",
          title: "Chill Cafe Keys",
          artist: "Lofi Fruits Music",
          genre: "Lo-Fi Beats",
          vibeFactor: "Original Clip",
          duration: 165,
          audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/bc/9f/c0/bc9fc044-8e12-d9db-2fe8-4444c1a7b1b5/m4a.aud.up.epub.ac.m4a",
          coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/7e/bb/807ebbf5-6743-7fdf-ef54-6e695f26b527/196626462615.jpg/400x400bb.jpg"
        }
      ]
    };
  }

  // General default fallback
  return {
    playlistTitle: `Curated Sessions: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`,
    playlistDescription: `Hand-picked acoustic frequencies crafted to match your current vibe: ${mood}.`,
    tracks: [
      {
        trackId: "mock-gen-1",
        title: "Blinding Lights",
        artist: "The Weeknd",
        genre: "Synth-Pop",
        vibeFactor: "Original Clip",
        duration: 200,
        audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/95/6a/e4/956ae476-cda1-d112-9c98-4cbd63bd0ef2/m4a.aud.up.epub.ac.m4a",
        coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/83/c5/43/83c54326-bf31-2ff8-89c0-99939aae661b/10UMGIM10695.rgb.jpg/400x400bb.jpg"
      },
      {
        trackId: "mock-gen-2",
        title: "Shape of You",
        artist: "Ed Sheeran",
        genre: "Pop",
        vibeFactor: "Original Clip",
        duration: 233,
        audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/b0/78/3c/b0783c55-fb07-4e3d-0e36-79cfdb8fa707/m4a.aud.up.epub.ac.m4a",
        coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/46/76/64467666-4c48-18e3-0d5b-bf74718db0dc/190295851275.jpg/400x400bb.jpg"
      },
      {
        trackId: "mock-gen-3",
        title: "Stay",
        artist: "The Kid LAROI & Justin Bieber",
        genre: "Pop-Rock",
        vibeFactor: "Original Clip",
        duration: 141,
        audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/ef/cb/20/efcb2020-fc6d-ef72-9fa4-1dd052d9a941/m4a.aud.up.epub.ac.m4a",
        coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bf/f4/f8/bff4f8fa-ec71-42cb-0d86-b485a08996b7/21UMGIM56687.rgb.jpg/400x400bb.jpg"
      }
    ]
  };
}

// ------------------- INJECT VITE DEVELOPMENT OR PRODUCTION MIDDLEWARES -------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    console.log("Setting up Express with Vite Development Server Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    console.log("Setting up Express in standalone Production Mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 SPOTIFY CLONE RUNNING ON PORT ${PORT}`);
    console.log(`🌎 ACCESS IN DEV: http://localhost:3000`);
    console.log(`=========================================`);
  });
}

startServer();
