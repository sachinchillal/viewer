import path from "path";
import fs from "fs";

export const API_BASE_URL = '/viewer/api/';

export const PRIVATE_DIR = path.join(__dirname, '../../src/private');

// create a private directory if it doesn't exist
if (!fs.existsSync(PRIVATE_DIR)) {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}