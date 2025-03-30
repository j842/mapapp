const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { promisify } = require('util');

const app = express();
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const PORT = process.env.PORT || 3000;

// Serve static files with caching
app.use(express.static('www', {
    maxAge: '7d', // Cache static assets for 7 days
    setHeaders: function(res, path) {
        // Add specific cache headers for different file types
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg') || 
                  path.endsWith('.png') || path.endsWith('.webp') || 
                  path.endsWith('.svg') || path.endsWith('.ico')) {
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
        } else if (path.endsWith('.html')) {
            // Don't cache HTML files
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Helper function to check if path is a directory
async function isDirectory(path) {
    try {
        const stats = await stat(path);
        return stats.isDirectory();
    } catch (err) {
        return false;
    }
}

// Make sure the data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    console.error(`Error: Data directory not found at ${DATA_DIR}`);
    // Create the data directory as a fallback
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`Created data directory at ${DATA_DIR}`);
    } catch (err) {
        console.error(`Failed to create data directory: ${err.message}`);
    }
}

// API endpoint for getting the list of walks
app.get('/api/walks', async (req, res) => {
    try {
        console.log(`Looking for walks in ${DATA_DIR}`);
        
        // Check if data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            console.error(`Data directory not found at ${DATA_DIR}`);
            return res.status(500).json({ error: 'Data directory not found' });
        }
        
        // Set cache headers (1 hour)
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        const entries = await readdir(DATA_DIR);
        console.log(`Found ${entries.length} entries in data directory`);
        
        // Only include directories that have a walk_settings.json file
        const walks = [];
        
        for (const entry of entries) {
            const entryPath = path.join(DATA_DIR, entry);
            console.log(`Checking entry: ${entryPath}`);
            
            if (await isDirectory(entryPath)) {
                // Check for walk_settings.json
                const settingsPath = path.join(entryPath, 'walk_settings.json');
                console.log(`Looking for settings at: ${settingsPath}`);
                
                if (fs.existsSync(settingsPath)) {
                    console.log(`Found valid walk: ${entry}`);
                    walks.push(entry);
                } else {
                    console.log(`Missing walk_settings.json in ${entry}`);
                }
            } else {
                console.log(`${entry} is not a directory`);
            }
        }
        
        console.log(`Returning ${walks.length} valid walks`);
        res.json(walks);
    } catch (err) {
        console.error('Error fetching walks:', err);
        res.status(500).json({ error: err.message });
    }
});

// Thumbnail generator (cacheable)
app.get('/thumbnail/:walkId/:image', async (req, res) => {
    try {
        const { walkId, image } = req.params;
        const imagePath = path.join(DATA_DIR, walkId, 'images', image);
        
        // Check if image exists
        if (!fs.existsSync(imagePath)) {
            console.error(`Image not found: ${imagePath}`);
            return res.status(404).send('Image not found');
        }
        
        // Set cache headers (1 day)
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        // Generate thumbnail
        const thumbnail = await sharp(imagePath)
            .resize(200, 200, { fit: 'cover' })
            .toBuffer();
            
        res.contentType('image/jpeg');
        res.send(thumbnail);
    } catch (err) {
        console.error('Error generating thumbnail:', err);
        res.status(500).send('Error generating thumbnail');
    }
});

// Image info endpoint
app.get('/image-info/:walkId/:image', async (req, res) => {
    try {
        const { walkId, image } = req.params;
        const imagePath = path.join(DATA_DIR, walkId, 'images', image);
        
        // Check if image exists
        if (!fs.existsSync(imagePath)) {
            console.error(`Image not found: ${imagePath}`);
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // Set cache headers (7 days)
        res.setHeader('Cache-Control', 'public, max-age=604800');
        
        // Get image metadata
        const metadata = await sharp(imagePath).metadata();
        
        // Calculate aspect ratio
        const aspectRatio = metadata.width / metadata.height;
        
        res.json({
            width: metadata.width,
            height: metadata.height,
            aspectRatio: aspectRatio,
            format: metadata.format
        });
    } catch (err) {
        console.error('Error getting image info:', err);
        res.status(500).json({ error: err.message });
    }
});

// Serve data files directly
app.use('/data', express.static(DATA_DIR, {
    maxAge: '7d', // Cache for 7 days
    setHeaders: function(res, path) {
        // For images, allow caching for 30 days
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || 
            path.endsWith('.png') || path.endsWith('.webp')) {
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
        }
        // For JSON files, shorter cache time
        else if (path.endsWith('.json')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    }
}));

// Serve the walk.html for walk-specific routes
app.get('/walk.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'www', 'walk.html'));
});

// Redirect root to index for the multi-walk view
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// API endpoint for getting walk info including file dates
app.get('/api/walk-info/:walkId', async (req, res) => {
    try {
        const { walkId } = req.params;
        const settingsPath = path.join(DATA_DIR, walkId, 'walk_settings.json');
        
        if (!fs.existsSync(settingsPath)) {
            return res.status(404).json({ error: 'Walk settings not found' });
        }
        
        // Set cache headers (1 day)
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        // Get file stats
        const stats = await stat(settingsPath);
        const lastModified = stats.mtime;
        const created = stats.birthtime;
        
        res.json({
            id: walkId,
            lastModified: lastModified,
            created: created
        });
    } catch (err) {
        console.error(`Error getting walk info for ${req.params.walkId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
}); 