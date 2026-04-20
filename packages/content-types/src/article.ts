/**
 * Article Frontmatter Interface
 * Enforces consistent frontmatter across all guide pages in the network
 */

export interface ArticleData {
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  section?: string;
}

export interface ArticleFrontmatter {
  author: string;
  publishDate: string;
  modifiedDate: string;
  section: string;
  topics: string[];
  metaTitle?: string;
  metaDescription?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
