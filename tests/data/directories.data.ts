export interface DirectoryInterface {
  folder: string;
  files: string[];
  children: DirectoryInterface[];
}
export const TestDataDirectories: DirectoryInterface = {
  folder: 'test-folder',
  files: ['sample.md', 'another.md', 'invalid-file-type.lock'],
  children: [
    {
      folder: 'nested-folder',
      files: ['1-file.md', '2-file.md', '3-file.md'],
      children: [],
    },
    {
      folder: 'nested-folder-2',
      files: ['nested-2.md'],
      children: [
        {
          folder: 'nested-folder-3', files: ['nested-3.md'],
          children: [],
        }
      ],
    },
    {
      folder: 'another-folder',
      files: ['another.md'],
      children: [],
    },
    {
      folder: 'empty-folder',
      files: [],
      children: [],
    },
    {
      folder: 'empty-folder-2',
      files: [],
      children: [
        { folder: 'nested-folder-2', files: [], children: [] }
      ],
    },
  ]
}