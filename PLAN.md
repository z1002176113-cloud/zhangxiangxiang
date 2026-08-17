# 个人站点实现计划

> 参考站点：https://yanjunyi.com/ —— 极简风格个人名片 + 作品展示 + 博客

---

## 一、项目概述

模仿严俊羿个人网站，打造一个**极简主义风格**的个人站点，包含三大核心板块：
1. **个人名片首页** — 展示身份、职业标签、快速导航入口
2. **作品/履历页** — 展示技能栈、工具链、时间线式作品/经历
3. **技术博客页** — 文章列表、分类、归档、文章详情页

### 设计风格关键词
- 极简（Minimalist）、黑白灰主色调
- 居中卡片式布局，大量留白
- 优雅的中文排版（衬线/无衬线搭配）
- SVG 渐变装饰元素点缀背景
- 响应式：移动端优先，桌面端适配

---

## 二、技术选型（推荐方案）

| 方向 | 选型 | 理由 |
|------|------|------|
| **框架** | Next.js 14 (App Router) | 静态生成、SEO 友好、部署方便，适合个人站 |
| **语言** | TypeScript | 类型安全，后期维护成本低 |
| **样式** | Tailwind CSS 3 | 原子化 CSS，快速实现极简排版，响应式便捷 |
| **内容管理** | MDX / Markdown（本地文件） | 博客文章直接写 md 文件，免后端、版本化管理 |
| **部署** | Vercel / Netlify | 一键部署、免费、全球 CDN |
| **图标** | Lucide React / 纯 SVG | 轻量图标库，风格一致 |

> **备选方案（更轻量）**：如不需要 React 交互，可改用 Astro / VitePress，纯静态 + Markdown，构建产物更小。

---

## 三、页面结构规划

### 3.1 首页 (`/`) — 个人名片

**布局**：居中圆角卡片 + 渐变背景装饰

```
┌─────────────────────────────────────────┐
│                                         │
│              [SVG 渐变装饰]             │
│                                         │
│             张某某  ← H1 姓名           │
│       Web 工程师 / 自由职业者 ← H2      │
│                                         │
│  ┌────────┐  ┌────────┐                │
│  │  作品   │  │  博客   │  ← 主要入口   │
│  └────────┘  └────────┘                │
│                                         │
│  📧 微信  GitHub  Twitter  知乎  ← 社交 │
│                                         │
└─────────────────────────────────────────┘
```

**数据字段**：
- `name`: 姓名
- `title`: 职业副标题
- `navLinks`: 作品、博客（跳转内部路由）
- `socialLinks`: 邮箱（mailto:）、微信（二维码弹窗/外链）、GitHub、Twitter、知乎、掘金……

---

### 3.2 作品/履历页 (`/works`)

**顶部标题**：`工作，是为了自由`（或自定义一句话）

**模块 A：编程技能**
- 技能标签列表（JavaScript / TypeScript / React / Node.js / Go / ...）
- 可选：分「前端 / 后端 / 运维 / 其他」分组

**模块 B：使用工具**
- 工具标签（Mac / VSCode / Git / Chrome / Docker / Figma / ...）

**模块 C：作品与经历时间线**（倒序排列）

每个作品卡片包含：
```
┌──────────────────────────────────┐
│ 2024-05                          │  ← 日期
│                                  │
│ 某某项目名称                      │  ← H3 标题
│ [标签1] [标签2] [React] [Node]   │  ← 技术栈标签
│                                  │
│ 项目描述一段话，介绍做了什么、     │
│ 解决了什么问题、效果如何。        │  ← 描述文本
│                                  │
│ [→ 查看项目]  ← 外链（可选）     │
└──────────────────────────────────┘
```

**模块 D：合作说明（可选）**
- 如承接外包/咨询：一句说明 + 邮箱联系方式

---

### 3.3 博客列表页 (`/blog`)

**顶部标题**：`闭门造轮子`（或自定义博客名）+ 副标题（如 `造轮子工程师的代码笔记`）

**文章列表（倒序）**：
```
┌──────────────────────────────────────────┐
│ 文章标题一                                │ ← H2 链接
│ 2024-08-15  posted in [闭门思考]          │ ← 日期 + 分类
│                                           │
│ 文章摘要前 200 字左右，介绍文章内容……     │
│                                           │
│ [阅读全文 →]                              │
├──────────────────────────────────────────┤
│ 文章标题二                                │
│ ...                                       │
└──────────────────────────────────────────┘
```

