// Set API base URL depending on environment
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- DOM Element Selections ---
// Elements for the main ranking display
const loadingMessage = document.getElementById('loading-message');
const artistListDiv = document.getElementById('artist-list');

// Elements for the artist search feature
const artistSearchInput = document.getElementById('artist-search-input');
const searchButton = document.getElementById('search-button');
const searchResultsDisplay = document.getElementById('search-results-display');

// --- Functions for Main Ranking List ---

/**
 * Fetches the ranked artists from the backend API.
 */
async function fetchArtistsRanking() {
    if (loadingMessage) loadingMessage.style.display = 'block'; // Show loading message
    artistListDiv.innerHTML = ''; // Clear previous artists when loading new ones

    try {
        const response = await fetch(`${API_BASE_URL}/api/artists-ranking`); // Use API_BASE_URL for both local and prod
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch artist ranking.');
        }
        const artists = await response.json();
        displayArtists(artists);
    } catch (error) {
        console.error('Error fetching artist ranking:', error);
        if (artistListDiv) {
            artistListDiv.innerHTML = '<p class="message error-message">Failed to load artist ranking. Please try refreshing or check console.</p>';
        }
    } finally {
        if (loadingMessage) loadingMessage.style.display = 'none'; // Hide loading message
    }
}

/**
 * Displays the list of artists in the UI.
 * @param {Array<Object>} artists - An array of artist objects.
 */
function displayArtists(artists) {
    artistListDiv.innerHTML = ''; // Clear previous content

    if (artists.length === 0) {
        artistListDiv.innerHTML = '<p class="message">No artists found in the ranking.</p>';
        return;
    }

    artists.forEach((artist, index) => {
        const artistItem = document.createElement('div');
        artistItem.className = 'artist-item';
        artistItem.id = `artist-${artist.id}`; // Add ID for potential highlighting

        // Corrected: Use artist.popularity for display
        artistItem.innerHTML = `
            <span class="rank-number">#${index + 1}</span>
            <img src="${artist.imageUrl}" alt="${artist.name}" class="artist-image">
            <div class="artist-info">
                <h3 class="artist-name">${artist.name}</h3>
                <p>Popularity: <strong>${artist.popularity}/100</strong></p>
                <p>Followers: <strong>${artist.followers.toLocaleString()}</strong></p>
            </div>
        `;
        artistListDiv.appendChild(artistItem);
    });
}

// --- Functions for Artist Search Feature ---

async function searchArtist() {
    const query = artistSearchInput.value.trim();
    if (!query) {
        searchResultsDisplay.innerHTML = '<p class="message">Please enter an artist name to search.</p>';
        // Optional: Remove highlight from main list if search bar is cleared
        document.querySelectorAll('.highlight-searched').forEach(el => el.classList.remove('highlight-searched'));
        return;
    }

    searchResultsDisplay.innerHTML = '<p class="message">Searching...</p>';
    // Optional: Reset highlights from previous searches
    document.querySelectorAll('.highlight-searched').forEach(el => el.classList.remove('highlight-searched'));

    try {
        const response = await fetch(`${API_BASE_URL}/api/search-artist?name=${encodeURIComponent(query)}`);
        const data = await response.json();

        searchResultsDisplay.innerHTML = ''; // Clear previous messages

        if (response.ok) {
            const artist = data;
            const artistCard = document.createElement('div');
            artistCard.className = 'artist-item searched-artist'; // Use existing styling + new class

            let rankText = '';
            if (artist.rankInTop100 && artist.rankInTop100 !== -1) { // Check for truthiness and -1
                rankText = `<span class="rank-badge">Rank #${artist.rankInTop100}</span>`;

                // Highlight the artist in the main list if found
                const existingArtistElement = document.getElementById(`artist-${artist.id}`);
                if (existingArtistElement) {
                    existingArtistElement.classList.add('highlight-searched');
                    existingArtistElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to it
                }

            } else {
                rankText = '<span class="not-ranked">Not in Top 100</span>';
            }

            artistCard.innerHTML = `
                <img src="${artist.imageUrl}" alt="${artist.name}" class="artist-image">
                <div class="artist-info">
                    <h3 class="artist-name">${artist.name}</h3>
                    <p>Popularity: <strong>${artist.popularity}/100</strong></p>
                    <p>Followers: <strong>${artist.followers.toLocaleString()}</strong></p>
                    ${rankText}
                </div>
            `;
            searchResultsDisplay.appendChild(artistCard);

        } else {
            searchResultsDisplay.innerHTML = `<p class="message error-message">Error: ${data.message || 'Artist not found.'}</p>`;
        }
    } catch (error) {
        console.error('Error searching for artist:', error);
        searchResultsDisplay.innerHTML = '<p class="message error-message">An error occurred during search. Please try again.</p>';
    }
}

// --- Event Listeners & Initial Load ---
searchButton.addEventListener('click', searchArtist);
artistSearchInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchArtist();
    }
});

// Optional: Clear search results when user starts typing again
artistSearchInput.addEventListener('input', function() {
    searchResultsDisplay.innerHTML = '';
});

// !!! IMPORTANT: Call this function to load the initial Top 100 list
fetchArtistsRanking();