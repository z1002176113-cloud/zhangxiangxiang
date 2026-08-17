import { skillGroups } from "@/data/skills";

export function SkillTags() {
  return (
    <section>
      {skillGroups.map((group) => (
        <div key={group.title}>
          <h3 className="mb-4 text-sm font-semibold text-fg">{group.title}</h3>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
