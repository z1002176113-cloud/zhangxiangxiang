import Link from "next/link";
import { siteConfig } from "@/data/site.config";
import { navLinks } from "@/data/social.links";
import { SocialLinks } from "./SocialLinks";

export function ProfileCard() {
  return (
    <div className="animate-fade-in-up rounded-3xl border border-border/60 bg-card/80 p-8 shadow-xl shadow-black/[0.03] backdrop-blur-sm md:p-14">
      {/* 姓名 */}
      <h1 className="text-center text-4xl font-bold tracking-tight text-fg md:text-5xl">
        {siteConfig.name}
      </h1>

      {/* 副标题 */}
      <h2 className="mt-3 text-center text-base font-normal text-muted md:text-lg">
        {siteConfig.subtitle}
      </h2>

      {/* 主导航按钮 */}
      <nav className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-center rounded-full border border-border bg-card px-8 py-3 text-sm font-medium text-fg transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-accent hover:shadow-md hover:shadow-accent/10 sm:flex-1 sm:max-w-[10rem]"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* 社交链接 */}
      <div className="mt-8 border-t border-border/40 pt-6">
        <SocialLinks />
      </div>
    </div>
  );
}
