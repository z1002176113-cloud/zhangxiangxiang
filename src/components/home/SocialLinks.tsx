import { Mail, MessageCircle, Github, Twitter, BookOpen } from "lucide-react";
import { socialLinks } from "@/data/social.links";
import type { SocialLink } from "@/types";

const iconMap = {
  mail: Mail,
  messagecircle: MessageCircle,
  github: Github,
  twitter: Twitter,
  bookopen: BookOpen,
};

export function SocialLinks() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {socialLinks.map((link) => (
        <SocialItem key={link.label} link={link} />
      ))}
    </div>
  );
}

function SocialItem({ link }: { link: SocialLink }) {
  const Icon = iconMap[link.icon];
  const isEmail = link.type === "email";
  const isWechat = link.type === "wechat";

  const baseClass =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-all hover:bg-accent/5 hover:text-accent";

  if (isWechat) {
    return (
      <span
        className={`${baseClass} cursor-pointer select-none`}
        title="微信扫码添加"
      >
        <Icon className="h-3.5 w-3.5" />
        {link.label}
      </span>
    );
  }

  return (
    <a
      href={link.href}
      target={isEmail ? undefined : "_blank"}
      rel={isEmail ? undefined : "noopener noreferrer"}
      className={baseClass}
    >
      <Icon className="h-3.5 w-3.5" />
      {link.label}
    </a>
  );
}
