import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

export const config = {
  api: {
    // Disable body parsing to handle large file streams directly
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve, reject) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return resolve();
    }

    const apiKey = (req.headers['x-api-key'] as string) || process.env.PHOTOROOM_API_KEY;

    if (!apiKey) {
      res.status(400).json({ error: 'PhotoRoom API key is missing' });
      return resolve();
    }

    const headers: Record<string, string> = {
       'X-Api-Key': apiKey,
    };
    
    // Copy multipart content-type (critical specifically for boundary)
    if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'];
    }
    
    // Copy content-length if present (often required by upstream)
    if (req.headers['content-length']) {
        headers['Content-Length'] = req.headers['content-length'];
    }

    const options = {
      hostname: 'sdk.photoroom.com',
      path: '/v1/segment',
      method: 'POST',
      headers: headers,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Forward status code
      res.status(proxyRes.statusCode || 500);
      
      // Forward response headers (e.g. content-type image/png)
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (value) res.setHeader(key, value);
      });

      // Pipe the upstream response back to the client
      proxyRes.pipe(res);
      
      proxyRes.on('end', () => resolve());
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err);
      if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to connect to PhotoRoom API via Proxy' });
      }
      resolve();
    });

    // Pipe the client incoming request stream (FormData) directly to upstream
    // This avoids loading the whole body into memory, bypassing body size limits
    req.pipe(proxyReq);
  });
}

