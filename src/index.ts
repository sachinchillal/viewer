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
const router = Router();


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

// Middleware to serve static files from "public" folder
router.use(express.static(path.join(__dirname, 'public')));

// Handle root and /viewer/ subpath (for reverse-proxy deployments)
router.get(['/', '/viewer', '/viewer/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

router.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'API is working fine...!' });
});
router.get('/api/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong' });
});
router.get('/api/directories', async (req: Request, res: Response) => {
  const root = req.query.root as string;

  const response = {
    list: [] as string[],
    fileContent: '' as string,
    message: '' as string
  }
  if (!root) {
    response.list = fs.readdirSync(ALLOWED_BASE_PATH);
    // sort the list alphabetically with numeric prefix
    response.list.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
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
    res.json(response);
    return;
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    response.list = fs.readdirSync(resolvedPath);
    // sort the list alphabetically with numeric prefix
    response.list.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
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



// Mount the router on the app
app.use('/viewer', router);

// Catch-all route handler
app.all(/.*/, (req, res) => {
  res.status(404).send('404 - Page Not Found');
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    app.listen();
  } else {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
}