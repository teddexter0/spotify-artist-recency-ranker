import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Ensure dotenv loads from the correct path

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.static('public')); // Serve static files from the 'public' directory

let spotifyAccessToken = null;
let tokenExpiryTime = 0;
const TOKEN_REFRESH_THRESHOLD = 60 * 5; // Refresh token 5 minutes before it expires

// Define broad search queries to get a diverse set of artists
const SEARCH_QUERIES = [
    'a', 'e', 'i', 'o', 'u', // Vowels often appear in popular names
    'the', 'pop', 'rock', 'hip hop', 'r&b', 'dance', 'country', 'jazz', // Genres
    'band', 'singer', 'group', // Common terms
    'star', 'legend', // More descriptive terms
    'love', 'world', // Common words in song/artist names
];
const SEARCH_LIMIT_PER_QUERY = 50; // Max results per search request
const SEARCH_OFFSETS_PER_QUERY = [0, 50, 100, 150, 200]; // Fetch up to 5 pages per query (50*5 = 250 artists per query)
const RANKING_SIZE = 100; // The desired number of top artists to return

// Cache for ranking data
let cachedRanking = null;
let lastCacheTime = 0;
const CACHE_LIFETIME = 1000 * 60 * 60; // Cache for 1 hour (in milliseconds)

/**
 * Function to get a Spotify access token using Client Credentials Flow.
 * Caches the token and refreshes it if expired.
 */
async function getSpotifyAccessToken() {
    const now = Date.now();
    if (spotifyAccessToken && (now < tokenExpiryTime - TOKEN_REFRESH_THRESHOLD * 1000)) {
        // Token is still valid, no need to refresh
        return spotifyAccessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set in .env file.");
        throw new Error("Spotify credentials not configured.");
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`
            }
        });

        spotifyAccessToken = response.data.access_token;
        tokenExpiryTime = now + response.data.expires_in * 1000; // expires_in is in seconds
        console.log('Spotify access token obtained.');
        return spotifyAccessToken;
    } catch (error) {
        console.error('Error obtaining Spotify access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to obtain Spotify access token.');
    }
}

/**
 * Fetches artists based on multiple search queries, de-duplicates, and ranks them by popularity.
 */
async function getRankedArtists() {
    const accessToken = await getSpotifyAccessToken();
    const headers = {
        'Authorization': `Bearer ${accessToken}`
    };

    const allArtistsMap = new Map(); // Use a Map to store unique artists by ID

    const searchPromises = [];

    for (const query of SEARCH_QUERIES) {
        for (const offset of SEARCH_OFFSETS_PER_QUERY) {
            const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${SEARCH_LIMIT_PER_QUERY}&offset=${offset}`;
            searchPromises.push(
                axios.get(searchUrl, { headers })
                    .then(response => response.data.artists.items)
                    .catch(error => {
                        console.error(`Error fetching artists for query "${query}" (offset ${offset}):`, error.response ? error.response.status : error.message);
                        return []; // Return empty array on error to avoid breaking Promise.all
                    })
            );
        }
    }

    try {
        // Wait for all search promises to resolve
        const results = await Promise.all(searchPromises);

        // Process results to aggregate and de-duplicate artists
        for (const artistsPage of results) {
            for (const artist of artistsPage) {
                // Ensure the artist has an ID, name, followers, and images
                if (artist.id && artist.name && artist.images && artist.images.length > 0 && artist.followers && typeof artist.popularity === 'number') {
                    // Find 64x64 image, else smallest, else largest
                    let chosenImage = artist.images.find(img => img.width === 64) || artist.images[artist.images.length - 1] || artist.images[0];
                    allArtistsMap.set(artist.id, {
                        id: artist.id,
                        name: artist.name,
                        followers: artist.followers.total,
                        popularity: artist.popularity,
                        imageUrl: artist.images.length > 0 ? (chosenImage.url) : 'https://via.placeholder.com/150?text=No+Image'
                    });
                }
            }
        }

        // Convert Map values back to an array
        const allUniqueArtists = Array.from(allArtistsMap.values());

        // Sort by popularity in descending order
        allUniqueArtists.sort((a, b) => b.popularity - a.popularity);

        // Take the top N artists
        return allUniqueArtists.slice(0, RANKING_SIZE);

    } catch (error) {
        console.error('Error during artist search and aggregation:', error.message);
        throw new Error('Failed to get ranked artists.');
    }
}

// Add this new endpoint to your server/index.js
app.get('/api/search-artist', async (req, res) => {
    const artistName = req.query.name; // Get artist name from query parameter
    if (!artistName) {
        return res.status(400).json({ error: 'Artist name query parameter "name" is required.' });
    }

    try {
        const accessToken = await getSpotifyAccessToken();
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };

        // Search for the artist, limit to 1 result for the most relevant match
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;

        const response = await axios.get(searchUrl, { headers });
        const artist = response.data.artists.items[0]; // Get the first (most relevant) artist found

        if (artist) {
            // Check if this artist is in our currently cached top 100 ranking
            const rankInTop100 = cachedRanking ? cachedRanking.findIndex(a => a.id === artist.id) + 1 : -1;

            res.json({
                id: artist.id,
                name: artist.name,
                followers: artist.followers.total,
                popularity: artist.popularity,
                imageUrl: artist.images.length > 0 ?
                          (artist.images.find(img => img.width === 64) || artist.images[artist.images.length - 1] || artist.images[0]).url :
                          'https://via.placeholder.com/150?text=No+Image',
                rankInTop100: rankInTop100 !== 0 ? rankInTop100 : -1 // -1 if not found or is 0-indexed result
            });
        } else {
            res.status(404).json({ message: `Artist "${artistName}" not found.` });
        }

    } catch (error) {
        console.error(`Error searching for artist "${artistName}":`, error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to search for artist.' });
    }
});

// API endpoint for artist ranking
app.get('/api/artists-ranking', async (req, res) => {
    const now = Date.now();

    // Check if cached data is still valid
    if (cachedRanking && (now < lastCacheTime + CACHE_LIFETIME)) {
        console.log('Serving artists ranking from cache.');
        return res.json(cachedRanking);
    }

    // Fetch new data if cache is expired or empty
    try {
        console.log('Fetching fresh artists ranking...');
        const rankedArtists = await getRankedArtists();
        cachedRanking = rankedArtists;
        lastCacheTime = now;
        res.json(rankedArtists);
    } catch (error) {
        console.error('Error in /api/artists-ranking:', error.message);
        res.status(500).json({ error: 'Failed to retrieve artist ranking.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});