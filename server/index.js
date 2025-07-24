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
const SEARCH_LIMIT = 50;
const SEARCH_OFFSETS = [0, 50, 100];
const RANKING_SIZE = 100;

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
                    .then(res => res.data.artists.items || [])
                    .catch(() => [])
            );
        }
    }

    const results = await Promise.all(searchPromises);

    for (const group of results) {
        for (const artist of group) {
            if (
                artist?.id &&
                artist?.name &&
                artist?.followers?.total &&
                typeof artist.popularity === 'number' &&
                artist?.images?.[0]?.url
            ) {
                allArtistsMap.set(artist.id, {
                    id: artist.id,
                    name: artist.name,
                    followers: artist.followers.total,
                    popularity: artist.popularity,
                    imageUrl: artist.images[0].url
                });
            }
        }
    }

    const uniqueArtists = Array.from(allArtistsMap.values());
    uniqueArtists.sort((a, b) => b.popularity - a.popularity);

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

        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const json = await searchRes.json();
        const artist = json.artists?.items?.[0];

        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        const topArtists = await getArtistsRanking();
        const rank = topArtists.findIndex(a => a.id === artist.id) + 1;

        res.json({
            id: artist.id,
            name: artist.name,
            popularity: artist.popularity ?? 0,
            followers: artist.followers?.total ?? 0,
            imageUrl: artist.images?.[0]?.url || 'https://via.placeholder.com/150',
            rankInTop100: rank > 0 ? rank : -1
        });
    } catch (err) {
        console.error('❌ Search API Error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ---- Start Server ----

app.listen(PORT, () => {
    console.log(`✅ Local server running at: http://localhost:${PORT}`);
});
