// src/index.ts
import 'dotenv/config';
import type { Request, Response } from 'express';
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { access, constants, realpath } from 'fs/promises';

// Constants
const PORT = process.env.PORT || 3000;
// Allowed file types content to be shown in the browser
const ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES || "md,java";
// const MAX_PARENT_DIRECTORY = "*"; // all the directories will be shown
const MAX_PARENT_DIRECTORY = process.env.MAX_PARENT_DIRECTORY || "private"; // all the directories will be shown with in the private directory


const app = express();
const apiRouter = Router();


const ALLOWED_BASE_PATH =
  MAX_PARENT_DIRECTORY === '*'
    ? path.resolve(__dirname)
    : path.resolve(__dirname, MAX_PARENT_DIRECTORY);

const isPathInsideBase = (targetPath: string): boolean => {
  const relative = path.relative(ALLOWED_BASE_PATH, path.resolve(targetPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveRootPath = (root: string): string =>
  MAX_PARENT_DIRECTORY === '*'
    ? path.resolve(__dirname, root)
    : path.resolve(ALLOWED_BASE_PATH, root);

/** Resolve and verify path stays inside ALLOWED_BASE_PATH (follows symlinks). */
const resolveSafePath = async (root: string): Promise<string | null> => {
  const resolved = resolveRootPath(root);
  if (MAX_PARENT_DIRECTORY !== '*' && !isPathInsideBase(resolved)) {
    return null;
  }
  try {
    const real = await realpath(resolved);
    if (MAX_PARENT_DIRECTORY !== '*' && !isPathInsideBase(real)) {
      return null;
    }
    return real;
  } catch {
    return resolved;
  }
};

const isFileOrDirectoryExists = (filePath: string): Promise<boolean> =>
  access(filePath, constants.F_OK)
    .then(() => true)
    .catch(() => false);

const getFileExtension = (filePath: string): string =>
  path.extname(filePath).slice(1).toLowerCase();

const ASSET_EXTENSIONS = new Set([
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif'
]);

const ASSET_MIME_TYPES: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  avif: 'image/avif'
};

apiRouter.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API is working fine...!' });
});
apiRouter.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong' });
});
const listDirectory = (dirPath: string): string[] => {
  // sort the list alphabetically with numeric prefix
  const list = fs.readdirSync(dirPath);
  list.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return list;
};

apiRouter.get('/directories', async (req: Request, res: Response) => {
  const root = req.query.root as string;

  const response = {
    list: [] as string[],
    fileContent: '' as string,
    message: '' as string
  }
  if (!root) {
    response.list = listDirectory(ALLOWED_BASE_PATH);
    res.json(response);
    return;
  }

  const resolvedPath = await resolveSafePath(root);
  if (!resolvedPath) {
    response.message = 'Incorrect path';
    res.status(400).json(response);
    return;
  }

  const isExists = await isFileOrDirectoryExists(resolvedPath);
  if (!isExists) {
    response.message = 'File or directory not found';
    res.status(404).json(response);
    return;
  }

  const allowedTypes = ALLOWED_FILE_TYPES.split(',').map((t) => t.trim().toLowerCase());
  const extension = getFileExtension(resolvedPath);

  if (allowedTypes.includes(extension)) {
    response.fileContent = fs.readFileSync(resolvedPath, 'utf8');
    // Always show siblings in the parent folder while viewing a file
    const parentDir = path.dirname(resolvedPath);
    response.list = listDirectory(parentDir);
    res.json(response);
    return;
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    response.list = listDirectory(resolvedPath);
    res.json(response);
    return;
  }

  if (stat.isFile()) {
    response.message = 'Access denied to for such file type';
    res.status(404).json(response);
    return;
  }

  response.message = 'It is neither file nor directory';
  res.status(404).json(response);
});

apiRouter.get('/asset', async (req: Request, res: Response) => {
  const root = req.query.root as string;
  if (!root) {
    res.status(400).send('Missing root');
    return;
  }

  const resolvedPath = await resolveSafePath(root);
  if (!resolvedPath) {
    res.status(400).send('Incorrect path');
    return;
  }

  const extension = getFileExtension(resolvedPath);
  if (!ASSET_EXTENSIONS.has(extension)) {
    res.status(403).send('Access denied for such file type');
    return;
  }

  const exists = await isFileOrDirectoryExists(resolvedPath);
  if (!exists) {
    res.status(404).send('File not found');
    return;
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    res.status(404).send('Not a file');
    return;
  }

  res.type(ASSET_MIME_TYPES[extension] || 'application/octet-stream');
  res.sendFile(resolvedPath);
});

// To deploy in a root path, use this route
app.use('/api', apiRouter);
// To deploy in a subpath, use this route
// API routes: /viewer/api/*
// app.use('/viewer/api', apiRouter);
// app.get(['/', '/viewer', '/viewer/'], (_req: Request, res: Response) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

app.use('/', express.static(path.join(__dirname, 'public')));

// Catch-all route handler
app.all(/.*/, (req, res) => {
  res.status(404).send('404 - Page Not Found');
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    app.listen();
  } else {
    const server = app.listen(PORT, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : PORT;
      console.log(`Server is running on http://localhost:${actualPort}`);
    });
  }
}