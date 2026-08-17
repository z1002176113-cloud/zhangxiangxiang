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
    href: "https://github.com/zhangxiangxiang",
    icon: "github",
    type: "external",
  },
  {
    label: "Twitter",
    href: "https://twitter.com/zhangxiangxiang",
    icon: "twitter",
    type: "external",
  },
  {
    label: "知乎",
    href: "https://www.zhihu.com/people/zhangxiangxiang",
    icon: "bookopen",
    type: "external",
  },
  {
    label: "Email",
    href: "mailto:zhangxiangxiang@example.com",
    icon: "mail",
    type: "email",
  },
];
