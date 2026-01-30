// src/index.ts
import type { Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();

const PORT = process.env.PORT || 3000;
// Middleware to serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Optional: Handle root route (index.html will be served automatically)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Node.js Server!');
});
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong' });
});
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong' });
});
app.get('/api/directories', (req: Request, res: Response) => {
  const root = req.query.root as string;

  let directories: string[] = [];
  let fileContent = '';
  if (!root) {
    directories = fs.readdirSync(__dirname);
  } else {
    // Resolve the path to handle parent directory navigation (.., ../.., etc.)
    const resolvedPath = path.resolve(__dirname, root);
    if (root.endsWith('.md')) {
      // send the markdown file content
      fileContent = fs.readFileSync(resolvedPath, 'utf8');
    } else {
      directories = fs.readdirSync(resolvedPath);
    }
  }
  res.json({ list: directories, fileContent });
});


// Error handling for unknown routes
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
