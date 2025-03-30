# Trail Map Viewer

An interactive web application for visualizing hiking trails with photos taken along the route.

## Overview

Trail Map Viewer is a containerized web application that displays GPX trail data and geotagged photos on an interactive map. It's perfect for documenting hiking adventures, planning routes, or sharing outdoor experiences with others.

## Features

- **Interactive Trail Display**: Visualize hiking routes from GPX files on multiple map layers
- **Photo Integration**: Display photos taken along the trail with their exact locations
- **Multiple Base Maps**: Toggle between LINZ aerial imagery, OpenStreetMap, Google Satellite, and Google Hybrid maps
- **Optimized Image Handling**:
  - On-demand thumbnail generation with server-side caching
  - Responsive image loading with placeholder thumbnails while full images load
  - Proper sizing and scaling of images for smooth transitions
- **Geographical Tools**: Easily copy coordinates with right-click functionality
- **Mobile-Friendly**: Responsive design works well on all device sizes
- **Docker-Based**: Runs entirely in a Docker container for easy deployment
- **Nginx + Node.js**: Serves static content with Nginx and handles dynamic image processing with Node.js
- **LINZ Integration**: Uses LINZ (Land Information New Zealand) aerial imagery with customizable API key

## Getting Started

1. **Prerequisites**: Docker installed on your system
2. **Setup Data**:
   - Place GPX trail data in `data/trail.gpx`
   - Add trail images to `data/images/`
   - Configure image metadata in `data/walk_settings.json`

3. **Build the Container**:
   ```
   ./build.sh
   ```

4. **Run the Application**:
   ```
   ./run.sh [port]
   ```
   Default port is 8080 if not specified.

5. **Using a Custom LINZ API Key** (Optional):
   ```
   LINZ_API_KEY=your-key-here ./run.sh
   ```
   If no key is provided, the demo key will be used.

## Data Format

The application expects a `walk_settings.json` file with the following structure:

```json
{
  "title": "Your Trail Name",
  "images": [
    {
      "coordinates": [-41.2865, 174.7762],
      "imageName": "image1.jpg",
      "notes": "Description of this location"
    }
  ]
}
```

## License

Open source under MIT license.

## Acknowledgments

- Uses LINZ aerial imagery (CC BY 4.0)
- Built with Leaflet.js for map rendering
- Uses Sharp for image processing


