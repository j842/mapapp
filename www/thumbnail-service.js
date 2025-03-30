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
const METADATA_DIR = path.resolve('/thumbnails/metadata');

// Ensure directories exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}
if (!fs.existsSync(METADATA_DIR)) {
  fs.mkdirSync(METADATA_DIR, { recursive: true });
}

// Middleware to parse JSON
app.use(express.json());

// Route to serve the original images
app.use('/data/images', express.static(IMAGES_DIR));

// Route to serve the thumbnails
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

// Endpoint to get image metadata
app.get('/image-info/:filename', async (req, res) => {
  const { filename } = req.params;
  
  // Clean the filename to prevent path traversal
  const sanitizedFilename = path.basename(filename);
  const metadataPath = path.join(METADATA_DIR, `${sanitizedFilename}.json`);
  
  try {
    // Check if metadata exists
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      return res.json(metadata);
    }
    
    // If not, process the image and create metadata
    const originalPath = path.join(IMAGES_DIR, sanitizedFilename);
    
    // Check if original image exists
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Original image not found' });
    }
    
    // Get image metadata
    const metadata = await sharp(originalPath).metadata();
    
    // Save relevant information
    const imageInfo = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      aspectRatio: metadata.width / metadata.height
    };
    
    // Save metadata to file
    fs.writeFileSync(metadataPath, JSON.stringify(imageInfo));
    
    // Return the metadata
    res.json(imageInfo);
  } catch (error) {
    console.error('Error getting image metadata:', error);
    res.status(500).json({ error: 'Error processing image metadata' });
  }
});

// Endpoint to generate and serve thumbnails
app.get('/thumbnail/:filename', async (req, res) => {
  const { filename } = req.params;
  
  // Clean the filename to prevent path traversal
  const sanitizedFilename = path.basename(filename);
  
  // Paths for original, thumbnail, and metadata
  const originalPath = path.join(IMAGES_DIR, sanitizedFilename);
  const thumbnailPath = path.join(THUMBNAILS_DIR, sanitizedFilename);
  const metadataPath = path.join(METADATA_DIR, `${sanitizedFilename}.json`);
  
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
    
    // Process the image
    const image = sharp(originalPath);
    
    // Get metadata and store it
    const metadata = await image.metadata();
    const imageInfo = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      aspectRatio: metadata.width / metadata.height
    };
    
    // Save metadata to file
    fs.writeFileSync(metadataPath, JSON.stringify(imageInfo));
    
    // Generate thumbnail
    await image.clone().resize(50, 50, { fit: 'cover' }).toFile(thumbnailPath);
    
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