import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../src/index';
import { createTestDataDirectories } from '../utils/app';
import { TestDataDirectories } from '../data/directories.data';


const API_BASE_URL = '/api/';

describe(`GET ${API_BASE_URL}directories`, () => {
  it('responds with status 200', async () => {
    const res = await request(app).get(`${API_BASE_URL}directories`);

    expect(res.status).toBe(200);
  });

  it('responds with JSON content-type', async () => {
    const res = await request(app).get(`${API_BASE_URL}directories`);

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  // it('returns { list: [], fileContent: "", message: "" }', async () => {
  //   const res = await request(app).get(`${API_BASE_URL}directories`);

  //   expect(res.body).toEqual({ list: [], fileContent: "", message: "" });
  // });
  describe('with private fixtures', () => {

    beforeAll(() => {
      createTestDataDirectories(TestDataDirectories);
    });

    // afterAll(() => {
    //   for (const file of markdownFiles) {
    //     const filePath = path.join(PRIVATE_DIR, file);
    //     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    //   }
    //   const nestedMd = path.join(PRIVATE_DIR, testFolder, 'nested.md');
    //   if (fs.existsSync(nestedMd)) fs.unlinkSync(nestedMd);
    //   const folderPath = path.join(PRIVATE_DIR, testFolder);
    //   if (fs.existsSync(folderPath)) fs.rmdirSync(folderPath);
    // });

    it('private directory should be shown', async () => {
      const res = await request(app).get(`${API_BASE_URL}directories`);

      expect(res.status).toBe(200);
      expect(res.body.list).toEqual(
        expect.arrayContaining([TestDataDirectories.folder])
      );
      expect(res.body.fileContent).toBe('');
      expect(res.body.message).toBe('');
    });
  });
  describe('with private/1-folder', () => {
    it('should return the list of files in the directory', async () => {
      const root = TestDataDirectories.folder;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = TestDataDirectories.children.map(child => child.folder);
      const fileNames = TestDataDirectories.files;

      expect(res.status).toBe(200);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.fileContent).toBe('');
      expect(res.body.message).toBe('');
    });
  });
  describe('with private/nested-folder', () => {
    it('should return the list of files in the directory', async () => {
      const folder = TestDataDirectories.folder;
      const root = `${folder}/${TestDataDirectories.children[0].folder}/../`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = TestDataDirectories.children.map(child => child.folder);
      const fileNames = TestDataDirectories.files;

      expect(res.status).toBe(200);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.fileContent).toBe('');
      expect(res.body.message).toBe('');
    });
  });
  describe('with private/nested-folder/nested-folder-2', () => {
    it('should return the list of files in the directory', async () => {
      const root = `${TestDataDirectories.folder}/../`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = [TestDataDirectories.folder];
      const fileNames = [];

      expect(res.status).toBe(200);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.fileContent).toBe('');
      expect(res.body.message).toBe('');
    });
  });
  describe('with private/nested-folder/../sample.md', () => {
    it('should return the file content and parent directory list', async () => {
      const file = TestDataDirectories.files[0];
      const root = `${TestDataDirectories.folder}/nested-folder/../${file}`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = TestDataDirectories.children.map(child => child.folder);
      const fileNames = TestDataDirectories.files;

      expect(res.status).toBe(200);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.fileContent).toBe(`# ${file}\n`);
      expect(res.body.message).toBe('');
    });
  });

  describe.each(
    TestDataDirectories.children.map((child) => [child.folder, child] as const)
  )('with private/1-folder/%s', (folderName, child) => {
    it('should return the list of files in the nested folder', async () => {
      const root = `${TestDataDirectories.folder}/${folderName}`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = child.children.map((c) => c.folder);
      const fileNames = child.files;

      expect(res.status).toBe(200);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.fileContent).toBe('');
      expect(res.body.message).toBe('');
    });
  });

  describe('with private/1-file', () => {
    it('should return the file content', async () => {
      const file = TestDataDirectories.files[0];
      const root = `${TestDataDirectories.folder}/${file}`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = TestDataDirectories.children.map(child => child.folder);
      const fileNames = TestDataDirectories.files;

      expect(res.status).toBe(200);
      expect(res.body.fileContent).toBe(`# ${file}\n`);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.message).toBe('');
    });
  });
  describe('with private/1-file', () => {
    it('should return the file content', async () => {
      const file = TestDataDirectories.files[0];
      const root = `${TestDataDirectories.folder}/${file}`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      const dirNames = TestDataDirectories.children.map(child => child.folder);
      const fileNames = TestDataDirectories.files;

      expect(res.status).toBe(200);
      expect(res.body.fileContent).toBe(`# ${file}\n`);
      expect(res.body.list).toEqual(
        expect.arrayContaining([...dirNames, ...fileNames])
      );
      expect(res.body.message).toBe('');
    });
  });
  describe.each(
    TestDataDirectories.children[0].files.map((file) => [file, file] as const)
  )('with private/1-file/%s', (file) => {
    it('should return the file content of the file', async () => {
      const nested = TestDataDirectories.children[0];
      const root = `${TestDataDirectories.folder}/${nested.folder}/${file}`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      expect(res.status).toBe(200);
      // console.log(root, ' -> ', res.body.fileContent);
      expect(res.body.fileContent).toBe(`# ${file}\n`);
      expect(res.body.list).toEqual(
        expect.arrayContaining(nested.files)
      );
      expect(res.body.message).toBe('');
    });
  });
  // Invalid path
  describe('with invalid path', () => {
    it('should return the error message', async () => {
      const res = await request(app).get(`${API_BASE_URL}directories?root=invalid-path`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('File or directory not found');
    });
  });
  // Invalid file
  describe('with invalid file', () => {
    it('should return the error message', async () => {
      const root = `${TestDataDirectories.folder}/invalid-file.md`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('File or directory not found');
    });
  });
  // Invalid file type
  describe('with invalid file type', () => {
    it('should return the error message', async () => {
      const root = `${TestDataDirectories.folder}/invalid-file-type.lock`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Access denied to for such file type');
    });
  });
  // Restricted access to upper directory
  describe('with restricted access to upper directory', () => {
    it('should return the error message', async () => {
      const root = `${TestDataDirectories.folder}/../../`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Incorrect path');
    });
  });
  describe('with restricted access to upper directory', () => {
    it('should return the error message', async () => {
      const root = `${TestDataDirectories.folder}/../../index.ts`;
      const res = await request(app).get(`${API_BASE_URL}directories?root=${root}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Incorrect path');
    });
  });
});
