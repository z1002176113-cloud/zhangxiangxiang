/**
 * 站点级类型定义
 */

/** 社交链接 */
export interface SocialLink {
  label: string;
  href: string;
  icon: "mail" | "messagecircle" | "github" | "bookopen";
  type: "internal" | "external" | "email" | "wechat";
}

/** 导航链接 */
export interface NavLink {
  label: string;
  href: string;
}

/** 技能分组 */
export interface SkillGroup {
  title: string;
  items: string[];
}

/** 作品项 */
export interface WorkItem {
  date: string;
  title: string;
  tags: string[];
  description: string;
  link?: string;
  linkLabel?: string;
  /** 视频文件路径（相对于 public 目录，以 / 开头） */
  video?: string;
}

/** 文章元信息 */
export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  tags?: string[];
}

/** 文章完整信息 */
export interface Post extends PostMeta {
  contentHtml: string;
}

/** 站点配置 */
export interface SiteConfig {
  name: string;
  title: string;
  description: string;
  subtitle: string;
  worksTitle: string;
  worksIntro: string;
  blogTitle: string;
  blogSubtitle: string;
  email: string;
  url: string;
  sinceYear: number;
}
