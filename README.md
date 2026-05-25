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

## APIs

- http://localhost:3000/api/directories
- http://localhost:3000/api/directories?root=../..