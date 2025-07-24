// api/search-artist.js
import axios from 'axios';

let spotifyAccessToken = null;
let tokenExpiryTime = 0;
const TOKEN_REFRESH_THRESHOLD = 60 * 5 * 1000;

async function getSpotifyAccessToken() {
  const now = Date.now();

  if (spotifyAccessToken && now < tokenExpiryTime - TOKEN_REFRESH_THRESHOLD) {
    return spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials missing');
  }

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'No artist name provided' });

  try {
    const token = await getSpotifyAccessToken();

    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const json = await searchRes.json();
    const artist = json.artists?.items?.[0];

    if (!artist) return res.status(404).json({ message: 'Artist not found' });

    res.json({
      id: artist.id,
      name: artist.name,
      popularity: artist.popularity ?? 0,
      followers: artist.followers?.total ?? 0,
      imageUrl: artist.images?.[0]?.url || 'https://via.placeholder.com/150',
      rankInTop100: -1 // Let frontend compare with list if needed
    });
  } catch (err) {
    console.error('❌ Search API Error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
}
