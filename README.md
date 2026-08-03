# Viewer

Browser-based viewer for local markdown files

## Installation

```bash
npm init
npm install --save-dev typescript @types/node
# If using Express:
npm install express
npm install --save-dev @types/express
npm i ts-node --save-dev
# For API Testing
npm install --save-dev jest
npm install dotenv --save-dev
```

## To Run

```bash
nodemon
```
## To Test

```bash
npm run test
# or
npx jest

npx jest -t "with invalid file type"
```

## UI

- Landing Page: http://localhost:3000
    - from src/public/index.html

## APIs

- http://localhost:3000/api/directories
- http://localhost:3000/api/directories?root=../..

## Deployment

UI Changes in src/public/index.html:

```javascript
// To deploy in a root path, use this URL
const API_BASE_URL = '/api';
// To deploy in a subpath, use this URL
// const API_BASE_URL = '/viewer/api';
```


API Changes in src/index.ts:

```typescript
// To deploy in a root path, use this route
app.use('/api', apiRouter);
// To deploy in a subpath, use this route
// API routes: /viewer/api/*
// app.use('/viewer/api', apiRouter);
```