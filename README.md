# IPTV Portal for MAG Boxes

A web portal that allows users to register their MAG device MAC addresses and provides a MAG-compatible portal endpoint for accessing free IPTV content from TVPass.org.

## Features

- 📝 Web-based MAC address registration
- 📺 MAG portal API compatible with STB devices
- 🔄 Automatic M3U playlist parsing from TVPass.org
- ☁️ Runs on Cloudflare Pages (serverless)
- 💾 MAC address storage using Cloudflare KV

## Project Structure

```
/
├── index.html              # Registration web page
├── functions/
│   ├── c.js               # MAG portal endpoint (/c)
│   └── api/
│       └── register.js    # Registration API endpoint
├── wrangler.toml          # Cloudflare configuration
└── README.md              # This file
```

## Setup Instructions

### 1. Create a Cloudflare KV Namespace

1. Go to your Cloudflare Dashboard
2. Navigate to Workers & Pages → KV
3. Click "Create a namespace"
4. Name it `MAC_REGISTRY` (or anything you prefer)
5. Copy the namespace ID

### 2. Update wrangler.toml

Edit `wrangler.toml` and replace `your-kv-namespace-id` with your actual KV namespace ID:

```toml
[[kv_namespaces]]
binding = "MAC_REGISTRY"
id = "abc123def456"  # Your actual namespace ID
```

### 3. Deploy to Cloudflare Pages

#### Option A: Using Wrangler CLI

```bash
# Install Wrangler if you haven't
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy . --project-name iptv-portal
```

#### Option B: Using Git + Cloudflare Dashboard

1. Push this code to a GitHub repository
2. Go to Cloudflare Dashboard → Workers & Pages
3. Click "Create application" → "Pages" → "Connect to Git"
4. Select your repository
5. Configure the build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
6. In Environment Variables, add the KV binding:
   - Go to Settings → Functions → KV namespace bindings
   - Add binding: Variable name: `MAC_REGISTRY`, KV namespace: select your namespace

### 4. Configure Your MAG Box

Once deployed, configure your MAG device with:

**Portal URL:** `https://your-site.pages.dev/c`

(Replace `your-site.pages.dev` with your actual Cloudflare Pages domain)

## How It Works

### User Registration Flow

1. User visits the main page at `https://your-site.pages.dev/`
2. Enters their MAG device MAC address
3. MAC address is stored in Cloudflare KV
4. User configures their MAG box with the portal URL

### MAG Box Communication

1. MAG box sends requests to `/c?action=handshake`
2. Portal validates MAC address against KV registry
3. Portal fetches and parses M3U playlist from TVPass.org
4. Returns channel list in MAG-compatible format
5. MAG box can stream channels directly

## API Endpoints

### `GET /` 
Registration web interface

### `POST /api/register`
Register a new MAC address

**Request:**
```json
{
  "mac": "00:1A:79:XX:XX:XX"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "mac": "00:1A:79:XX:XX:XX"
}
```

### `GET /c?action=...`
MAG portal API endpoint

**Supported actions:**
- `handshake` - Initial connection and authentication
- `get_profile` - Get device profile
- `get_all_channels` - Get channel list
- `create_link` - Get stream URL

## MAC Address Format

MAC addresses should be in the format: `XX:XX:XX:XX:XX:XX`

The system automatically formats and validates MAC addresses.

## M3U Playlist Source

The portal fetches the free IPTV playlist from:
`https://tvpass.org/playlist/m3u`

This is parsed in real-time and converted to the MAG portal format.

## Security Notes

- No authentication required for the current setup (suitable for free/public IPTV)
- MAC addresses are stored in KV for basic tracking
- Consider adding rate limiting for production use
- CORS is enabled for all origins

## Troubleshooting

### MAC address not working
- Ensure the MAC address is registered via the web interface
- Check that the MAG box is sending the MAC address in headers
- Verify KV namespace is properly bound

### No channels appearing
- Check that TVPass.org is accessible
- Verify the M3U URL is working: `https://tvpass.org/playlist/m3u`
- Check Cloudflare Functions logs for errors

### Portal not responding
- Verify the deployment was successful
- Check that all functions are deployed
- Ensure KV namespace binding is correct

## Customization

### Change M3U Source

Edit `functions/c.js` and change the `M3U_URL` constant:

```javascript
const M3U_URL = 'https://your-custom-m3u-url.com/playlist.m3u';
```

### Add Authentication

Modify `functions/c.js` to check MAC registration and return auth errors:

```javascript
if (!isRegistered) {
  return new Response(
    JSON.stringify({ js: { error: 'MAC not registered' } }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## License

This project is provided as-is for educational purposes.

## Credits

- Free IPTV provided by [TVPass.org](https://tvpass.org)
- Runs on Cloudflare Pages