**底部辅助链接**：
- 全部文章归档 (`/blog/archive`)
- 分类浏览 (`/blog/category/:name`)
- RSS 订阅 (`/feed.xml`)

---

### 3.4 博客详情页 (`/blog/posts/:slug`)

**内容结构**：
- 面包屑：`博客 / 分类 / 文章标题`
- 标题 H1 + 日期 + 分类
- MDX 渲染正文（支持代码高亮、图片、引用块）
- 上一篇 / 下一篇导航
- 回到列表

---

### 3.5 归档页 (`/blog/archive`)
- 按年份分组，列出所有文章标题 + 日期 + 链接

### 3.6 分类页 (`/blog/category/:name`)
- 列出该分类下所有文章（同列表页样式）

---

## 四、功能模块清单

### ✅ 核心功能（MVP 必做）
- [x] 404 页面
- [ ] 首页名片 + 渐变装饰
- [ ] 作品页：技能 + 工具 + 时间线作品
- [ ] 博客列表页：文章列表 + 分页/加载更多
- [ ] 博客详情页：Markdown 渲染 + 代码高亮
- [ ] 文章本地 Markdown 解析（frontmatter：title/date/category/summary）
- [ ] 响应式布局（移动端、平板、桌面）

### ⏳ 进阶功能（二期做）
- [ ] 博客分类浏览 + 归档页
- [ ] RSS feed 生成
- [ ] 文章搜索（本地关键词 / Algolia）
- [ ] 深色模式切换
- [ ] 页面过渡动画（卡片淡入、渐显）
- [ ] 微信二维码悬浮弹窗
- [ ] 文章阅读时长估算
- [ ] 评论系统（Giscus / Utterances，基于 GitHub Issues）
- [ ] 访问统计（百度统计 / 谷歌分析 / Umami）

### 💡 亮点功能（可选加分）
- [ ] 命令面板（CMD+K 快速搜索文章、跳转页面）
- [ ] 文章目录 TOC 锚点导航（长文自动生成侧边目录）
- [ ] 一键复制文章链接
- [ ] 代码块复制按钮 + 语言标识

---

## 五、分阶段开发计划

### 🚀 Phase 1：项目脚手架 + 基础样式
1. 初始化 Next.js 14 + TypeScript + Tailwind CSS
2. 配置全局样式：字体（中文优先，如思源宋体/黑体 + Inter）、颜色变量、容器最大宽度
3. 定义站点元数据：`site.config.ts`（姓名、社交链接、站点标题、描述）
4. 搭建全局布局组件：`<SiteLayout>`（header / main / footer）
5. 404 页面

### 🎨 Phase 2：首页（名片页）
1. SVG 渐变背景装饰组件（提取参考站的渐变风格）
2. 中心名片卡片：姓名 + 职业副标题
3. 两个大按钮：作品 / 博客
4. 社交图标链接栏（邮箱、微信、GitHub、Twitter、知乎…）
5. 移动端适配（缩小字号、减少横向间距）

### 💼 Phase 3：作品页
1. 作品页路由 `/works`
2. 顶部标题 + 引言
3. 技能模块：`skills.json` 数据驱动的标签列表
4. 工具模块：`tools.json` 数据驱动的标签列表
5. 作品时间线：`works.json` 数组渲染卡片（日期、标题、标签、描述、外链）
6. 卡片悬停效果（轻微上浮、阴影加深）

### ✍️ Phase 4：博客系统（核心）
1. 约定文章目录：`content/blog/*.md`
2. Markdown 解析：读取 `frontmatter` + 正文，生成文章列表
3. 博客列表页 `/blog`：分页或加载更多
4. 文章详情页 `/blog/posts/[slug]`：
   - 动态路由，按 slug 读取 md
   - `remark` / `rehype` 解析，代码高亮（`rehype-prism-plus` / `shiki`）
   - 上一篇 / 下一篇
5. 内容示例：写 2-3 篇示例文章用于调试

### 🔧 Phase 5：体验优化 + SEO
1. 站点 SEO：所有页面 `<title>`、`meta description`、Open Graph 标签
2. 生成 `sitemap.xml` + `robots.txt`
3. 图片优化：Next.js `<Image>` 组件
4. 骨架屏 / 加载态
5. Lighthouse 跑分检查（性能、SEO、可访问性）

