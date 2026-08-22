import fs from 'fs';
import path from 'path';

export type SectionProgressMap = Record<string, number[]>;

export type ProgressStore = Record<string, SectionProgressMap>;

export type ProgressFileResponse = {
  root: string;
  sections: SectionProgressMap;
  message: string;
};

export type ProgressActionResponse = {
  root: string;
  sectionId: string;
  timestamps: number[];
  completedToday: boolean;
  message: string;
};

const defaultProgressPath = path.resolve(__dirname, 'data', 'viewer', 'posts-progress.json');

export const getProgressFilePath = (): string =>
  process.env.POSTS_PROGRESS_PATH || defaultProgressPath;

const isSameLocalDay = (ts: number, ref = Date.now()): boolean => {
  const d1 = new Date(ts);
  const d2 = new Date(ref);
  return (
    d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
  );
};

export const emptyProgressFileResponse = (message: string, root = ''): ProgressFileResponse => ({
  root,
  sections: {},
  message,
});

export const emptyProgressActionResponse = (
  message: string,
  root = '',
  sectionId = '',
): ProgressActionResponse => ({
  root,
  sectionId,
  timestamps: [],
  completedToday: false,
  message,
});

export const readProgress = (): ProgressStore => {
  const filePath = getProgressFilePath();
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ProgressStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const writeProgress = (data: ProgressStore): void => {
  const filePath = getProgressFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

export const getProgressForFile = (root: string): SectionProgressMap => {
  const store = readProgress();
  const sections = store[root];
  return sections && typeof sections === 'object' ? { ...sections } : {};
};

export const isCompletedToday = (timestamps: number[], ref = Date.now()): boolean =>
  timestamps.some((ts) => isSameLocalDay(ts, ref));

export const markSection = (root: string, sectionId: string): ProgressActionResponse => {
  const store = readProgress();
  const fileSections = store[root] ? { ...store[root] } : {};
  const existing = Array.isArray(fileSections[sectionId]) ? [...fileSections[sectionId]] : [];

  if (!isCompletedToday(existing)) {
    existing.push(Date.now());
  }

  fileSections[sectionId] = existing;
  store[root] = fileSections;
  writeProgress(store);

  return {
    root,
    sectionId,
    timestamps: existing,
    completedToday: isCompletedToday(existing),
    message: '',
  };
};

export const unmarkSection = (root: string, sectionId: string): ProgressActionResponse => {
  const store = readProgress();
  const fileSections = store[root] ? { ...store[root] } : {};
  const existing = Array.isArray(fileSections[sectionId]) ? [...fileSections[sectionId]] : [];
  const remaining = existing.filter((ts) => !isSameLocalDay(ts));

  if (remaining.length > 0) {
    fileSections[sectionId] = remaining;
  } else {
    delete fileSections[sectionId];
  }

  if (Object.keys(fileSections).length > 0) {
    store[root] = fileSections;
  } else {
    delete store[root];
  }

  writeProgress(store);

  return {
    root,
    sectionId,
    timestamps: remaining,
    completedToday: isCompletedToday(remaining),
    message: '',
  };
};
