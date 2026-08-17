---
title: "Next.js App Router 最佳实践"
date: 2024-08-01
category: "问题即经验"
summary: "在使用 Next.js 14 App Router 重构个人站点的过程中，总结了一些最佳实践，包括 Server Components 的使用、Markdown 内容管理、SEO 优化等方面。"
tags: [Next.js, React, 前端工程化]
---

最近用 Next.js 14 App Router 重构了个人站点，在这里总结一些最佳实践。

## Server Components 优先

App Router 默认所有组件都是 Server Components，这意味着你可以在组件中直接使用 `async/await` 访问文件系统或数据库，而无需编写 API 路由。

```tsx
// app/blog/posts/[slug]/page.tsx
import { getPostBySlug } from "@/lib/posts";

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  // 直接在服务端读取 Markdown 文件并渲染
  return <PostContent contentHtml={post.contentHtml} />;
}
```

### 何时使用 `"use client"`

只在以下场景添加 `"use client"`：

- 需要交互（`useState`、`useEffect`、事件监听）
- 使用浏览器 API
- 第三方库依赖客户端环境

## Markdown 内容管理

对于个人博客，使用本地 Markdown 文件管理内容是最佳方案：

- 无需数据库和 CMS
- Git 版本管理
- 静态生成性能好

使用 `gray-matter` 解析 frontmatter，`unified` 生态链渲染 HTML：

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrism from "rehype-prism-plus";
import rehypeStringify from "rehype-stringify";

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypePrism)
  .use(rehypeStringify)
  .process(markdown);
```

## SEO 优化

App Router 内置了完善的 SEO 支持：

1. **Metadata API** — 在 `layout.tsx` 或 `page.tsx` 中导出 `metadata`
2. **sitemap.xml** — 创建 `app/sitemap.ts` 自动生成
3. **robots.txt** — 创建 `app/robots.ts` 自动生成

> 记得在 `layout.tsx` 中设置 `openGraph` 和 `twitter` 卡片，方便社交媒体分享。

## 部署

部署到 Vercel 是最简单的方案：

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 自动构建和部署
4. 绑定自定义域名

整个过程不到 5 分钟，HTTPS 证书自动签发。
