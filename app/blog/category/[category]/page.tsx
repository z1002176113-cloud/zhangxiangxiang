import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories, getPostsByCategory } from "@/lib/posts";
import { PostCard } from "@/components/blog/PostCard";

export function generateStaticParams() {
  return getAllCategories().map((category) => ({
    category: encodeURIComponent(category),
  }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}): Metadata {
  return {
    title: decodeURIComponent(params.category),
  };
}

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);
  const posts = getPostsByCategory(category);

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
      >
        <span aria-hidden>←</span>
        博客
      </Link>

      <h1 className="text-2xl font-bold text-fg">{category}</h1>
      <p className="mt-2 text-sm text-muted">
        共 {posts.length} 篇文章
      </p>

      <div className="mt-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
