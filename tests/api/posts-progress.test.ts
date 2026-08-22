import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../src/index';
import {
  getProgressFilePath,
  isCompletedToday,
  markSection,
  unmarkSection,
  writeProgress,
} from '../../src/postsProgress';
import { createTestDataDirectories } from '../utils/app';
import { TestDataDirectories } from '../data/directories.data';
import { PRIVATE_DIR } from '../data/constants';

const API_BASE_URL = '/api/';
const fixtureRelativePath = `${TestDataDirectories.folder}/posts-progress-fixture.md`;
const fixtureAbsolutePath = path.join(PRIVATE_DIR, fixtureRelativePath);

describe('postsProgress module', () => {
  const progressPath = getProgressFilePath();

  beforeEach(() => {
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
    }
  });

  it('marks a section once per day and unmarks today', () => {
    const root = 'book.md';
    const first = markSection(root, '0');
    expect(first.timestamps).toHaveLength(1);
    expect(first.completedToday).toBe(true);

    const second = markSection(root, '0');
    expect(second.timestamps).toHaveLength(1);

    const unmarked = unmarkSection(root, '0');
    expect(unmarked.timestamps).toHaveLength(0);
    expect(unmarked.completedToday).toBe(false);
  });

  it('appends another timestamp on a different day', () => {
    const root = 'book.md';
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    writeProgress({ [root]: { '0': [yesterday] } });

    const result = markSection(root, '0');
    expect(result.timestamps).toHaveLength(2);
    expect(isCompletedToday(result.timestamps)).toBe(true);
  });
});

describe(`GET ${API_BASE_URL}posts/progress`, () => {
  beforeAll(() => {
    createTestDataDirectories(TestDataDirectories);
    fs.writeFileSync(fixtureAbsolutePath, '## Section\n\nBody.\n', 'utf8');
  });

  afterAll(() => {
    if (fs.existsSync(fixtureAbsolutePath)) {
      fs.unlinkSync(fixtureAbsolutePath);
    }
    const progressPath = getProgressFilePath();
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
    }
  });

  beforeEach(() => {
    writeProgress({});
  });

  it('returns empty progress for a markdown file', async () => {
    const res = await request(app).get(
      `${API_BASE_URL}posts/progress?root=${encodeURIComponent(fixtureRelativePath)}`
    );

    expect(res.status).toBe(200);
    expect(res.body.root).toBe(fixtureRelativePath);
    expect(res.body.sections).toEqual({});
    expect(res.body.message).toBe('');
  });

  it('returns 400 when root is missing', async () => {
    const res = await request(app).get(`${API_BASE_URL}posts/progress`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing root');
  });
});

describe(`POST ${API_BASE_URL}posts/progress`, () => {
  beforeAll(() => {
    createTestDataDirectories(TestDataDirectories);
    if (!fs.existsSync(fixtureAbsolutePath)) {
      fs.writeFileSync(fixtureAbsolutePath, '## Section\n\nBody.\n', 'utf8');
    }
  });

  afterAll(() => {
    if (fs.existsSync(fixtureAbsolutePath)) {
      fs.unlinkSync(fixtureAbsolutePath);
    }
    const progressPath = getProgressFilePath();
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
    }
  });

  beforeEach(() => {
    writeProgress({});
  });

  it('marks and unmarks a section via API', async () => {
    const markRes = await request(app)
      .post(`${API_BASE_URL}posts/progress`)
      .send({ root: fixtureRelativePath, sectionId: '0', action: 'mark' });

    expect(markRes.status).toBe(200);
    expect(markRes.body.sectionId).toBe('0');
    expect(markRes.body.timestamps).toHaveLength(1);
    expect(markRes.body.completedToday).toBe(true);

    const duplicateRes = await request(app)
      .post(`${API_BASE_URL}posts/progress`)
      .send({ root: fixtureRelativePath, sectionId: '0', action: 'mark' });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.timestamps).toHaveLength(1);

    const getRes = await request(app).get(
      `${API_BASE_URL}posts/progress?root=${encodeURIComponent(fixtureRelativePath)}`
    );
    expect(getRes.body.sections['0']).toHaveLength(1);

    const unmarkRes = await request(app)
      .post(`${API_BASE_URL}posts/progress`)
      .send({ root: fixtureRelativePath, sectionId: '0', action: 'unmark' });

    expect(unmarkRes.status).toBe(200);
    expect(unmarkRes.body.timestamps).toHaveLength(0);
    expect(unmarkRes.body.completedToday).toBe(false);
  });

  it('returns 400 for invalid payload', async () => {
    const res = await request(app)
      .post(`${API_BASE_URL}posts/progress`)
      .send({ root: fixtureRelativePath, sectionId: '0', action: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Missing or invalid');
  });

  it('returns 400 for incorrect path', async () => {
    const res = await request(app)
      .post(`${API_BASE_URL}posts/progress`)
      .send({ root: `${TestDataDirectories.folder}/../../`, sectionId: '0', action: 'mark' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Incorrect path');
  });
});
