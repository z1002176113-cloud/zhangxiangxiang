import Link from "next/link";
import type { PostMeta } from "@/types";
import { formatDate } from "@/lib/date";

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="group py-5 border-b border-border/50 last:border-0">
      <h2 className="text-lg font-semibold">
        <Link
          href={`/blog/posts/${post.slug}`}
          className="text-fg transition-colors group-hover:text-accent"
        >
          {post.title}
        </Link>
      </h2>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
        <time>{formatDate(post.date)}</time>
        <span>posted in</span>
        <Link
          href={`/blog/category/${encodeURIComponent(post.category)}`}
          className="text-accent transition-opacity hover:opacity-70"
        >
          [{post.category}]
        </Link>
      </div>
      {post.summary && (
        <p className="mt-2 text-sm leading-relaxed text-muted">{post.summary}</p>
      )}
      <Link
        href={`/blog/posts/${post.slug}`}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-70"
      >
        阅读全文
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
