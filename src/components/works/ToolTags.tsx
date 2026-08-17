import { tools } from "@/data/tools";

export function ToolTags() {
  return (
    <section>
      <h3 className="mb-4 text-sm font-semibold text-fg">使用工具</h3>
      <ul className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <li
            key={tool}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            {tool}
          </li>
        ))}
      </ul>
    </section>
  );
}
