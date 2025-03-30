// Global variables
let currentImagePopup = null;

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Get application version - will be replaced by the docker-entrypoint.sh script
    const APP_VERSION = 'v1.0.0';
    const BUILD_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    document.getElementById('version-display').textContent = `${APP_VERSION} (${BUILD_DATE})`;
    
    // Set up image popup handling
    setupImagePopup();
    
    // Load and display walks
    await loadWalks();
});

// Function to set up the image popup event handlers
function setupImagePopup() {
    const popup = document.getElementById('image-popup');
    
    // Close popup when clicking anywhere
    popup.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}

// Function to load and display available walks
async function loadWalks() {
    try {
        // Fetch the list of available walks (directories in /data)
        const response = await fetch('/api/walks');
        if (!response.ok) {
            throw new Error('Failed to fetch walks list');
        }
        
        const walks = await response.json();
        const container = document.getElementById('walks-container');
        
        if (walks.length === 0) {
            container.innerHTML = '<div class="no-walks">No walks available. Add a walk folder to get started!</div>';
            return;
        }
        
        // Sort walks alphabetically
        walks.sort();
        
        // Load and display each walk
        for (const walkId of walks) {
            try {
                const walkCard = await createWalkCard(walkId);
                container.appendChild(walkCard);
            } catch (err) {
                console.error(`Error loading walk ${walkId}:`, err);
                // Still continue with other walks
            }
        }
    } catch (error) {
        console.error('Error loading walks:', error);
        document.getElementById('walks-container').innerHTML = 
            `<div class="error-message">Error loading walks: ${error.message}</div>`;
    }
}

// Function to create a walk card for a specific walk
async function createWalkCard(walkId) {
    // Fetch the walk settings
    const response = await fetch(`/data/${walkId}/walk_settings.json`);
    if (!response.ok) {
        throw new Error(`Failed to load settings for walk "${walkId}"`);
    }
    
    const settings = await response.json();
    
    // Fetch walk file info
    const infoResponse = await fetch(`/api/walk-info/${walkId}`);
    let fileDate = '';
    if (infoResponse.ok) {
        const walkInfo = await infoResponse.json();
        const date = new Date(walkInfo.lastModified);
        fileDate = date.toLocaleDateString();
    } else {
        fileDate = 'Unknown date';
    }
    
    // Create walk card element
    const walkCard = document.createElement('div');
    walkCard.className = 'walk-card';
    walkCard.setAttribute('data-walk-id', walkId);
    
    // Determine cover image and fallback
    const coverImage = settings.coverImage || 
        (settings.images && settings.images.length > 0 ? settings.images[0].imageName : null);
    
    // Prepare HTML content
    let imageHtml = '';
    if (coverImage) {
        imageHtml = `
            <img 
                class="walk-card-image" 
                src="/thumbnail/${walkId}/${coverImage}" 
                alt="${settings.title || walkId}"
            >
        `;
    } else {
        // Fallback if no cover image
        imageHtml = `
            <div class="walk-card-image walk-card-image-placeholder">
                <div class="placeholder-text">No Cover Image</div>
            </div>
        `;
    }
    
    walkCard.innerHTML = `
        ${imageHtml}
        <div class="walk-card-content">
            <div class="walk-card-title">${settings.title || walkId}</div>
            <div class="walk-card-description">${settings.description || 'No description available'}</div>
            <div class="walk-card-stats">
                <span>${settings.images ? settings.images.length : 0} photos</span>
                <span>Updated: ${fileDate}</span>
            </div>
        </div>
    `;
    
    // Add click event to navigate to the walk page
    walkCard.addEventListener('click', function(e) {
        // Navigate to the walk page for all parts of the card
        window.location.href = `/walk.html?id=${walkId}`;
    });
    
    return walkCard;
}

// Function to show an image in the popup
async function showImagePopup(imageSrc, notes) {
    const popup = document.getElementById('image-popup');
    const popupImage = document.getElementById('popup-image');
    const popupNotes = document.getElementById('popup-notes');
    const loadingIndicator = document.querySelector('.loading-indicator');
    
    // Reset styles
    popupImage.classList.remove('error');
    
    // Show popup with loading state
    popup.style.display = 'block';
    popupImage.classList.add('loading');
    
    // Set placeholder text
    popupNotes.textContent = notes || '';
    loadingIndicator.textContent = 'Loading full image...';
    
    // Set source to trigger loading
    popupImage.src = imageSrc;
    
    // Handle image load event
    popupImage.onload = function() {
        popupImage.classList.remove('loading');
    };
    
    // Handle image error
    popupImage.onerror = function() {
        popupImage.classList.remove('loading');
        popupImage.classList.add('error');
        loadingIndicator.textContent = 'Failed to load image';
        setTimeout(() => {
            loadingIndicator.style.opacity = '0';
        }, 2000);
    };
} 