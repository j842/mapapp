# Trail Map Viewer

A web application for viewing trail walks with interactive maps and geo-located images.

## Features

- Multi-walk support - organize different hikes in separate folders
- Interactive map with trail paths and geo-tagged photos
- Image galleries with keyboard navigation
- Support for LINZ (New Zealand) aerial imagery
- Mobile-friendly design

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Running the Application

1. Clone this repository
2. Create folders for your walks in the `data` directory (see structure below)
3. Run the application:

```bash
docker-compose up -d
```

4. Open a web browser and navigate to `http://localhost:8080`

## Creating Walks

Each walk is stored in its own directory under `data/`. The structure should be:

```
data/
  ├── walk1/
  │   ├── trail.gpx             # Optional GPX file for the trail path
  │   ├── walk_settings.json    # Walk settings and image info
  │   └── images/               # Directory containing all images
  │       ├── image1.jpg
  │       └── image2.jpg
  ├── walk2/
  │   ├── ...
```

### Walk Settings Format

The `walk_settings.json` file should have the following format:

```json
{
  "title": "Scenic Mountain Trail",
  "description": "A beautiful hike through the mountains with great views",
  "coverImage": "viewpoint.jpg",
  "trailPath": [
    [latitude1, longitude1],
    [latitude2, longitude2],
    ...
  ],
  "images": [
    {
      "imageName": "start.jpg",
      "coordinates": [latitude, longitude],
      "notes": "Starting point of the trail"
    },
    {
      "imageName": "viewpoint.jpg",
      "coordinates": [latitude, longitude],
      "notes": "Amazing mountain vista"
    }
  ]
}
```

- `title`: Name of the walk (required)
- `description`: Longer description shown on the main page (required)
- `coverImage`: Image to display as the main thumbnail for this walk (optional, defaults to first image)
- `trailPath`: Array of coordinates defining the trail path (optional if using GPX file)
- `images`: Array of images along the trail with their coordinates and notes

## Environment Variables

- `LINZ_API_KEY`: Your LINZ API key for New Zealand aerial imagery (defaults to demo key)

## Building from Source

To build the Docker container:

```bash
docker build -t trail-map .
```

To run the container:

```bash
docker run -p 8080:80 -v $(pwd)/data:/data trail-map
```

## License

Open source under MIT license.

## Acknowledgments

- Uses LINZ aerial imagery (CC BY 4.0)
- Built with Leaflet.js for map rendering
- Uses Sharp for image processing


