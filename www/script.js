let map;
let settings;
let coordinatesPopup;
let currentImageIndex = -1;
let imagesArray = [];
let currentWalkId = null;
let siteConfig = {
    siteName: "Trail Map Viewer",
    siteTitle: "Trail Map Collection",
    theme: {
        mainBackground: "#ffffff"
    }
};

// Function to calculate offset coordinates
function getOffsetCoordinates(coords, trailPath, existingMarkers = []) {
    // Find the closest point on the trail
    let minDist = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < trailPath.length - 1; i++) {
        const dist = getDistanceToLine(coords, trailPath[i], trailPath[i + 1]);
        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    // Calculate the overall direction using 5% of the trail length
    const trailLength = trailPath.length;
    const segmentCount = Math.max(1, Math.floor(trailLength * 0.05)); // 5% of trail length
    let dx = 0, dy = 0;
    let count = 0;

    // Look at segments before and after the closest point
    const startIndex = Math.max(0, closestIndex - Math.floor(segmentCount / 2));
    const endIndex = Math.min(trailLength - 1, startIndex + segmentCount);

    for (let i = startIndex; i < endIndex; i++) {
        dx += trailPath[i + 1][1] - trailPath[i][1];
        dy += trailPath[i + 1][0] - trailPath[i][0];
        count++;
    }

    // Calculate average direction vector
    dx /= count;
    dy /= count;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Normalize the direction vector
    const nx = dx / length;
    const ny = dy / length;

    // Calculate perpendicular vector (rotate 90 degrees)
    const px = -ny;
    const py = nx;

    // Base offset distance (approximately 50 meters)
    const baseOffset = 0.0005;

    // Try different offset positions until we find one that doesn't overlap
    for (let offset = 0; offset < 5; offset++) {
        const testCoords = [
            coords[0] + py * baseOffset * (offset + 1),
            coords[1] + px * baseOffset * (offset + 1)
        ];

        // Check if this position overlaps with any existing markers
        let overlaps = false;
        for (const marker of existingMarkers) {
            const dist = getDistanceToLine(testCoords, marker.coords, marker.coords);
            if (dist < 0.0003) { // Approximately 30 meters minimum distance
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            return testCoords;
        }
    }

    // If we couldn't find a non-overlapping position, return the base offset
    return [
        coords[0] + py * baseOffset,
        coords[1] + px * baseOffset
    ];
}

// Function to calculate distance from point to line segment
function getDistanceToLine(point, lineStart, lineEnd) {
    const dx = lineEnd[1] - lineStart[1];
    const dy = lineEnd[0] - lineStart[0];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
        return Math.sqrt(
            Math.pow(point[0] - lineStart[0], 2) +
            Math.pow(point[1] - lineStart[1], 2)
        );
    }

    const t = ((point[0] - lineStart[0]) * dy + (point[1] - lineStart[1]) * dx) / (length * length);
    
    if (t < 0) {
        return Math.sqrt(
            Math.pow(point[0] - lineStart[0], 2) +
            Math.pow(point[1] - lineStart[1], 2)
        );
    }
    
    if (t > 1) {
        return Math.sqrt(
            Math.pow(point[0] - lineEnd[0], 2) +
            Math.pow(point[1] - lineEnd[1], 2)
        );
    }

    const projection = [
        lineStart[0] + t * dy,
        lineStart[1] + t * dx
    ];

    return Math.sqrt(
        Math.pow(point[0] - projection[0], 2) +
        Math.pow(point[1] - projection[1], 2)
    );
}

// Function to create SVG arrow
function createArrow(start, end) {
    const dx = end[1] - start[1];
    const dy = end[0] - start[0];
    const angle = Math.atan2(dy, dx);
    
    return {
        line: [start, end],
        angle: angle * 180 / Math.PI
    };
}

// Function to parse GPX file
async function parseGPX(gpxText) {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
    const trackPoints = gpxDoc.getElementsByTagName('trkpt');
    
    // Extract coordinates from GPX
    const trailPath = Array.from(trackPoints).map(point => [
        parseFloat(point.getAttribute('lat')),
        parseFloat(point.getAttribute('lon'))
    ]);

    return {
        title: gpxDoc.getElementsByTagName('name')[0]?.textContent || 'Trail Map',
        trailPath: trailPath
    };
}

