// backend/src/routes/normalize.ts
// Entity Normalization API Routes

import { Router } from 'express';
import {
  normalizePort,
  normalizeCountry,
  getPortsByCountry,
  getPortByUnlocode,
  getCountryByCode,
  searchPorts,
  normalizePortBatch,
  isValidUnlocode,
  getCountryFromUnlocode,
} from '../services/entityNormalization';

const router = Router();

/**
 * POST /api/normalize/port
 * Normalize a port name to UN/LOCODE
 */
router.post('/port', (req, res) => {
  const { name } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Port name is required' });
  }
  
  const result = normalizePort(name);
  res.json(result);
});

/**
 * POST /api/normalize/ports
 * Normalize multiple port names in batch
 */
router.post('/ports', (req, res) => {
  const { names } = req.body;
  
  if (!Array.isArray(names)) {
    return res.status(400).json({ error: 'Array of port names is required' });
  }
  
  const results = normalizePortBatch(names);
  res.json({
    results,
    summary: {
      total: results.length,
      normalized: results.filter(r => r.normalized !== null).length,
      exact: results.filter(r => r.matchType === 'exact').length,
      fuzzy: results.filter(r => r.matchType === 'fuzzy').length,
      alias: results.filter(r => r.matchType === 'alias').length,
      notFound: results.filter(r => r.matchType === 'none').length,
    }
  });
});

/**
 * POST /api/normalize/country
 * Normalize a country name to ISO 3166
 */
router.post('/country', (req, res) => {
  const { name } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Country name is required' });
  }
  
  const result = normalizeCountry(name);
  res.json(result);
});

/**
 * GET /api/normalize/ports/search
 * Search ports by partial name
 */
router.get('/ports/search', (req, res) => {
  const { q, limit } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query (q) is required' });
  }
  
  const maxLimit = Math.min(parseInt(limit as string) || 10, 50);
  const results = searchPorts(q, maxLimit);
  
  res.json({
    query: q,
    count: results.length,
    ports: results,
  });
});

/**
 * GET /api/normalize/ports/country/:code
 * Get all ports for a country
 */
router.get('/ports/country/:code', (req, res) => {
  const { code } = req.params;
  
  if (!code || code.length !== 2) {
    return res.status(400).json({ error: 'Valid 2-letter country code is required' });
  }
  
  const ports = getPortsByCountry(code);
  
  res.json({
    countryCode: code.toUpperCase(),
    count: ports.length,
    ports,
  });
});

/**
 * GET /api/normalize/port/:unlocode
 * Get port by UN/LOCODE
 */
router.get('/port/:unlocode', (req, res) => {
  const { unlocode } = req.params;
  
  if (!isValidUnlocode(unlocode)) {
    return res.status(400).json({ error: 'Invalid UN/LOCODE format' });
  }
  
  const port = getPortByUnlocode(unlocode);
  
  if (!port) {
    return res.status(404).json({ error: 'Port not found' });
  }
  
  res.json(port);
});

/**
 * GET /api/normalize/country/:code
 * Get country by ISO code
 */
router.get('/country/:code', (req, res) => {
  const { code } = req.params;
  
  const country = getCountryByCode(code);
  
  if (!country) {
    return res.status(404).json({ error: 'Country not found' });
  }
  
  res.json(country);
});

/**
 * GET /api/normalize/validate/unlocode/:code
 * Validate a UN/LOCODE
 */
router.get('/validate/unlocode/:code', (req, res) => {
  const { code } = req.params;
  
  const valid = isValidUnlocode(code);
  const countryCode = valid ? getCountryFromUnlocode(code) : null;
  const port = valid ? getPortByUnlocode(code) : null;
  
  res.json({
    code: code.toUpperCase(),
    validFormat: valid,
    countryCode,
    exists: port !== null,
    port,
  });
});

export default router;
