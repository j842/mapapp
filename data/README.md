# Trail Explorer Configuration

## Site Configuration

The `site_config.json` file controls the global site appearance and branding. It should be placed in the `/data` directory.

### Example Configuration:

```json
{
    "siteName": "Trail Explorer",
    "siteTitle": "Outdoor Walking Trails Collection",
    "theme": {
        "mainBackground": "#1a1a1a",
        "mainColor": "#3498db"
    }
}
```

### Configuration Options:

- `siteName`: Used as the page title in the browser tab
- `siteTitle`: Displayed as the header on the main page
- `theme`: Contains theme-related options
  - `mainBackground`: When set to a dark color like "#1a1a1a", it enables dark theme for the main page
  - `mainColor`: Used for buttons, links, and accent elements throughout the site

## Walk Configuration

Each walk is stored in its own directory under `/data` and requires a `walk_settings.json` file. See the main documentation for details on walk settings. 