import type { SocialLink, NavLink } from "@/types";

export const navLinks: NavLink[] = [
  { label: "作品", href: "/works" },
  { label: "博客", href: "/blog" },
];

export const socialLinks: SocialLink[] = [
  {
    label: "WeChat",
    href: "#",
    icon: "messagecircle",
    type: "wechat",
  },
  {
    label: "GitHub",
    href: "https://github.com/z1002176113-cloud",
    icon: "github",
    type: "external",
  },
  {
    label: "知乎",
    href: "https://www.zhihu.com/people/xzx1-66",
    icon: "bookopen",
    type: "external",
  },
  {
    label: "z1002176113@gmail.com",
    href: "mailto:z1002176113@gmail.com",
    icon: "mail",
    type: "email",
  },
];
