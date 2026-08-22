import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../src/index';
import { splitMarkdownByH2 } from '../../src/posts';
import { createTestDataDirectories } from '../utils/app';
import { TestDataDirectories } from '../data/directories.data';
import { PRIVATE_DIR } from '../data/constants';

const API_BASE_URL = '/api/';

const POSTS_FIXTURE = `# My Book

Intro paragraph before sections.

## First Section

Content for section one.

## Second Section

Content for section two.

\`\`\`markdown
## Not a real heading
\`\`\`

## Third Section

Final content.
`;

describe('splitMarkdownByH2', () => {
  it('splits markdown into preamble and H2 sections', () => {
    const { preamble, sections } = splitMarkdownByH2(POSTS_FIXTURE);

    expect(preamble).toBe('# My Book\n\nIntro paragraph before sections.');
    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual({
      id: 0,
      title: 'First Section',
      markdown: '## First Section\n\nContent for section one.',
    });
    expect(sections[1]).toEqual({
      id: 1,
      title: 'Second Section',
      markdown: expect.stringContaining('## Second Section'),
    });
    expect(sections[2]).toEqual({
      id: 2,
      title: 'Third Section',
      markdown: '## Third Section\n\nFinal content.',
    });
  });

  it('returns full file as preamble when no H2 headings exist', () => {
    const raw = '# Title only\n\nNo sections here.\n';
    const { preamble, sections } = splitMarkdownByH2(raw);

    expect(sections).toEqual([]);
    expect(preamble).toBe(raw.trim());
  });

  it('returns null preamble when file starts with H2', () => {
    const raw = '## First\n\nBody.\n';
    const { preamble, sections } = splitMarkdownByH2(raw);

    expect(preamble).toBeNull();
    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe('First');
  });

  it('does not split on H2 inside fenced code blocks', () => {
    const raw = '## Real Section\n\n```\n## fake\n```\n';
    const { sections } = splitMarkdownByH2(raw);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.markdown).toContain('## fake');
  });
});

describe(`GET ${API_BASE_URL}posts`, () => {
  const fixtureRelativePath = `${TestDataDirectories.folder}/posts-fixture.md`;
  const fixtureAbsolutePath = path.join(PRIVATE_DIR, fixtureRelativePath);

  beforeAll(() => {
    createTestDataDirectories(TestDataDirectories);
    fs.writeFileSync(fixtureAbsolutePath, POSTS_FIXTURE, 'utf8');
  });

  afterAll(() => {
    if (fs.existsSync(fixtureAbsolutePath)) {
      fs.unlinkSync(fixtureAbsolutePath);
    }
  });

  it('responds with status 200 and structured sections', async () => {
    const res = await request(app).get(
      `${API_BASE_URL}posts?root=${encodeURIComponent(fixtureRelativePath)}`
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.file).toBe('posts-fixture.md');
    expect(res.body.preamble).toBe('# My Book\n\nIntro paragraph before sections.');
    expect(res.body.message).toBe('');
    expect(res.body.sections).toHaveLength(3);
    expect(res.body.sections[0]).toMatchObject({
      id: 0,
      title: 'First Section',
    });
    expect(res.body.sections[0].markdown).toMatch(/^## First Section/);
  });

  it('returns 400 when root is missing', async () => {
    const res = await request(app).get(`${API_BASE_URL}posts`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      file: '',
      preamble: null,
      sections: [],
      message: 'Missing root',
    });
  });

  it('returns 400 for incorrect path', async () => {
    const root = `${TestDataDirectories.folder}/../../`;
    const res = await request(app).get(
      `${API_BASE_URL}posts?root=${encodeURIComponent(root)}`
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Incorrect path');
  });

  it('returns 404 for missing file', async () => {
    const root = `${TestDataDirectories.folder}/missing-posts.md`;
    const res = await request(app).get(
      `${API_BASE_URL}posts?root=${encodeURIComponent(root)}`
    );

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('File or directory not found');
  });

  it('returns 400 for non-markdown file type', async () => {
    const root = `${TestDataDirectories.folder}/invalid-file-type.lock`;
    const res = await request(app).get(
      `${API_BASE_URL}posts?root=${encodeURIComponent(root)}`
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Only markdown files are supported');
  });
});
