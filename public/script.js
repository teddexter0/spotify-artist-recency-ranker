// Enhanced Spotify App JavaScript with Visual Effects

// Set API base URL depending on environment
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- DOM Element Selections ---
const loadingMessage = document.getElementById('loading-message');
const artistListDiv = document.getElementById('artist-list');
const artistSearchInput = document.getElementById('artist-search-input');
const searchButton = document.getElementById('search-button');
const searchResultsDisplay = document.getElementById('search-results-display');

// --- Visual Enhancement Functions ---

/**
 * Adds staggered animation delays to artist items by setting a CSS variable.
 */
function addStaggeredAnimations() {
    const artistItems = document.querySelectorAll('.artist-item');
    artistItems.forEach((item, index) => {
        // Set the CSS variable which is used by the CSS `animation-delay`
        item.style.setProperty('--animation-order', index);
        // The `animation-delay` in CSS now correctly uses this variable.
        // The inline `item.style.animationDelay` here is redundant with the CSS media query block.
        // It's removed to avoid potential confusion, as the CSS version is more robust.
    });
}

/**
 * Creates a ripple effect on button click
 */
function createRippleEffect(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 10; /* Ensure ripple is above button content */
    `;
    
    button.style.position = 'relative'; // Ensure button is relative for absolute ripple positioning
    button.style.overflow = 'hidden'; // Hide ripple overflow
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple animation CSS to the document head
// This is good practice for dynamic CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

/**
 * Adds parallax scrolling effect to artist items
 */
function addParallaxScrolling() {
    const artistItems = document.querySelectorAll('.artist-item');
    
    const handleScroll = () => {
        const scrollTop = window.pageYOffset;
        
        artistItems.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                const speed = (index % 3 + 1) * 0.05; // Adjusted speed for subtler effect
                const yPos = scrollTop * speed * 0.1; // Further subtle adjustment
                // Using transform-style: preserve-3d and perspective on parent for better 3D
                item.style.transform = `translateY(${yPos}px) perspective(1000px) rotateX(${Math.sin(scrollTop * 0.001 + index) * 0.5}deg)`; // Reduced rotation for subtlety
            }
        });
    };
    
    // Throttle scroll events for performance
    let ticking = false;
    const throttledScroll = () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    };
    
    // Only add listener if not already added (prevents multiple listeners on re-render)
    window.removeEventListener('scroll', throttledScroll); // Remove old listener if any
    window.addEventListener('scroll', throttledScroll);
    handleScroll(); // Initial call to set positions
}

/**
 * Adds intersection observer for fade-in animations
 * Assumes you have 'artistSlideIn' keyframe in your CSS
 */
function addIntersectionAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Trigger the CSS animation
                // The animation will manage opacity and transform for a smooth entry
                entry.target.style.animation = `artistSlideIn 0.6s ease-out forwards var(--animation-order, 0)s`;
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, {
        threshold: 0.1, // Element is 10% visible
        rootMargin: '0px 0px -50px 0px' // Start animation a bit before it enters viewport bottom
    });
    
    // Observe all artist items
    document.querySelectorAll('.artist-item').forEach(item => {
        // Initial styles for the animation to work from
        item.style.opacity = '0'; 
        item.style.transform = 'translateX(-50px)'; // Matches the 'from' state of artistSlideIn (implicitly)
        observer.observe(item);
    });
}

/**
 * Enhanced loading animation with progress simulation
 */
function showEnhancedLoading() {
    if (loadingMessage) {
        loadingMessage.style.display = 'flex'; // Use flex for centering content
        loadingMessage.style.flexDirection = 'column';
        loadingMessage.style.alignItems = 'center';
        loadingMessage.style.justifyContent = 'center'; // Center vertically in its container if it has height
        loadingMessage.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <div style="font-size: 1.2em; color: var(--text-primary);">Loading top artists... <span class="spinner"></span></div>
                <div class="progress-bar-container" style="width: 200px; height: 6px; background: rgba(29, 185, 84, 0.2); border-radius: 3px; overflow: hidden;">
                    <div class="progress-bar" style="height: 100%; background: linear-gradient(90deg, #1DB954, #1ed760); width: 0%; border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        
        // Simulate progress more smoothly
        const progressBar = loadingMessage.querySelector('.progress-bar');
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * (100 / 30); // Reach 100% in approx 30 updates * 200ms = 6 seconds
            if (progress >= 95) { // Stop just before 100% to let actual data load fill it
                progress = 95;
                // clearInterval(progressInterval); // Don't clear yet, let data load clear it
            }
            progressBar.style.width = `${progress}%`;
        }, 150); // Faster updates for smoother bar

        return progressInterval;
    }
    return null; // Return null if loadingMessage is not found
}


/**
 * Enhanced display function with visual effects
 */
function displayArtists(artists) {
    artistListDiv.innerHTML = ''; // Clear previous content

    if (artists.length === 0) {
        artistListDiv.innerHTML = '<p class="message" style="text-align: center; color: var(--text-secondary); font-size: 1.2em;">No artists found in the ranking.</p>';
        return;
    }

    // Create a document fragment for better performance when appending many elements
    const fragment = document.createDocumentFragment();

    artists.forEach((artist, index) => {
        const artistItem = document.createElement('div');
        artistItem.className = 'artist-item';
        artistItem.id = `artist-${artist.id}`;
        
        // Add special styling for top 3 (ensure your CSS variables are defined)
        if (index < 3) {
            artistItem.style.background = `linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)`;
            artistItem.style.borderColor = 'var(--primary-color)';
        }

        artistItem.innerHTML = `
            <span class="rank-number">#${index + 1}</span>
            <img src="${artist.imageUrl}" alt="${artist.name}" class="artist-image" loading="lazy">
            <div class="artist-info">
                <h3 class="artist-name">${artist.name}</h3>
                <p>Popularity: <strong style="color: var(--primary-color);">${artist.popularity}/100</strong></p>
                <p>Followers: <strong style="color: var(--accent-color);">${artist.followers.toLocaleString()}</strong></p>
            </div>
        `;
        
        // --- REMOVED: JS-based mouseenter/mouseleave hover effects ---
        // These are now handled entirely by CSS using the :hover pseudo-class
        
        fragment.appendChild(artistItem);
    });

    artistListDiv.appendChild(fragment);
    
    // Add visual enhancements *after* all elements are in the DOM
    // Small timeout ensures browser has painted elements for accurate measurements
    setTimeout(() => {
        addStaggeredAnimations(); // Apply CSS animation delays via --animation-order
        addIntersectionAnimations(); // Setup fade-in on scroll
        addParallaxScrolling(); // Setup parallax (needs to be active on scroll)
    }, 100);
}

/**
 * Enhanced fetch function with better error handling and visual feedback
 */
async function fetchArtistsRanking() {
    // Clear previous search results if any, when loading main ranking
    searchResultsDisplay.innerHTML = '';
    
    const progressInterval = showEnhancedLoading(); // Start loading animation

    try {
        const response = await fetch(`${API_BASE_URL}/api/artists-ranking`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch artist ranking.');
        }
        const artists = await response.json();
        
        // Clear progress interval on successful data fetch
        if (progressInterval) clearInterval(progressInterval);
        
        // Add a slight delay for visual appeal before displaying artists
        setTimeout(() => {
            displayArtists(artists);
        }, 300); // Give progress bar a moment to fill
        
    } catch (error) {
        console.error('Error fetching artist ranking:', error);
        if (progressInterval) clearInterval(progressInterval); // Clear progress on error
        
        if (artistListDiv) {
            artistListDiv.innerHTML = `
                <div class="error-message">
                    <h3>🎵 Oops! Something went wrong</h3>
                    <p>Failed to load artist ranking. Please try refreshing the page.</p>
                    <button onclick="fetchArtistsRanking()" style="margin-top: 15px; padding: 10px 20px; background: var(--gradient-primary); border: none; border-radius: 25px; color: white; cursor: pointer; font-weight: bold;">
                        Try Again
                    </button>
                </div>
            `;
            // Ensure any custom error styling is in style.css, not inline
        }
    } finally {
        if (loadingMessage) loadingMessage.style.display = 'none'; // Hide loading container
    }
}

/**
 * Enhanced search function with visual feedback and re-integrated core logic
 */
async function searchArtist() {
    const query = artistSearchInput.value.trim();
    if (!query) {
        searchResultsDisplay.innerHTML = '<p class="message">Please enter an artist name to search.</p>';
        document.querySelectorAll('.highlight-searched').forEach(el => el.classList.remove('highlight-searched'));
        return;
    }

    searchResultsDisplay.innerHTML = '<p class="message">Searching...</p>';
    document.querySelectorAll('.highlight-searched').forEach(el => el.classList.remove('highlight-searched')); // Remove existing highlights

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
                    <p>Popularity: <strong style="color: var(--primary-color);">${artist.popularity}/100</strong></p>
                    <p>Followers: <strong style="color: var(--accent-color);">${artist.followers.toLocaleString()}</strong></p>
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

// Attach ripple effect to the search button
searchButton.addEventListener('click', (event) => {
    createRippleEffect(event); // Call ripple effect
    searchArtist(); // Then perform search
});

// Event listener for Enter key on search input
artistSearchInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchArtist();
        // Optional: Trigger ripple on Enter key as well
        // searchButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
});

// Optional: Clear search results when user starts typing again
artistSearchInput.addEventListener('input', function() {
    searchResultsDisplay.innerHTML = '';
});

// !!! IMPORTANT: Call this function to load the initial Top 100 list
fetchArtistsRanking();