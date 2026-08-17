import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="animate-fade-in-up text-center">
        <p className="text-6xl font-bold text-accent">404</p>
        <h1 className="mt-4 text-xl font-semibold text-fg">页面不存在</h1>
        <p className="mt-2 text-sm text-muted">
          你访问的页面可能已被移除或地址有误
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
        >
          <span aria-hidden>←</span>
          返回首页
        </Link>
      </div>
    </div>
  );
}
