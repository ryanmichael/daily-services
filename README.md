# Orthodox Daily Services

A web app that fetches Orthodox Christian service texts from the [GOA Digital Chant Stand](https://dcs.goarch.org) and renders a formatted printable service sheet.

## Services supported

| Code | Service |
|------|---------|
| `ve` | Vespers |
| `ma` | Matins |
| `li` | Divine Liturgy |

## Architecture

```
daily-services/
├── server/          # Node.js + Express proxy + parser
│   ├── index.js     # API server (port 3001)
│   ├── parser.js    # GOA HTML → JSON blocks (cheerio)
│   └── cache/       # Disk cache (auto-created, .gitignored)
└── client/          # React + Vite frontend (port 5173 in dev)
    └── src/
        ├── App.jsx
        └── components/
            ├── Controls.jsx      # Date picker + service selector
            ├── ServiceSheet.jsx  # Sheet layout + section grouping
            └── ServiceBlock.jsx  # Individual text block renderer
```

## Quick start

```bash
# Install all dependencies
npm run install:all

# Start both server and client in development
npm run dev
```

Then open http://localhost:5173.

## API

```
GET /api/service?date=YYYY-MM-DD&type=ve|ma|li
```

Returns:
```json
{
  "date": "2024-03-17",
  "type": "ve",
  "serviceTitle": "Vespers",
  "url": "https://dcs.goarch.org/...",
  "blocks": [
    {
      "speaker": "PRIEST",
      "sourceBook": "Euchologion",
      "type": "text",
      "text": "Blessed is our God..."
    }
  ],
  "cached": false
}
```

## Print

Use the **Print** button in the toolbar (or browser print). Controls are hidden, content expands to US Letter with 1.5 cm margins.