// Function to load settings from JSON and GPX files
async function loadSettings() {
    try {
        // Parse URL parameters to get walk ID
        const urlParams = new URLSearchParams(window.location.search);
        currentWalkId = urlParams.get('id');
        
        if (!currentWalkId) {
            throw new Error('No walk ID specified in URL parameters');
        }
        
        let settings = {
            title: 'Trail Map',
            trailPath: [],
            trailImages: [],
            pointsOfInterest: []
        };

        // Try to load GPX file for trail path
        const gpxResponse = await fetch(`/data/${currentWalkId}/trail.gpx`);
        if (gpxResponse.ok) {
            const gpxText = await gpxResponse.text();
            const gpxData = await parseGPX(gpxText);
            settings.trailPath = gpxData.trailPath;
            settings.title = gpxData.title;
        }

        // Try to load JSON file for images and title (if no GPX title)
        const jsonResponse = await fetch(`/data/${currentWalkId}/walk_settings.json`);
        if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();
            
            // Support the old 'images' array for backward compatibility
            if (jsonData.images && jsonData.images.length > 0) {
                settings.trailImages = jsonData.images;
            }
            
            // Add new image arrays if they exist
            if (jsonData.trailImages && jsonData.trailImages.length > 0) {
                settings.trailImages = jsonData.trailImages;
            }
            
            if (jsonData.pointsOfInterest && jsonData.pointsOfInterest.length > 0) {
                settings.pointsOfInterest = jsonData.pointsOfInterest;
            }
            
            // Store trail images array globally for keyboard navigation
            imagesArray = settings.trailImages;
            
            // Use JSON title if available or if we don't have a GPX title
            if (jsonData.title && (!settings.title || settings.title === 'Trail Map')) {
                settings.title = jsonData.title;
            }
            
            // Add any additional settings from the walk_settings.json
            settings = { ...settings, ...jsonData };
        }

        // Validate that we have at least a trail path
        if (!settings.trailPath.length) {
            throw new Error('No trail path found in either GPX or JSON file');
        }

        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
    }
}

// Function to format coordinates
function formatCoordinates(lat, lng) {
    return `[${lat.toFixed(6)}, ${lng.toFixed(6)}]`;
}

