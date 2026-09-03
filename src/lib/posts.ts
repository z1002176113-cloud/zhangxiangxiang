import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrism from "rehype-prism-plus";
import rehypeStringify from "rehype-stringify";
import type { PostMeta, Post } from "@/types";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function dateToString(date: unknown): string {
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  return String(date ?? "");
}

function getSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

function readPostMeta(slug: string): PostMeta | null {
  const fullPath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data } = matter(raw);
  return {
    slug,
    title: (data.title as string) ?? slug,
    date: dateToString(data.date),
    category: (data.category as string) ?? "未分类",
    summary: (data.summary as string) ?? "",
    tags: (data.tags as string[]) ?? [],
  };
}

export function getAllPosts(): PostMeta[] {
  return getSlugs()
    .map(readPostMeta)
    .filter((p): p is PostMeta => p !== null)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const fullPath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrism)
    .use(rehypeStringify)
    .process(content);

  return {
    slug,
    title: (data.title as string) ?? slug,
    date: dateToString(data.date),
    category: (data.category as string) ?? "未分类",
    summary: (data.summary as string) ?? "",
    tags: (data.tags as string[]) ?? [],
    contentHtml: String(file),
  };
}

export function getAllCategories(): string[] {
  const posts = getAllPosts();
  return Array.from(new Set(posts.map((p) => p.category)));
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter((p) => p.category === category);
}

export function getAdjacentPosts(slug: string): {
  prev: PostMeta | null;
  next: PostMeta | null;
} {
  const posts = getAllPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  return {
    prev: index > 0 ? posts[index - 1] : null,
    next: index < posts.length - 1 ? posts[index + 1] : null,
  };
}
