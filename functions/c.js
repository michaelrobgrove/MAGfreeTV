// MAG Portal API - Handles STB requests
const M3U_URL = 'https://tvpass.org/playlist/m3u';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Get MAC address from headers (MAG boxes send this)
  const macHeader = request.headers.get('X-MAC') || 
                    request.headers.get('MAC') ||
                    url.searchParams.get('mac');
  
  // Parse the path to determine the action
  const action = url.searchParams.get('action') || 'handshake';
  const type = url.searchParams.get('type');
  
  // Normalize MAC address
  let normalizedMac = null;
  if (macHeader) {
    normalizedMac = macHeader.toUpperCase().replace(/:/g, '');
  }
  
  // Check if MAC is registered (if KV is available)
  let isRegistered = true; // Default to true if no KV
  if (env.MAC_REGISTRY && normalizedMac) {
    const record = await env.MAC_REGISTRY.get(normalizedMac);
    isRegistered = !!record;
  }
  
  // Build response based on action
  let response;
  
  switch (action) {
    case 'handshake':
      response = {
        js: {
          token: generateToken(),
          random: generateRandomString(),
          pk_path: '/stalker_portal/c/',
          api_path: '/stalker_portal/api/',
          locale: 'en',
          mac: macHeader || '00:1A:79:00:00:00',
          stb_type: 'MAG250',
          sn: generateRandomString(),
          device_id: generateRandomString(),
          device_id2: generateRandomString(),
          signature: generateRandomString(),
          hw_version: '1.7-BD-00',
          not_valid: isRegistered ? 'false' : 'true',
          auth: isRegistered ? '1' : '0',
          metrics: { mac: macHeader || '00:1A:79:00:00:00' }
        }
      };
      break;
      
    case 'get_profile':
      response = {
        js: {
          id: '1',
          name: 'Profile',
          sname: 'profile',
          created: Math.floor(Date.now() / 1000),
          storage_name: 'nfo_storage',
          last_change_date: Math.floor(Date.now() / 1000),
          mac: macHeader || '00:1A:79:00:00:00',
          player: 'ffmpeg',
          screensaver_delay: '0',
          plasma_saving: '0',
          ts_enabled: '1',
          ts_enable_url: '1',
          ts_buffer_use: '1',
          video_out: 'hdmi',
          aspect: '0',
          screensaver_type: 'none',
          hdmi_event_reaction: '1',
          playback_buffer_size: '0',
          timezone: 'UTC'
        }
      };
      break;
      
    case 'get_localization':
      response = {
        js: {
          languages: [{ iso_code: 'en_US', name: 'English' }],
          timezones: []
        }
      };
      break;
      
    case 'get_all_channels':
    case 'get_ordered_list':
      // Fetch and parse the M3U playlist
      try {
        const m3uResponse = await fetch(M3U_URL);
        const m3uText = await m3uResponse.text();
        const channels = parseM3U(m3uText);
        
        response = {
          js: {
            data: channels,
            total_items: channels.length,
            max_page_items: 14,
            selected_item: 0,
            cur_page: 1,
            all_pages: Math.ceil(channels.length / 14)
          }
        };
      } catch (error) {
        response = {
          js: {
            data: [],
            total_items: 0,
            error: 'Failed to load channels'
          }
        };
      }
      break;
      
    case 'create_link':
      // Get channel ID/URL from request
      const cmd = url.searchParams.get('cmd');
      if (cmd) {
        response = {
          js: {
            id: '1',
            cmd: cmd,
            load: 100,
            priority: 0
          }
        };
      } else {
        response = { js: { error: 'No channel specified' } };
      }
      break;
      
    default:
      response = {
        js: {
          error: 'Unknown action',
          supported_actions: ['handshake', 'get_profile', 'get_all_channels', 'create_link']
        }
      };
  }
  
  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-MAC, MAC'
      }
    }
  );
}

// Parse M3U playlist into channel objects
function parseM3U(m3uText) {
  const channels = [];
  const lines = m3uText.split('\n');
  let currentChannel = null;
  let id = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Extract channel name
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : `Channel ${id}`;
      
      // Extract logo if present
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : '';
      
      currentChannel = {
        id: id.toString(),
        name: name,
        number: id,
        cmd: '', // Will be set from next line
        logo: logo,
        use_http_tmp_link: 1,
        tv_genre_id: '1',
        lock: 0,
        fav: 0,
        open: 1,
        volume_correction: 0
      };
      
      id++;
    } else if (line && !line.startsWith('#') && currentChannel) {
      // This is the stream URL
      currentChannel.cmd = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
}

// Helper functions
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function generateRandomString() {
  return Math.random().toString(36).substring(2, 15);
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-MAC, MAC'
    }
  });
}
