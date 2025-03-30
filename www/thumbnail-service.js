const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure paths
const DATA_DIR = path.resolve('/data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const THUMBNAILS_DIR = path.resolve('/thumbnails');

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// Middleware to parse JSON
app.use(express.json());

// Route to serve the original images
app.use('/data/images', express.static(IMAGES_DIR));

// Route to serve the thumbnails
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

// Endpoint to generate and serve thumbnails
app.get('/thumbnail/:filename', async (req, res) => {
  const { filename } = req.params;
  
  // Clean the filename to prevent path traversal
  const sanitizedFilename = path.basename(filename);
  
  // Paths for original and thumbnail
  const originalPath = path.join(IMAGES_DIR, sanitizedFilename);
  const thumbnailPath = path.join(THUMBNAILS_DIR, sanitizedFilename);
  
  try {
    // Check if thumbnail already exists
    if (fs.existsSync(thumbnailPath)) {
      // Serve the existing thumbnail
      return res.sendFile(thumbnailPath);
    }
    
    // Check if original image exists
    if (!fs.existsSync(originalPath)) {
      return res.status(404).send('Original image not found');
    }
    
    // Generate thumbnail
    await sharp(originalPath)
      .resize(50, 50, { fit: 'cover' })
      .toFile(thumbnailPath);
    
    // Serve the newly created thumbnail
    res.sendFile(thumbnailPath);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).send('Error generating thumbnail');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Thumbnail service running on port ${PORT}`);
});

module.exports = app; // For testing 