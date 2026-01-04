export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const mac = body.mac;
    
    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
    if (!mac || !macRegex.test(mac)) {
      return new Response(
        JSON.stringify({ error: 'Invalid MAC address format' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Normalize MAC address (uppercase, no colons for storage key)
    const normalizedMac = mac.toUpperCase().replace(/:/g, '');
    
    // Store in KV (using Cloudflare KV binding)
    if (env.MAC_REGISTRY) {
      await env.MAC_REGISTRY.put(normalizedMac, JSON.stringify({
        mac: mac.toUpperCase(),
        registered: new Date().toISOString()
      }));
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Device registered successfully',
        mac: mac.toUpperCase()
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