### ➕ Phase 6：进阶功能（按需挑选）
1. RSS 订阅 (`/feed.xml`)
2. 归档页 + 分类页
3. 深色模式切换（`next-themes`）
4. 文章搜索（轻量本地搜索优先）
5. 评论系统接入
6. 流量统计埋点

---

## 六、文件目录结构建议

```
zhangxiangxiang/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 全局布局（字体、SEO、主题）
│   ├── page.tsx                  # 首页 / 名片
│   ├── not-found.tsx             # 404
│   ├── globals.css               # Tailwind + 全局样式
│   │
│   ├── works/
│   │   └── page.tsx              # 作品页
│   │
│   └── blog/
│       ├── layout.tsx            # 博客布局
│       ├── page.tsx              # 博客列表
│       ├── archive/
│       │   └── page.tsx          # 归档页
│       ├── category/
│       │   └── [category]/
│       │       └── page.tsx      # 分类页
│       └── posts/
│           └── [slug]/
│               └── page.tsx      # 文章详情
│
├── components/                   # 公共组件
│   ├── layout/
│   │   ├── SiteHeader.tsx
│   │   ├── SiteFooter.tsx
│   │   └── GradientBg.tsx        # SVG 渐变背景
│   ├── home/
│   │   ├── ProfileCard.tsx       # 名片卡片
│   │   └── SocialLinks.tsx       # 社交链接栏
│   ├── works/
│   │   ├── SkillTags.tsx
│   │   ├── ToolTags.tsx
│   │   └── WorkTimeline.tsx
│   ├── blog/
│   │   ├── PostList.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostContent.tsx       # MDX 渲染
│   │   └── Pagination.tsx
│   └── ui/                       # 基础 UI 原子组件
│       ├── Button.tsx
│       ├── Tag.tsx
│       └── Card.tsx
│
├── content/                      # Markdown 内容
│   └── blog/
│       ├── hello-world.md
│       ├── my-first-project.md
│       └── ...
│
├── data/                         # 静态数据（JSON/TS）
│   ├── site.config.ts            # 站点全局配置
│   ├── social.links.ts           # 社交链接
│   ├── skills.ts                 # 技能数据
│   ├── tools.ts                  # 工具数据
│   └── works.ts                  # 作品履历
│
├── lib/                          # 工具函数
│   ├── markdown.ts               # MD 解析相关
│   ├── posts.ts                  # 文章读取/排序
│   ├── date.ts                   # 日期格式化
│   └── seo.ts                    # SEO meta 辅助
│
├── public/
│   ├── images/                   # 静态图片（头像、作品封面、社交二维码）
│   ├── favicon.ico
│   ├── robots.txt
│   └── feed.xml                  # 生成后放这
│
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── package.json
```

---

## 七、配置文件示例（先定结构，后续填充内容）

### `data/site.config.ts`
```ts
export const siteConfig = {
  name: "张某某",
  title: "张某某的个人站点",
  description: "Web 工程师 / 自由职业者",
  subtitle: "工作，是为了自由",
  blogTitle: "闭门造轮子",
  blogSubtitle: "造轮子工程师的代码笔记",
  email: "your.email@example.com",
  url: "https://your-domain.com",
  sinceYear: 2024,
}
```

### `data/works.ts`
```ts
export interface WorkItem {
  date: string           // "2024-05"
  title: string
  tags: string[]         // ["React", "Node.js"]
  description: string
  link?: string          // 外链
}

export const works: WorkItem[] = [
  // 按日期倒序填
]
```

### `content/blog/xxx.md` Frontmatter 约定
```yaml
---
title: "文章标题"
date: 2024-08-15
category: "闭门思考"    // or "问题即经验" / "技术笔记" ...
summary: "文章摘要 100-200 字，用于列表展示。"
tags: [tag1, tag2]       // 可选
cover: "/images/xxx.jpg" // 可选
---

这里是 Markdown 正文...
```

---

## 八、下一步行动

完成本计划文档后，按 **Phase 1 → Phase 6** 的顺序逐步执行。每完成一个阶段标记为 Done，并做一次本地构建验证：

```bash
npm run dev     # 本地预览
npm run build   # 生产构建检查
npm run lint    # 代码规范
```

**部署建议**：代码推送到 GitHub 后，连接 Vercel 自动部署，绑定自定义域名即可上线。

---

*计划版本 v1.0 | 生成于 2026-08-17*