// Function to copy coordinates to clipboard
function copyCoordinates(lat, lng) {
    const coords = formatCoordinates(lat, lng);
    navigator.clipboard.writeText(coords).then(() => {
        const button = coordinatesPopup.getElement().querySelector('button');
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

// Function to show coordinates popup
function showCoordinatesPopup(e) {
    const coords = formatCoordinates(e.latlng.lat, e.latlng.lng);
    const content = `
        <div class="coordinates-popup">
            <div>${coords}</div>
            <button onclick="copyCoordinates(${e.latlng.lat}, ${e.latlng.lng})">Copy coordinates</button>
        </div>
    `;
    
    if (coordinatesPopup) {
        coordinatesPopup.setLatLng(e.latlng);
        coordinatesPopup.setContent(content);
    } else {
        coordinatesPopup = L.popup()
            .setLatLng(e.latlng)
            .setContent(content)
            .addTo(map);
    }
}

// Helper function to convert lat/lng to tile coordinates
function latLngToTile(lat, lng, zoom) {
    // Convert lat/lng to tile coordinates
    const n = Math.pow(2, zoom);
    const xTile = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const yTile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x: xTile, y: yTile };
}

// Function to create a mini map showing the trail and current location
function createMiniMap(coordinates) {
    try {
        // Create mini map container
        const miniMapContainer = document.createElement('div');
        miniMapContainer.className = 'mini-map-container';
        
        // Find the image container to add the mini map to
        const imageContainer = document.querySelector('.image-container');
        if (!imageContainer) {
            console.error('Could not find image container for mini map');
            return;
        }
        
        // Append the mini map container to the image container
        imageContainer.appendChild(miniMapContainer);
        
        // Create mini map div
        const miniMapDiv = document.createElement('div');
        miniMapDiv.className = 'mini-map';
        miniMapContainer.appendChild(miniMapDiv);
        
        // Create the mini map
        const miniMap = L.map(miniMapDiv, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false
        });
        
        // Add a simple tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(miniMap);
        
        // Add the trail path
        if (settings.trailPath && settings.trailPath.length > 0) {
            const trailPathLayer = L.polyline(settings.trailPath, {
                color: '#3388ff',
                weight: 4,
                opacity: 0.7
            }).addTo(miniMap);
            
            // Add a marker for the current image location
            L.circleMarker(coordinates, {
                color: '#e74c3c',
                fillColor: '#e74c3c',
                fillOpacity: 1,
                radius: 5,
                weight: 2
            }).addTo(miniMap);
            
            // Fit the map to show the trail
            miniMap.fitBounds(trailPathLayer.getBounds(), {
                padding: [10, 10]
            });
        } else {
            // If no trail path, just center on the image coordinates
            miniMap.setView(coordinates, 14);
        }
        
        return miniMap;
    } catch (error) {
        console.error('Error creating mini map:', error);
        return null;
    }
}

// Show image popup
function showImagePopup(image, isNavigating = false) {
    try {
        // If not already navigating, update the currentImageIndex
        if (!isNavigating) {
            // Find the current image in the global imagesArray (for trail images)
            currentImageIndex = imagesArray.findIndex(img => 
                img.imageName === image.imageName && 
                img.coordinates[0] === image.coordinates[0] && 
                img.coordinates[1] === image.coordinates[1]);
        }
        
        const popup = document.getElementById('image-popup');
        const popupContent = popup.querySelector('.popup-content');
        const popupImage = popup.querySelector('img');
        const popupNotes = document.getElementById('popup-notes');
        const loadingIndicator = popup.querySelector('.loading-indicator');
        
        // Clear any existing mini map and navigation
        const existingMiniMap = document.querySelector('.mini-map-container');
        if (existingMiniMap) {
            existingMiniMap.remove();
        }
        
        const existingNavigation = document.querySelector('.navigation-controls');
        if (existingNavigation) {
            existingNavigation.remove();
        }
        
        // Remove any existing fullres link
        const existingFullresLink = document.querySelector('.fullres-link');
        if (existingFullresLink) {
            existingFullresLink.remove();
        }
        
        // Set the popup content
        popupImage.classList.add('loading');
        
        // Use thumbnail as the placeholder while loading
        popupImage.src = `/thumbnail/${currentWalkId}/${image.imageName}`;
        
        // Reset any previous error state
        popupImage.classList.remove('error');
        
        // Determine if this is a trail image or point of interest
        // Check if this image belongs to the trail images array
        const isTrailImage = currentImageIndex >= 0;
        
        // Set notes with image number for trail images
        if (isTrailImage) {
            // Create notes with sequence number
            const sequenceNum = currentImageIndex + 1;
            popupNotes.innerHTML = `<span class="image-sequence">${sequenceNum}</span>${image.notes || ''}`;
        } else {
            // For POIs, just show the notes
            popupNotes.textContent = image.notes || '';
        }
        
        // Show the popup
        popup.style.display = 'block';
        
        // Make the popup image clickable to show fullscreen version
        const imageContainer = document.querySelector('.image-container');
        
        // Add new click handler for the image
        popupImage.onclick = function(e) {
            e.stopPropagation(); // Prevent closing the popup
            showFullscreenImage(image.imageName);
        };
        
        // Add cursor style to indicate clickability
        popupImage.style.cursor = 'zoom-in';
        
        // Add fullres link to open original image in new tab
        const fullresLink = document.createElement('a');
        fullresLink.className = 'fullres-link';
        fullresLink.href = 'javascript:void(0)'; // No longer use a direct link
        fullresLink.title = 'View full resolution image';
        fullresLink.setAttribute('aria-label', 'View full resolution image');
        
        // Add SVG icon for fullscreen/expand
        fullresLink.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M21 11V3h-8v2h4.6L12 10.6 13.4 12 19 6.4V11h2zm-6 10H3V9h8V7H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-2v8z"/>
            </svg>
        `;
        
        // Handle click to show fullscreen image
        fullresLink.addEventListener('click', function(e) {
            e.stopPropagation();
            showFullscreenImage(image.imageName);
        });
        
        // Add to container
        imageContainer.appendChild(fullresLink);
        
        // Create mini map with the trail path and current location
        if (map && settings.trailPath) {
            createMiniMap(image.coordinates);
        }
        
        // Only show navigation controls for trail images, not for POIs
        let navigationHtml = '';
        if (isTrailImage && imagesArray && imagesArray.length > 1) {
            navigationHtml = createNavigationHtml();
        }
        
        if (navigationHtml) {
            popupContent.insertAdjacentHTML('beforeend', navigationHtml);
        }
        
        // Customize loading message
        loadingIndicator.textContent = 'Loading full image...';
        
        // Load the scaled image in the background
        const fullImage = new Image();
        fullImage.onload = function() {
            // Replace placeholder with full image once loaded
            popupImage.src = this.src;
            popupImage.classList.remove('loading');
            console.log('Successfully loaded full image:', image.imageName);
        };
        
        fullImage.onerror = function(event) {
            // Add more diagnostic information
            console.error('Error loading full image:', image.imageName, 'from URL:', this.src);
            console.error('Error event details:', event);
            
            // Try loading the image directly from the /data path as a fallback
            const directImageUrl = `/data/${currentWalkId}/images/${image.imageName}`;
            console.log('Attempting fallback with direct image path:', directImageUrl);
            
            const fallbackImage = new Image();
            fallbackImage.onload = function() {
                // Replace with direct image path if that works
                popupImage.src = this.src;
                popupImage.classList.remove('loading');
                console.log('Successfully loaded image from fallback path');
            };
            
            fallbackImage.onerror = function() {
                // Keep thumbnail as fallback but remove loading state
                console.error('Fallback image also failed to load');
                popupImage.classList.remove('loading');
                popupImage.classList.add('error');
                
                loadingIndicator.textContent = 'Failed to load full image';
                setTimeout(() => {
                    loadingIndicator.style.opacity = '0';
                }, 2000);
                popupNotes.textContent = (image.notes || '') + ' (Full image could not be loaded)';
            };
            
            fallbackImage.src = directImageUrl;
        };
        
        // Start loading the scaled image instead of full image
        console.log('Starting to load scaled image:', `/scaled-image/${currentWalkId}/${image.imageName}`);
        fullImage.src = `/scaled-image/${currentWalkId}/${image.imageName}`;
        
    } catch (error) {
        console.error('Error in showImagePopup:', error);
        // Fallback to simple display if anything goes wrong
        popupImage.src = `/thumbnail/${currentWalkId}/${image.imageName}`;
        popupNotes.textContent = image.notes || '';
        popupImage.classList.remove('loading');
    }
}

// Helper function to create navigation indicators
function createNavigationHtml() {
    if (imagesArray.length <= 1 || currentImageIndex < 0) return '';
    
    const totalImages = imagesArray.length;
    const isPrevDisabled = currentImageIndex === 0;
    const isNextDisabled = currentImageIndex === totalImages - 1;
    
    return `
    <div class="navigation-controls">
        <div class="nav-info">${currentImageIndex + 1} of ${totalImages}</div>
        <div class="nav-buttons">
            <button class="nav-prev" onclick="navigateImage(${currentImageIndex - 1})" ${isPrevDisabled ? 'disabled' : ''}>« Previous</button>
            <button class="nav-next" onclick="navigateImage(${currentImageIndex + 1})" ${isNextDisabled ? 'disabled' : ''}>Next »</button>
        </div>
        <div class="keyboard-shortcuts">Keyboard: ← previous | → next | ESC or Enter close</div>
    </div>
    `;
}

// Function to navigate between images
function navigateImage(index) {
    // Check if the index is valid (within bounds)
    if (index >= 0 && index < imagesArray.length) {
        currentImageIndex = index;
        showImagePopup(imagesArray[index], true);
    }
}

// Handle keyboard navigation
function handleKeyNavigation(e) {
    const popup = document.getElementById('image-popup');
    
    // Only process keyboard events when popup is visible
    if (popup.style.display !== 'block') return;
    
    // First handle keys that should work for all popups
    if (e.key === 'Escape' || e.key === 'Enter') {
        // Close popup with Escape or Enter keys
        popup.style.display = 'none';
        e.preventDefault();
        return;
    }
    
    // Only handle navigation keys for trail images
    if (!imagesArray || imagesArray.length <= 1 || currentImageIndex < 0) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            // Previous image (if not at the first image)
            if (currentImageIndex > 0) {
                navigateImage(currentImageIndex - 1);
                e.preventDefault();
            }
            break;
            
        case 'ArrowRight':
            // Next image (if not at the last image)
            if (currentImageIndex < imagesArray.length - 1) {
                navigateImage(currentImageIndex + 1);
                e.preventDefault();
            }
            break;
    }
}

// Function to show a full resolution image in a fullscreen popup
function showFullscreenImage(imageName) {
    const fullscreenPopup = document.getElementById('fullscreen-popup');
    const fullscreenImage = document.getElementById('fullscreen-image');
    
    // Set loading state
    fullscreenImage.style.opacity = '0.5';
    
    // Start loading the full resolution image
    fullscreenImage.onload = function() {
        fullscreenImage.style.opacity = '1';
    };
    
    // Set the source to the original full-size image
    fullscreenImage.src = `/data/${currentWalkId}/images/${imageName}`;
    
    // Show the popup
    fullscreenPopup.style.display = 'block';
}

// Function to hide the fullscreen popup
function hideFullscreenPopup() {
    const fullscreenPopup = document.getElementById('fullscreen-popup');
    fullscreenPopup.style.display = 'none';
}

// Function to setup the map with trail path and markers
function setupMap() {
    // Create the map with zoom control disabled
    map = L.map('map', {
        zoomControl: false
    });
    
    // Define map layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google'
    });

    const hybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '© Google'
    });

    // Add LINZ imagery layer (direct connection with enhanced error handling)
    const linzApiKey = 'LINZ_API_KEY_PLACEHOLDER';
    const linzDemoKey = 'd01jrm3t2gzdycm5j8rh03e69fw'; // Demo key as fallback
    
    // Track errors to avoid repeated failures
    const failedTiles = {};
    
    const linzLayer = L.tileLayer('https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/{z}/{x}/{y}.webp?api={api}', {
        api: encodeURIComponent(linzApiKey),
        attribution: '© <a href="//www.linz.govt.nz/linz-copyright">LINZ CC BY 4.0</a> © <a href="//www.linz.govt.nz/data/linz-data/linz-basemaps/data-attribution">Imagery Basemap contributors</a>',
        maxZoom: 19,
        bounds: [[-47.5, 166.5], [-34.0, 178.5]], // New Zealand bounds
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Transparent tile fallback
        crossOrigin: true,
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false
    });
    
    // Enhance the tile loading to capture every response via fetch
    const originalCreateTile = linzLayer.createTile;
    linzLayer.createTile = function(coords, done) {
        const key = `${coords.z}_${coords.x}_${coords.y}`;
        
        // Check if this tile has failed multiple times with primary key
        if (failedTiles[key] && failedTiles[key].failures > 0) {
            // Use demo key for previously failed tiles
            this.options.api = encodeURIComponent(linzDemoKey);
        } else {
            // Use primary key
            this.options.api = encodeURIComponent(linzApiKey);
        }
        
        const tile = originalCreateTile.call(this, coords, function(err, tile) {
            if (err) {
                console.error(`Tile error for ${key}: ${err}`);
                
                // Try to fetch the tile directly to get exact error
                const url = `https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/${coords.z}/${coords.x}/${coords.y}.webp?api=${encodeURIComponent(linzApiKey)}`;
                
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => {
                                const errorMsg = `LINZ API Error (${response.status}): ${text || 'Unknown error'}`;
                                console.error(errorMsg);
                                
                                // Track this failure
                                if (!failedTiles[key]) {
                                    failedTiles[key] = { failures: 0 };
                                }
                                failedTiles[key].failures++;
                                failedTiles[key].lastError = errorMsg;
                                
                                // If it keeps failing, log diagnostics
                                if (failedTiles[key].failures > 2) {
                                    console.warn(`Persistent failure for tile ${key}:`, failedTiles[key]);
                                }
                            });
                        }
                    })
                    .catch(e => console.error('Error fetching tile data:', e));
            }
            
            done(err, tile);
        });
        
        return tile;
    };
    
    // Add debugging for LINZ layer
    linzLayer.on('tileerror', function(error) {
        // Log the original URL, not the fallback transparent image
        const originalUrl = error.tile._url || error.tile.src;
        console.error('LINZ tile error URL:', originalUrl);
        
        // Check if we're in NZ bounds - if not, this is expected
        if (error.coords) {
            const z = error.coords.z;
            const x = error.coords.x;
            const y = error.coords.y;
            const key = `${z}_${x}_${y}`;
            
            // NZ bounds in lat/lng
            const nzBounds = [[-47.5, 166.5], [-34.0, 178.5]];
            
            // Convert NZ bounds to tile coordinates at the current zoom level
            const nwTile = latLngToTile(nzBounds[1][0], nzBounds[0][1], z); // Northwest corner (top-left)
            const seTile = latLngToTile(nzBounds[0][0], nzBounds[1][1], z); // Southeast corner (bottom-right)
            
            // Check if the tile is within NZ bounds
            const inNZ = x >= nwTile.x && x <= seTile.x && 
                        y >= nwTile.y && y <= seTile.y;
                        
            if (!inNZ) {
                console.log(`Tile (${x},${y},${z}) outside of New Zealand bounds - expected to fail`);
                return;
            }
            
            console.log(`Tile (${x},${y},${z}) is within New Zealand but failed to load`);
            
            // Only try fallback logic if we haven't tried multiple times already
            if (!failedTiles[key] || failedTiles[key].failures <= 1) {
                // Try with demo key if this is the first or second failure
                if (linzApiKey !== linzDemoKey) {
                    console.log(`Trying with demo API key for tile ${key}...`);
                    
                    // Update tracking
                    if (!failedTiles[key]) {
                        failedTiles[key] = { failures: 1 };
                    }
                    
                    // Replace the current API key with the demo key
                    const currentKey = encodeURIComponent(linzApiKey);
                    const demoKeyEncoded = encodeURIComponent(linzDemoKey);
                    
                    // Get the original URL before any modifications
                    let urlToUse = originalUrl;
                    if (!urlToUse) {
                        // Construct URL if original is not available
                        urlToUse = `https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/${z}/${x}/${y}.webp?api=${currentKey}`;
                    }
                    
                    // Replace the API key
                    const newSrc = urlToUse.replace(
                        new RegExp(`api=${currentKey}(&|$)`), 
                        `api=${demoKeyEncoded}$1`
                    );
                    
                    if (newSrc !== error.tile.src) {
                        error.tile.src = newSrc;
                        return;
                    }
                }
            }
        }
    });
    
    linzLayer.on('tileload', function(tile) {
        console.log('LINZ tile loaded successfully', tile.coords);
    });

    // Add layer control
    const baseMaps = {
        "LINZ Aerial": linzLayer,
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer,
        "Hybrid": hybridLayer
    };

    // Add default layer (LINZ)
    linzLayer.addTo(map);

    // Add layer control to map - position it at the bottom right
    L.control.layers(baseMaps, null, {
        collapsed: false,
        position: 'bottomright'
    }).addTo(map);

    // Draw the trail path
    const trailLine = L.polyline(settings.trailPath, {
        color: 'var(--main-color, #3498db)',
        weight: 4,
        opacity: 0.8,
        className: 'trailPath'
    }).addTo(map);

    // Add right-click handler for coordinates
    map.on('contextmenu', function(e) {
        const coords = formatCoordinates(e.latlng.lat, e.latlng.lng);
        const content = `
            <div class="coordinates-popup">
                <div>${coords}</div>
                <button onclick="copyCoordinates(${e.latlng.lat}, ${e.latlng.lng})">Copy coordinates</button>
            </div>
        `;
        
        if (coordinatesPopup) {
            coordinatesPopup.remove();
        }
        
        coordinatesPopup = L.popup()
            .setLatLng(e.latlng)
            .setContent(content)
            .addTo(map);
    });

    // Calculate bounds from the trail path coordinates
    const bounds = L.latLngBounds(settings.trailPath);
    
    // Add 20% buffer to the bounds
    const bufferedBounds = bounds.pad(0.2);
    
    // Fit the map to the buffered bounds
    map.fitBounds(bufferedBounds);

    // Keep track of existing markers to prevent overlaps
    const existingMarkers = [];

    // Add trail image markers if we have them in the settings
    if (settings.trailImages && settings.trailImages.length > 0) {
        // Set the global imagesArray to the trail images for navigation
        imagesArray = settings.trailImages;
        
        settings.trailImages.forEach((image, index) => {
            // Calculate offset coordinates to avoid overlapping with trail and other markers
            const offsetCoords = getOffsetCoordinates(image.coordinates, settings.trailPath, existingMarkers);
            
            // Add this marker to the list of existing markers
            existingMarkers.push({
                coords: offsetCoords
            });
            
            // Create custom icon for thumbnail with image number overlay
            const thumbnailIcon = L.divIcon({
                className: 'custom-icon',
                html: `
                    <div style="position: relative;">
                        <img src="/thumbnail/${currentWalkId}/${image.imageName}" alt="Trail Image">
                        <div class="image-number">${index + 1}</div>
                    </div>
                `,
                iconSize: [55, 55],
                iconAnchor: [27, 27]
            });

            // Create marker for thumbnail
            const thumbnailMarker = L.marker(offsetCoords, { icon: thumbnailIcon });
            
            // Create marker for actual location
            const locationMarker = L.marker(image.coordinates, {
                icon: L.divIcon({
                    className: 'location-marker',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                })
            });

            // Create line from thumbnail to location
            const connectionLine = L.polyline([offsetCoords, image.coordinates], {
                color: '#e74c3c',
                weight: 2,
                opacity: 0.8
            });
            
            // Store the index with the image for reference
            image.index = index;
            
            // Add click handler to thumbnail
            thumbnailMarker.on('click', () => {
                showImagePopup(image, false);
            });
            
            // Add all elements to the map
            locationMarker.addTo(map);
            connectionLine.addTo(map);
            thumbnailMarker.addTo(map);
        });
    }
    
    // Add points of interest if we have them
    if (settings.pointsOfInterest && settings.pointsOfInterest.length > 0) {
        settings.pointsOfInterest.forEach(poi => {
            // Calculate offset coordinates to avoid overlapping with trail and other markers
            const offsetCoords = getOffsetCoordinates(poi.coordinates, settings.trailPath, existingMarkers);
            
            // Add this marker to the list of existing markers
            existingMarkers.push({
                coords: offsetCoords
            });
            
            // Create custom icon for thumbnail with grayscale effect
            const thumbnailIcon = L.divIcon({
                className: 'custom-icon poi-icon',
                html: `<img src="/thumbnail/${currentWalkId}/${poi.imageName}" alt="Point of Interest" class="poi-thumbnail">`,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            });

            // Create marker for thumbnail
            const thumbnailMarker = L.marker(offsetCoords, { icon: thumbnailIcon });
            
            // Create marker for actual location with different style
            const locationMarker = L.marker(poi.coordinates, {
                icon: L.divIcon({
                    className: 'location-marker poi-location',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                })
            });

            // Create line from thumbnail to location with different style
            const connectionLine = L.polyline([offsetCoords, poi.coordinates], {
                color: '#95a5a6', // Gray color for POI
                weight: 2,
                opacity: 0.7,
                dashArray: '5, 5' // Dashed line for POI
            });
            
            // Add click handler to thumbnail for point of interest
            thumbnailMarker.on('click', () => {
                // Temporarily store the current imagesArray
                const tempImagesArray = imagesArray;
                
                // Set navigation index to -1 to disable nav controls for POIs
                currentImageIndex = -1;
                
                // Show the POI popup
                showImagePopup(poi, false);
                
                // Restore the original imagesArray
                imagesArray = tempImagesArray;
            });
            
            // Add all elements to the map
            locationMarker.addTo(map);
            connectionLine.addTo(map);
            thumbnailMarker.addTo(map);
        });
    }
}

// Function to initialize the map and load data
async function initialize() {
    try {
        // Get application version - will be replaced by the docker-entrypoint.sh script
        const APP_VERSION = 'v1.0.0';
        const BUILD_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        document.getElementById('version-display').textContent = `${APP_VERSION} (${BUILD_DATE})`;
        
        // Load settings from GPX and JSON files
        settings = await loadSettings();
        
        // Update the page title with the trail name
        document.getElementById('page-title').textContent = settings.title;
        
        // Load site configuration if not already loaded by the inline script
        if (!document.body.classList.contains('dark-theme')) {
            await loadSiteConfig();
        }
        
        // Set up map with trail path and markers
        setupMap();

        // Show the Start Tour button if we have trail images
        setupStartTourButton();
        
        // Add keyboard navigation handlers
        document.addEventListener('keydown', handleKeyNavigation);
        
        // Add fullscreen popup close button handler
        document.querySelector('.fullscreen-close').addEventListener('click', hideFullscreenPopup);
        
        // Close fullscreen popup when clicking outside the image
        document.getElementById('fullscreen-popup').addEventListener('click', function(e) {
            if (e.target === this) {
                hideFullscreenPopup();
            }
        });
        
    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('map').innerHTML = `
            <div class="error-message">
                Error loading map: ${error.message}<br>
                <a href="/">Return to home page</a>
            </div>
        `;
    }
}

// Function to start the trail tour by showing the first image
function startTour() {
    if (imagesArray && imagesArray.length > 0) {
        // Set current image index to 0 (first image)
        currentImageIndex = 0;
        
        // Show the first image popup
        showImagePopup(imagesArray[0], true);
    }
}

// Function to setup the Start Tour button
function setupStartTourButton() {
    const startTourButton = document.getElementById('start-tour-button');
    
    // Only show the button if we have trail images
    if (imagesArray && imagesArray.length > 0) {
        startTourButton.style.display = 'flex';
        
        // Add click event listener
        startTourButton.addEventListener('click', startTour);
    } else {
        startTourButton.style.display = 'none';
    }
}

// Function to load site configuration
async function loadSiteConfig() {
    try {
        // Reset CSS variables to defaults first to ensure clean state
        document.documentElement.style.setProperty('--main-background', '#f5f5f5');
        document.documentElement.style.setProperty('--main-color', '#3498db');
        
        const response = await fetch('/api/site-config');
        if (response.ok) {
            siteConfig = await response.json();
            
            // Add class to indicate site config is loaded
            document.documentElement.classList.add('config-loaded');
            
            // Apply site name to page title - add walk name
            document.title = `${settings.title} - ${siteConfig.siteName}`;
            
            // Apply theme
            if (siteConfig.theme) {
                // Apply theme colors directly to CSS variables
                if (siteConfig.theme.mainBackground) {
                    document.documentElement.style.setProperty('--main-background', siteConfig.theme.mainBackground);
                    // Add the dark-theme class to get text contrast right
                    document.body.classList.add('dark-theme');
                }
                
                if (siteConfig.theme.mainColor) {
                    document.documentElement.style.setProperty('--main-color', siteConfig.theme.mainColor);
                }
                
                // Log for debugging
                console.log('Applied theme colors', siteConfig.theme);
            }
        }
    } catch (error) {
        console.error('Error loading site configuration:', error);
        // Continue with defaults
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get application version - will be replaced by the docker-entrypoint.sh script
    const APP_VERSION = 'v1.0.0';
    const BUILD_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    document.getElementById('version-display').textContent = `${APP_VERSION} (${BUILD_DATE})`;
    
    // Close popup when clicking anywhere
    document.getElementById('image-popup').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Set up fullscreen popup event handlers
    const fullscreenPopup = document.getElementById('fullscreen-popup');
    
    // Close fullscreen popup when clicking on the background
    fullscreenPopup.addEventListener('click', function(e) {
        if (e.target === this) {
            hideFullscreenPopup();
        }
    });
    
    // Close fullscreen popup when clicking the close button
    const closeButton = document.querySelector('.fullscreen-close');
    if (closeButton) {
        closeButton.addEventListener('click', hideFullscreenPopup);
    }
    
    // Close fullscreen popup with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && fullscreenPopup.style.display === 'block') {
            hideFullscreenPopup();
        }
    });
    
    // Add keyboard event listener for navigation
    document.addEventListener('keydown', handleKeyNavigation);

    // Initialize the map
    initialize();
}); 
