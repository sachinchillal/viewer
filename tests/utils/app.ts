import path from "path";
import fs from "fs";
import { DirectoryInterface } from "../data/directories.data"
import { PRIVATE_DIR } from "../data/constants";


export const createTestDataDirectories = (
  testData: DirectoryInterface,
  parentPath: string = PRIVATE_DIR,
) => {
  const { folder, files, children } = testData;
  const folderPath = path.join(parentPath, folder);
  fs.mkdirSync(folderPath, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(folderPath, file), `# ${file}\n`, 'utf8');
  }
  for (const child of children) {
    createTestDataDirectories(child, folderPath);
  }
};