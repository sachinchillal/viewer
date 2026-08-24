import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../src/index';
import { PRIVATE_DIR } from '../data/constants';

const API_BASE_URL = '/api/';

describe(`GET ${API_BASE_URL}asset`, () => {
  const fixtureDir = path.join(PRIVATE_DIR, 'asset-fixture');
  const imagePath = path.join(fixtureDir, 'assets', 'sample.svg');
  const imageRoot = 'asset-fixture/assets/sample.svg';

  beforeAll(() => {
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.writeFileSync(imagePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
  });

  afterAll(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('serves an image file with the correct content type', async () => {
    const res = await request(app).get(`${API_BASE_URL}asset?root=${encodeURIComponent(imageRoot)}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    const body = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : res.text;
    expect(body).toContain('<svg');
  });

  it('returns 400 when root is missing', async () => {
    const res = await request(app).get(`${API_BASE_URL}asset`);

    expect(res.status).toBe(400);
  });

  it('returns 404 when the file does not exist', async () => {
    const res = await request(app).get(`${API_BASE_URL}asset?root=asset-fixture/missing.svg`);

    expect(res.status).toBe(404);
  });

  it('returns 403 for disallowed file types', async () => {
    const mdPath = path.join(fixtureDir, 'notes.md');
    fs.writeFileSync(mdPath, '# test', 'utf8');

    const res = await request(app).get(`${API_BASE_URL}asset?root=asset-fixture/notes.md`);

    expect(res.status).toBe(403);
  });

  it('returns 400 for paths outside the allowed base', async () => {
    const res = await request(app).get(`${API_BASE_URL}asset?root=../../package.json`);

    expect(res.status).toBe(400);
  });
});
