import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/site.config";
import { SkillTags } from "@/components/works/SkillTags";
import { ToolTags } from "@/components/works/ToolTags";
import { WorkTimeline } from "@/components/works/WorkTimeline";
import { DesktopPet } from "@/components/pet/DesktopPet";

export const metadata: Metadata = {
  title: "作品",
  description: `${siteConfig.name}的作品与经历`,
};

export default function WorksPage() {
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

      {/* 标题 */}
      <h1 className="text-2xl font-bold text-fg">{siteConfig.worksTitle}</h1>

      {/* 技能 + 工具 */}
      <div className="mt-10 space-y-8">
        <SkillTags />
        <ToolTags />
      </div>

      {/* 合作说明 */}
      {siteConfig.worksIntro && (
        <p className="mt-8 text-sm leading-relaxed text-muted">
          {siteConfig.worksIntro}
          <a
            href={`mailto:${siteConfig.email}`}
            className="text-accent underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            {siteConfig.email}
          </a>
        </p>
      )}

      {/* 作品时间线 */}
      <div className="mt-12">
        <WorkTimeline />
      </div>

      {/* My Baby 桌宠（悬浮右下角） */}
      <DesktopPet />
    </div>
  );
}
