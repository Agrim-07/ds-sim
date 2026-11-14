import { AppError, badRequest } from '../errors.js';

function collect(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        tooLarge = true;
        chunks.length = 0;
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (tooLarge) reject(new AppError(413, 'Request body is too large.', { Connection: 'close' }));
      else resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

export async function readJsonBody(req, limitBytes = 16 * 1024) {
  const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new AppError(415, 'Send the request body as application/json.');
  if (Number(req.headers['content-length'] ?? 0) > limitBytes) {
    throw new AppError(413, 'Request body is too large.', { Connection: 'close' });
  }

  const raw = await collect(req, limitBytes);
  if (raw.length === 0) return {};

  let parsed;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    throw badRequest('Request body is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw badRequest('Request body must be a JSON object.');
  }
  return parsed;
}
