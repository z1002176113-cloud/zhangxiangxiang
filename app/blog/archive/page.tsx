import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { formatDate } from "@/lib/date";

export const metadata: Metadata = {
  title: "文章归档",
};

export default function ArchivePage() {
  const posts = getAllPosts();

  // 按年份分组
  const grouped = posts.reduce<
    Record<string, typeof posts>
  >((acc, post) => {
    const year = post.date.split("-")[0];
    (acc[year] ??= []).push(post);
    return acc;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
      >
        <span aria-hidden>←</span>
        博客
      </Link>

      <h1 className="text-2xl font-bold text-fg">文章归档</h1>

      <div className="mt-8 space-y-8">
        {years.map((year) => (
          <section key={year}>
            <h2 className="mb-4 text-lg font-semibold text-fg">{year}</h2>
            <ul className="space-y-2">
              {grouped[year].map((post) => (
                <li
                  key={post.slug}
                  className="flex items-baseline gap-3 text-sm"
                >
                  <time className="font-mono text-xs text-muted">
                    {formatDate(post.date)}
                  </time>
                  <Link
                    href={`/blog/posts/${post.slug}`}
                    className="text-fg transition-colors hover:text-accent"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
