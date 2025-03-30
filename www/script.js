let map;
let settings;
let coordinatesPopup;

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
        let settings = {
            title: 'Trail Map',
            trailPath: [],
            images: []
        };

        // Try to load GPX file for trail path
        const gpxResponse = await fetch('data/trail.gpx');
        if (gpxResponse.ok) {
            const gpxText = await gpxResponse.text();
            const gpxData = await parseGPX(gpxText);
            settings.trailPath = gpxData.trailPath;
            settings.title = gpxData.title;
        }

        // Try to load JSON file for images and title (if no GPX title)
        const jsonResponse = await fetch('data/walk_settings.json');
        if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();
            settings.images = jsonData.images || [];
            // Only use JSON title if we don't have a GPX title
            if (!settings.trailPath.length) {
                settings.title = jsonData.title;
            }
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

// Show image popup
async function showImagePopup(image) {
    const popup = document.getElementById('image-popup');
    const popupContent = document.querySelector('.popup-content');
    const popupImage = document.getElementById('popup-image');
    const popupNotes = document.getElementById('popup-notes');
    const loadingIndicator = document.querySelector('.loading-indicator');
    const imageContainer = document.querySelector('.image-container');
    
    // Reset classes
    popupImage.classList.remove('loading', 'error');
    
    // Reset container styles
    imageContainer.style.width = '';
    imageContainer.style.height = '';
    
    // Display popup immediately with loading state
    popup.style.display = 'block';
    
    // Set loading state
    popupImage.classList.add('loading');
    
    // Set current thumbnail as temporary placeholder
    popupImage.src = `/thumbnail/${image.imageName}`;
    
    // Set notes
    popupNotes.textContent = image.notes || 'Loading...';
    
    // Customize loading message
    loadingIndicator.textContent = 'Loading full image...';
    
    try {
        // Fetch image dimensions first
        const response = await fetch(`/image-info/${image.imageName}`);
        if (response.ok) {
            const imageInfo = await response.json();
            
            // Calculate the right dimensions for the container
            const viewportWidth = window.innerWidth * 0.8; // 80% of viewport width
            const viewportHeight = window.innerHeight * 0.7; // 70% of viewport height
            
            // Calculate dimensions while maintaining aspect ratio
            let width, height;
            
            if (imageInfo.width > imageInfo.height) {
                // Landscape image
                width = Math.min(imageInfo.width, viewportWidth);
                height = width / imageInfo.aspectRatio;
                
                // Check if height exceeds viewport height
                if (height > viewportHeight) {
                    height = viewportHeight;
                    width = height * imageInfo.aspectRatio;
                }
            } else {
                // Portrait or square image
                height = Math.min(imageInfo.height, viewportHeight);
                width = height * imageInfo.aspectRatio;
                
                // Check if width exceeds viewport width
                if (width > viewportWidth) {
                    width = viewportWidth;
                    height = width / imageInfo.aspectRatio;
                }
            }
            
            // Set dimensions on the container (with some padding)
            imageContainer.style.width = `${Math.round(width)}px`;
            imageContainer.style.height = `${Math.round(height)}px`;
        }
    } catch (error) {
        console.error('Error fetching image dimensions:', error);
    }
    
    // Load the full image in the background
    const fullImage = new Image();
    fullImage.onload = function() {
        // Replace placeholder with full image once loaded
        popupImage.src = this.src;
        popupImage.classList.remove('loading');
    };
    
    fullImage.onerror = function() {
        console.error('Error loading full image:', image.imageName);
        // Keep thumbnail as fallback if full image fails to load
        popupImage.classList.remove('loading');
        popupImage.classList.add('error');
        loadingIndicator.textContent = 'Failed to load full image';
        setTimeout(() => {
            loadingIndicator.style.opacity = '0';
        }, 2000);
        popupNotes.textContent = (image.notes || '') + ' (Full image could not be loaded)';
    };
    
    // Start loading the full image
    fullImage.src = `data/images/${image.imageName}`;
}

// Initialize the map and load settings
async function initialize() {
    try {
        settings = await loadSettings();
        
        document.getElementById('page-title').textContent = settings.title;
        
        // Create the map
        map = L.map('map');
        
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

        // Add layer control to map
        L.control.layers(baseMaps, null, {
            collapsed: false
        }).addTo(map);

        // Draw the trail path
        const trailLine = L.polyline(settings.trailPath, {
            color: '#3498db',
            weight: 4,
            opacity: 0.8
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

        // Only add image markers if we have images in the settings
        if (settings.images && settings.images.length > 0) {
            // Keep track of existing markers to prevent overlaps
            const existingMarkers = [];

            settings.images.forEach(image => {
                // Calculate offset coordinates to avoid overlapping with trail and other markers
                const offsetCoords = getOffsetCoordinates(image.coordinates, settings.trailPath, existingMarkers);
                
                // Add this marker to the list of existing markers
                existingMarkers.push({
                    coords: offsetCoords
                });
                
                // Create custom icon for thumbnail
                const thumbnailIcon = L.divIcon({
                    className: 'custom-icon',
                    html: `<img src="/thumbnail/${image.imageName}" alt="Trail Image">`,
                    iconSize: [50, 50],
                    iconAnchor: [25, 25]
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
                
                // Add click handler to thumbnail
                thumbnailMarker.on('click', () => showImagePopup(image));
                
                // Add all elements to the map
                locationMarker.addTo(map);
                connectionLine.addTo(map);
                thumbnailMarker.addTo(map);
            });
        }
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Close popup when clicking anywhere
    document.getElementById('image-popup').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });

    // Initialize the map
    initialize();
}); 