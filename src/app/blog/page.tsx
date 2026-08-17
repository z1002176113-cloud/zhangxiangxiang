import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/site.config";
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/blog/PostCard";

export const metadata: Metadata = {
  title: siteConfig.blogTitle,
  description: siteConfig.blogSubtitle,
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      {/* 返回首页 */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
      >
        <span aria-hidden>←</span>
        返回
      </Link>

      {/* 博客标题 */}
      <h1 className="text-2xl font-bold text-fg">{siteConfig.blogTitle}</h1>
      <p className="mt-2 text-sm text-muted">{siteConfig.blogSubtitle}</p>

      {/* 文章列表 */}
      <div className="mt-8">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.slug} post={post} />)
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            暂无文章
          </p>
        )}
      </div>

      {/* 归档链接 */}
      {posts.length > 0 && (
        <div className="mt-8">
          <Link
            href="/blog/archive"
            className="text-sm text-accent underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            全部文章归档
          </Link>
        </div>
      )}
    </div>
  );
}
