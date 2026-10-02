import http from 'node:http';

// Node fetch normalizes Host. Use HTTP directly to exercise virtual-host routing.
export function requestHost(url, host, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {method, headers: {Host: host}}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        const headers = new Headers();
        for (let i = 0; i < res.rawHeaders.length; i += 2)
          headers.append(res.rawHeaders[i], res.rawHeaders[i + 1]);
        resolve(new Response(Buffer.concat(chunks), {status: res.statusCode, headers}));
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('Local HTTP test timed out')));
    req.on('error', reject);
    req.end();
  });
}
