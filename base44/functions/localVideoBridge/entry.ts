import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRIDGE_BASE_URL = 'https://suggestions-entrepreneur-connecting-nasa.trycloudflare.com';
const BRIDGE_TOKEN = 'test123';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = body?.action;

    if (action === 'start') {
      const response = await fetch(`${BRIDGE_BASE_URL}/generate-video/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-token': BRIDGE_TOKEN,
        },
        body: JSON.stringify(body?.payload || {}),
      });

      const result = await response.json();
      return Response.json(result, { status: response.status });
    }

    if (action === 'status') {
      const jobId = body?.jobId;
      if (!jobId) {
        return Response.json({ error: 'Missing jobId' }, { status: 400 });
      }

      const response = await fetch(`${BRIDGE_BASE_URL}/jobs/${jobId}`, {
        headers: {
          'x-bridge-token': BRIDGE_TOKEN,
        },
      });

      const result = await response.json();
      return Response.json(result, { status: response.status });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});