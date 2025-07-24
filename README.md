# 🎵 Spotify Artists Popularity Ranking

> A modern web application that dynamically ranks popular artists using Spotify's Web API with stunning visual effects and real-time search.

[**🚀 Live Demo**](@https://spotify-artist-recency-ranker-2nxdyonbx.vercel.app/) | [**📱 Try it Now**](@https://spotify-artist-recency-ranker-2nxdyonbx.vercel.app/)

![App Screenshot](https://via.placeholder.com/800x400/1DB954/FFFFFF?text=Replace+with+actual+screenshot)

## ✨ Features

- **🏆 Dynamic Artist Ranking** - Real-time top 100 artists based on Spotify popularity scores
- **🔍 Instant Search** - Find any artist and see their ranking position
- **🎨 Modern UI** - Parallax effects, animations, and glassmorphism design
- **📱 Responsive** - Works seamlessly across all devices
- **⚡ Fast & Cached** - Optimized API calls with intelligent caching

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (with advanced animations)
- **Backend:** Node.js, Express.js
- **API:** Spotify Web API
- **Deployment:** Vercel
- **Styling:** Custom CSS with parallax effects and glassmorphism

## 🚀 Quick Start

### Prerequisites
- Node.js (16+)
- Spotify Developer Account

### Local Development

1. **Clone & Install**
   ```bash
   git clone https://github.com/teddexter0/spotify-artist-recency-ranker.git
   cd spotify-artist-ranking
   npm install
   ```

2. **Setup Spotify API**
   - Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create `.env` file:
     ```env
     SPOTIFY_CLIENT_ID=your_client_id
     SPOTIFY_CLIENT_SECRET=your_client_secret
     ```

3. **Run**
   ```bash
   npm start
   ```
   Visit `http://localhost:3000`

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fspotify-artist-ranking)

1. Click the deploy button above
2. Add environment variables in Vercel dashboard:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
3. Deploy! 🎉

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Express API    │────│  Spotify API    │
│   (Vanilla JS)  │    │   (Node.js)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

The app uses multiple search strategies to aggregate popular artists since Spotify doesn't provide a direct "top artists globally" endpoint. Data is cached for performance and ranked by Spotify's popularity algorithm.

## 📊 API Endpoints

- `GET /api/artists-ranking` - Returns top 100 ranked artists
- `GET /api/search-artist?name=query` - Search for specific artist

## 🎨 Key Features

### Smart Artist Discovery
- Uses multiple search strategies (genres, common terms, letters)
- Aggregates and deduplicates results
- Ranks by Spotify's popularity score (0-100)

### Modern Visual Design
- Parallax scrolling effects
- Glassmorphism and gradients
- Smooth animations and transitions
- Interactive hover effects

### Performance Optimized
- In-memory caching (1 hour TTL)
- Lazy loading images
- Throttled scroll events
- Efficient API batching

## ⚠️ Important Notes

- **Educational/Portfolio Purpose**: This project is for learning and demonstration
- **API Compliance**: Uses only public Spotify Web API endpoints
- **Rate Limiting**: Implements proper caching to respect API limits
- **No User Data**: Only accesses public artist information

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for providing artist data
- Inspired by modern music streaming interfaces
- Built for educational and portfolio purposes

---

**⭐ If you found this project helpful, please consider giving it a star!**