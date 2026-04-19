const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function worldsRouter(dataDir) {
  const router = express.Router();

  const worldPath = (id) => path.join(dataDir, `${id}.json`);

  const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, '');

  /** GET /api/worlds — list all saved worlds */
  router.get('/', (req, res) => {
    try {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      const worlds = files.map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
          return { id: data.id, name: data.name, timestamp: data.timestamp };
        } catch {
          return null;
        }
      }).filter(Boolean);
      worlds.sort((a, b) => b.timestamp - a.timestamp);
      res.json(worlds);
    } catch (err) {
      res.status(500).json({ error: 'Failed to list worlds' });
    }
  });

  /** GET /api/worlds/:id — load a world */
  router.get('/:id', (req, res) => {
    const id = sanitizeId(req.params.id);
    const fp = worldPath(id);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'World not found' });
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Failed to read world' });
    }
  });

  /** POST /api/worlds — save a new world */
  router.post('/', (req, res) => {
    const { name, snapshot } = req.body;
    if (!name || !snapshot) return res.status(400).json({ error: 'name and snapshot required' });
    const id = `world_${crypto.randomBytes(6).toString('hex')}`;
    const world = { id, name, timestamp: Date.now(), snapshot };
    try {
      fs.writeFileSync(worldPath(id), JSON.stringify(world, null, 2));
      res.status(201).json({ id, name, timestamp: world.timestamp });
    } catch {
      res.status(500).json({ error: 'Failed to save world' });
    }
  });

  /** PUT /api/worlds/:id — update an existing world */
  router.put('/:id', (req, res) => {
    const id = sanitizeId(req.params.id);
    const fp = worldPath(id);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'World not found' });
    const { name, snapshot } = req.body;
    try {
      const existing = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const updated = { ...existing, name: name ?? existing.name, snapshot: snapshot ?? existing.snapshot, timestamp: Date.now() };
      fs.writeFileSync(fp, JSON.stringify(updated, null, 2));
      res.json({ id, name: updated.name, timestamp: updated.timestamp });
    } catch {
      res.status(500).json({ error: 'Failed to update world' });
    }
  });

  /** DELETE /api/worlds/:id — delete a world */
  router.delete('/:id', (req, res) => {
    const id = sanitizeId(req.params.id);
    const fp = worldPath(id);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'World not found' });
    try {
      fs.unlinkSync(fp);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete world' });
    }
  });

  return router;
};
