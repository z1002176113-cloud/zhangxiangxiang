import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getAdjacentPosts } from "@/lib/posts";
import { formatDateLong } from "@/lib/date";
import { PostContent } from "@/components/blog/PostContent";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
  };
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const { prev, next } = getAdjacentPosts(params.slug);

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      {/* 面包屑 */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link
          href="/blog"
          className="transition-colors hover:text-accent"
        >
          博客
        </Link>
        <span>/</span>
        <Link
          href={`/blog/category/${encodeURIComponent(post.category)}`}
          className="transition-colors hover:text-accent"
        >
          {post.category}
        </Link>
      </nav>

      {/* 文章头部 */}
      <header className="mb-8 border-b border-border/50 pb-6">
        <h1 className="text-2xl font-bold leading-snug text-fg md:text-3xl">
          {post.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <time>{formatDateLong(post.date)}</time>
        </div>
      </header>

      {/* 正文 */}
      <PostContent contentHtml={post.contentHtml} />

      {/* 上一篇 / 下一篇 */}
      <nav className="mt-12 flex items-stretch justify-between gap-4 border-t border-border/50 pt-6">
        {prev ? (
          <Link
            href={`/blog/posts/${prev.slug}`}
            className="group flex-1 rounded-lg border border-border/60 p-3 transition-colors hover:border-accent/30"
          >
            <span className="text-xs text-muted">← 上一篇</span>
            <p className="mt-1 text-sm font-medium text-fg transition-colors group-hover:text-accent">
              {prev.title}
            </p>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/blog/posts/${next.slug}`}
            className="group flex-1 rounded-lg border border-border/60 p-3 text-right transition-colors hover:border-accent/30"
          >
            <span className="text-xs text-muted">下一篇 →</span>
            <p className="mt-1 text-sm font-medium text-fg transition-colors group-hover:text-accent">
              {next.title}
            </p>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>

      {/* 返回列表 */}
      <div className="mt-8 text-center">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
        >
          <span aria-hidden>←</span>
          回到博客
        </Link>
      </div>
    </div>
  );
}
