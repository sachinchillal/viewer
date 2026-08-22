import { lexer } from 'marked';

export type PostSection = {
  id: number;
  title: string;
  markdown: string;
};

export type PostsResponse = {
  file: string;
  preamble: string | null;
  sections: PostSection[];
  message: string;
};

export const emptyPostsResponse = (message: string): PostsResponse => ({
  file: '',
  preamble: null,
  sections: [],
  message,
});

export function splitMarkdownByH2(raw: string): {
  preamble: string | null;
  sections: PostSection[];
} {
  const tokens = lexer(raw);
  const sections: PostSection[] = [];
  const preambleParts: string[] = [];
  let currentSection: { title: string; parts: string[] } | null = null;
  let sectionIndex = 0;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      if (currentSection) {
        sections.push({
          id: sectionIndex,
          title: currentSection.title,
          markdown: currentSection.parts.join('').trimEnd(),
        });
        sectionIndex += 1;
      }
      currentSection = { title: token.text, parts: [token.raw] };
    } else if (currentSection) {
      currentSection.parts.push(token.raw);
    } else {
      preambleParts.push(token.raw);
    }
  }

  if (currentSection) {
    sections.push({
      id: sectionIndex,
      title: currentSection.title,
      markdown: currentSection.parts.join('').trimEnd(),
    });
  }

  const preambleTrimmed = preambleParts.join('').trim();
  return {
    preamble: preambleTrimmed === '' ? null : preambleTrimmed,
    sections,
  };
}
