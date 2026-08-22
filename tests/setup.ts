import path from 'path';

process.env.NODE_ENV = 'test';
process.env.MAX_PARENT_DIRECTORY = 'private';
process.env.POSTS_PROGRESS_PATH = path.join(__dirname, 'tmp-posts-progress.json');
