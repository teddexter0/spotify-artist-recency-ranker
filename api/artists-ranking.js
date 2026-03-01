import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// ---- Spotify Token Handling ----
let spotifyAccessToken = null;
let tokenExpiryTime = 0;
const TOKEN_REFRESH_THRESHOLD = 60 * 5;

async function getSpotifyAccessToken() {
    const now = Date.now();

    if (spotifyAccessToken && now < tokenExpiryTime - TOKEN_REFRESH_THRESHOLD * 1000) {
        return spotifyAccessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) throw new Error('Spotify credentials missing');

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    spotifyAccessToken = res.data.access_token;
    tokenExpiryTime = now + res.data.expires_in * 1000;

    return spotifyAccessToken;
}

// ---- Dynamic Artist Ranking ----
const SEARCH_QUERIES = [
    'a', 'e', 'i', 'o', 'u',
    'pop', 'rock', 'hip hop', 'trap', 'reggae',
    'dance', 'country', 'band', 'legend', 'star'
];
// Spotify Development Mode: max limit is now 10 (reduced from 50)
const SEARCH_LIMIT = 10;
const SEARCH_OFFSETS = [0, 10, 20];
const RANKING_SIZE = 100;
// Maximum absolute position used for scoring (offset + index)
const MAX_POSITION = Math.max(...SEARCH_OFFSETS) + SEARCH_LIMIT;

let cachedRanking = null;
let lastCacheTime = 0;
const CACHE_LIFETIME = 1000 * 60 * 60;

async function getArtistsRanking() {
    const now = Date.now();
    if (cachedRanking && now < lastCacheTime + CACHE_LIFETIME) {
        return cachedRanking;
    }

    const token = await getSpotifyAccessToken();
    const headers = { Authorization: `Bearer ${token}` };
    const allArtistsMap = new Map();
    const searchPromises = [];

    for (const query of SEARCH_QUERIES) {
        for (const offset of SEARCH_OFFSETS) {
            const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${SEARCH_LIMIT}&offset=${offset}`;
            searchPromises.push(
                axios.get(url, { headers })
                    .then(res => ({ items: res.data.artists.items || [], offset }))
                    .catch(() => ({ items: [], offset }))
            );
        }
    }

    const results = await Promise.all(searchPromises);

    // Rank artists by search-result position score.
    // popularity and followers are no longer available in Development Mode
    // (removed per Spotify's February 2026 API changes).
    for (const { items, offset } of results) {
        items.forEach((artist, index) => {
            if (artist?.id && artist?.name && artist?.images?.[0]?.url) {
                // Artists appearing earlier in search results score higher
                const positionScore = MAX_POSITION - (offset + index);
                if (allArtistsMap.has(artist.id)) {
                    allArtistsMap.get(artist.id).score += positionScore;
                } else {
                    allArtistsMap.set(artist.id, {
                        id: artist.id,
                        name: artist.name,
                        imageUrl: artist.images[0].url,
                        score: positionScore
                    });
                }
            }
        });
    }

    const uniqueArtists = Array.from(allArtistsMap.values());
    uniqueArtists.sort((a, b) => b.score - a.score);

    cachedRanking = uniqueArtists.slice(0, RANKING_SIZE);
    lastCacheTime = Date.now();
    return cachedRanking;
}

// ---- Routes ----

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/artists-ranking', async (req, res) => {
    try {
        const artists = await getArtistsRanking();
        res.json(artists);
    } catch (err) {
        console.error('❌ Backend Error (ranking):', err.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

app.get('/api/search-artist', async (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'No artist name provided' });

    try {
        const token = await getSpotifyAccessToken();

        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const json = await searchRes.json();
        const candidates = json.artists?.items || [];

        if (!candidates.length) return res.status(404).json({ message: 'Artist not found' });

        const topArtists = await getArtistsRanking();

        // Pick the highest-ranked candidate among the search results (by Spotify ID)
        let bestArtist = candidates[0];
        let bestRank = Infinity;

        for (const candidate of candidates) {
            if (!candidate?.id) continue;
            const rankIdx = topArtists.findIndex(a => a.id === candidate.id);
            if (rankIdx !== -1 && rankIdx + 1 < bestRank) {
                bestArtist = candidate;
                bestRank = rankIdx + 1;
            }
        }

        // Fallback: case-insensitive name match in ranking (handles duplicate artist profiles)
        if (bestRank === Infinity) {
            const nameIdx = topArtists.findIndex(
                a => a.name.toLowerCase() === candidates[0].name.toLowerCase()
            );
            if (nameIdx !== -1) bestRank = nameIdx + 1;
        }

        res.json({
            id: bestArtist.id,
            name: bestArtist.name,
            imageUrl: bestArtist.images?.[0]?.url || 'https://via.placeholder.com/150',
            rankInTop100: bestRank < Infinity ? bestRank : -1
        });
    } catch (err) {
        console.error('❌ Search API Error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ✅ Local dev: only run if this file is run directly
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ Local server running at: http://localhost:${PORT}`);
  });
}

// ✅ Vercel: export for serverless usage
export default app;