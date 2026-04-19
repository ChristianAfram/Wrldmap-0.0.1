/**
 * Vercel serverless function for world save/load.
 * Uses in-memory storage (resets on cold start) since Vercel has no writable filesystem.
 * The frontend already falls back to localStorage when the API is unavailable,
 * so this provides an optional shared-persistence layer.
 */

const worlds = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, method, body } = req;
  const pathParts = url.replace('/api/worlds', '').split('/').filter(Boolean);
  const id = pathParts[0];

  if (method === 'GET' && !id) {
    const list = [...worlds.values()].map(({ id, name, timestamp }) => ({ id, name, timestamp }));
    list.sort((a, b) => b.timestamp - a.timestamp);
    return res.status(200).json(list);
  }

  if (method === 'GET' && id) {
    const world = worlds.get(id);
    if (!world) return res.status(404).json({ error: 'World not found' });
    return res.status(200).json(world);
  }

  if (method === 'POST') {
    const { name, snapshot } = body ?? {};
    if (!name || !snapshot) return res.status(400).json({ error: 'name and snapshot required' });
    const newId = `world_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const world = { id: newId, name, timestamp: Date.now(), snapshot };
    worlds.set(newId, world);
    return res.status(201).json({ id: newId, name, timestamp: world.timestamp });
  }

  if (method === 'DELETE' && id) {
    if (!worlds.has(id)) return res.status(404).json({ error: 'World not found' });
    worlds.delete(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
