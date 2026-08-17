import { works } from "@/data/works";
import { formatDate } from "@/lib/date";

export function WorkTimeline() {
  return (
    <section>
      <h3 className="mb-6 text-sm font-semibold text-fg">最近</h3>
      <div className="space-y-6">
        {works.map((work, i) => (
          <article
            key={i}
            className="group relative rounded-xl border border-border/60 bg-card/60 p-5 transition-all hover:border-accent/30 hover:shadow-md hover:shadow-black/[0.02] md:p-6"
          >
            {/* 日期 */}
            <time className="block text-xs font-mono text-muted">
              {formatDate(work.date)}
            </time>

            {/* 标题 */}
            <h4 className="mt-2 text-base font-semibold text-fg transition-colors group-hover:text-accent">
              {work.title}
            </h4>

            {/* 标签 */}
            {work.tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {work.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded bg-accent/8 px-2 py-0.5 text-[11px] text-accent"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            {/* 描述 */}
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {work.description}
            </p>

            {/* 外链 */}
            {work.link && (
              <a
                href={work.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-70"
              >
                {work.linkLabel ?? "查看"}
                <span aria-hidden>→</span>
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
