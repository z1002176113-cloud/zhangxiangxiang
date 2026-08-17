# 开发执行清单（DEVELOPMENT TODO）

> 配合 [PLAN.md](./PLAN.md) 使用，按顺序逐项完成并打勾

---

## 🚀 Phase 1：项目脚手架 + 基础样式

- [ ] **1.1 初始化项目**
  - [ ] 在项目目录执行：`npx create-next-app@latest . --ts --tailwind --app --eslint --src-dir --import-alias "@/*"`
  - [ ] 安装核心依赖：`npm install gray-matter remark remark-rehype rehype-stringify rehype-prism-plus rehype-slug remark-gfm date-fns`
  - [ ] 运行 `npm run dev` 确认启动正常（http://localhost:3000）

- [ ] **1.2 配置全局样式与字体**
  - [ ] 编辑 `app/globals.css`：设置基础排版、中文字体栈（优先：PingFang SC / Microsoft YaHei / Noto Sans SC）
  - [ ] 在 `tailwind.config.ts` 添加自定义颜色：
    - `--bg` 背景色 / `--fg` 前景色 / `--muted` 次要色 / `--accent` 强调色
  - [ ] 配置容器 max-width（桌面 `max-w-2xl` 或 `max-w-3xl`，保持参考站的窄卡片感）

- [ ] **1.3 站点配置文件**
  - [ ] 创建 `data/site.config.ts`（姓名、副标题、博客标题、邮箱、域名等）
  - [ ] 创建 `data/social.links.ts`（社交链接数组：作品、博客、邮箱、微信、GitHub、Twitter、知乎…）
  - [ ] 创建 `data/skills.ts`（技能数组：前端 / 后端 / 运维 分组）
  - [ ] 创建 `data/tools.ts`（工具数组：Mac、VSCode、Git…）
  - [ ] 创建 `data/works.ts`（作品履历数组，先填 2-3 条示例占位）

- [ ] **1.4 全局布局组件**
  - [ ] 创建 `components/layout/SiteHeader.tsx`（极简：仅返回按钮 / 标题，或隐藏式顶部）
  - [ ] 创建 `components/layout/SiteFooter.tsx`（版权声明：© Since 2024 xxx.com）
  - [ ] 创建 `components/layout/GradientBg.tsx`（提取参考站的两个线性渐变 SVG 作为装饰背景）
  - [ ] 改造 `app/layout.tsx`：引入 Header / Footer / GradientBg，配置 metadata（title / description / OG 标签）

- [ ] **1.5 404 页面**
  - [ ] 创建 `app/not-found.tsx`：简约风格卡片 + 返回首页按钮

---

## 🎨 Phase 2：首页（个人名片）

- [ ] **2.1 名片卡片主组件**
  - [ ] 创建 `components/home/ProfileCard.tsx`
  - [ ] H1 姓名 + H2 职业副标题（居中，大字，字重合适）
  - [ ] 卡片：圆角 `rounded-3xl`、轻阴影 `shadow-sm`、内边距 `p-8 md:p-12`、半透明/白色背景

- [ ] **2.2 导航按钮**
  - [ ] 在名片下方放两个大按钮：「作品」→ `/works`、「博客」→ `/blog`
  - [ ] 按钮样式：圆角 `rounded-full`、hover 时上浮 + 背景加深
  - [ ] 移动端：垂直排列；桌面端：水平排列

- [ ] **2.3 社交链接栏**
  - [ ] 创建 `components/home/SocialLinks.tsx`
  - [ ] 图标 + 文字（或仅图标）：邮箱（mailto）、微信（hover 显示二维码图片）、GitHub、Twitter、知乎
  - [ ] 使用 Lucide React 图标库：`npm install lucide-react`
  - [ ] hover 动效：颜色变强调色 + 轻微放大

- [ ] **2.4 组装首页**
  - [ ] 在 `app/page.tsx` 引入 `<GradientBg />` + `<ProfileCard />`
  - [ ] 响应式调整：移动端 padding 更小、字号稍小
  - [ ] 本地预览，确认视觉风格接近参考站（居中、留白充足、渐变不抢内容）

---

## 💼 Phase 3：作品页

- [ ] **3.1 页面骨架**
  - [ ] 创建 `app/works/page.tsx`
  - [ ] 顶部大标题 H1：`工作，是为了自由`（或自定义）
  - [ ] 页面布局：`max-w-2xl mx-auto px-6 py-16`（窄容器，参考站感）

- [ ] **3.2 技能 + 工具模块**
  - [ ] 创建 `components/works/SkillTags.tsx`：读取 `data/skills.ts` 渲染标签分组
  - [ ] 创建 `components/works/ToolTags.tsx`：读取 `data/tools.ts` 渲染标签列表
  - [ ] 标签样式：`inline-block px-3 py-1 rounded-full border border-gray-200 text-sm text-gray-600`

- [ ] **3.3 作品时间线**
  - [ ] 创建 `components/works/WorkTimeline.tsx`
  - [ ] 遍历 `data/works.ts`，每项渲染为卡片（含日期、标题、技术标签、描述、外链按钮）
  - [ ] 日期左对齐小字，标题 H3 字重加粗，描述浅灰字
  - [ ] 卡片间距 `mb-8`，hover 轻阴影动效

- [ ] **3.4 合作说明（可选）**
  - [ ] 作品列表底部：一段关于承接开发 / 合作的说明文字 + 邮箱链接

---

## ✍️ Phase 4：博客系统

- [ ] **4.1 Markdown 解析工具库**
  - [ ] 创建 `lib/posts.ts`：
    - `getAllPostSlugs()` 读取 `content/blog/*.md`
    - `getPostBySlug(slug)` 用 `gray-matter` 解析 frontmatter + 正文
    - `renderMarkdown(md)` 用 remark + rehype 转 HTML（代码高亮、自动加 slug、支持 GFM）
    - `getAllPosts(sortByDate=true)` 返回所有文章元信息列表
    - `getPostsByCategory(category)` / `getAllCategories()`
  - [ ] 创建 `lib/date.ts`：日期格式化函数（`YYYY-MM-DD`、中文长格式）

- [ ] **4.2 示例文章**
  - [ ] 创建 `content/blog/` 目录
  - [ ] 写 2-3 篇示例 md 文章（包含代码块、引用、列表、标题等用于测试渲染）
  - [ ] 确保每篇的 frontmatter 有 `title / date / category / summary`

- [ ] **4.3 博客列表页**
  - [ ] 创建 `components/blog/PostCard.tsx`：单篇文章卡片（标题链接、日期、分类、摘要、「阅读全文」）
  - [ ] 创建 `components/blog/PostList.tsx`：数组渲染 PostCard
  - [ ] 创建 `app/blog/page.tsx`：
    - H1 标题 + 副标题（`闭门造轮子` / `造轮子工程师的代码笔记`）
    - 引入 PostList 展示所有文章
    - 底部放「全部文章归档 →」链接（先占位，Phase 6 补页面）

- [ ] **4.4 博客详情页**
  - [ ] 创建 `app/blog/posts/[slug]/page.tsx` 动态路由
  - [ ] 生成静态参数 `generateStaticParams()`（基于文章列表）
  - [ ] 页面结构：面包屑 → 标题 → 元信息（日期/分类） → 正文容器
  - [ ] 创建 `components/blog/PostContent.tsx`：用 `dangerouslySetInnerHTML` 渲染转换后的 HTML
  - [ ] 代码块样式：引入 Prism 主题 CSS 或自定义代码高亮配色
  - [ ] 底部添加上一篇 / 下一篇导航

---

## 🔧 Phase 5：SEO + 体验优化

- [ ] **5.1 SEO 元信息**
  - [ ] 每个页面补全 metadata：首页 / 作品页 / 博客列表 / 博客详情（标题、description、OG image）
  - [ ] 创建 `lib/seo.ts`：封装 generateMetadata 辅助函数

- [ ] **5.2 Sitemap + Robots**
  - [ ] 创建 `app/sitemap.ts`：动态生成 sitemap（静态页 + 所有博客文章 URL）
  - [ ] 创建 `app/robots.ts`：允许全站爬取 + sitemap 地址

- [ ] **5.3 性能优化**
  - [ ] 图片用 Next.js `<Image>` 组件，头像等做 blur 占位
  - [ ] `next.config.mjs` 开启 `reactStrictMode: true`，设置图片远程域名白名单
  - [ ] 本地 `npm run build && npm run start`，跑一次 Lighthouse，确保 Performance / SEO / Accessibility ≥ 90

- [ ] **5.4 微交互**
  - [ ] 首页卡片入场淡入动画（Tailwind animate + delay）
  - [ ] 作品卡片 hover 上浮 `hover:translate-y-[-2px] transition-all`
  - [ ] 链接下划线 hover 渐显效果（`group` + `after:` 伪元素）

---

## ➕ Phase 6：进阶功能（可选）

- [ ] **6.1 RSS 订阅**
  - [ ] 创建脚本生成 `public/feed.xml`（或用 `app/feed.xml/route.ts` 动态生成）
  - [ ] 博客页 footer 加上 RSS 图标链接

- [ ] **6.2 归档页 + 分类页**
  - [ ] `app/blog/archive/page.tsx`：按年份分组列出全部文章
  - [ ] `app/blog/category/[category]/page.tsx`：列出分类下的文章
  - [ ] 博客列表页给分类加 `<Link>` 跳转

- [ ] **6.3 深色模式**
  - [ ] `npm install next-themes`
  - [ ] 在 `app/layout.tsx` 包 `<ThemeProvider>`
  - [ ] 页脚加一个「☀️/🌙」切换按钮
  - [ ] Tailwind `darkMode: "class"`，补全各组件 `.dark:` 样式

- [ ] **6.4 文章搜索**
  - [ ] 方案 A（轻量）：在归档页用 `useMemo` 做前端关键词过滤
  - [ ] 方案 B（体验好）：集成 Algolia DocSearch（免费额度足够个人站）

- [ ] **6.5 评论系统**
  - [ ] 选 Giscus（基于 GitHub Discussions）：拿仓库 ID、分类 ID 配置
  - [ ] 详情页底部加 `<Giscus />` 组件
  - [ ] 深色模式下同步主题

- [ ] **6.6 流量统计**
  - [ ] 注册百度统计 / Google Analytics / Umami
  - [ ] 在 `app/layout.tsx` 注入脚本（用 `next/script` strategy="afterInteractive"）

---

## 🚢 Phase 7：部署上线

- [ ] **7.1 本地最终检查**
  - [ ] `npm run lint` 无报错
  - [ ] `npm run build` 构建成功，无警告
  - [ ] `npm run start` 本地跑，所有页面可访问、链接正常

- [ ] **7.2 Git 仓库**
  - [ ] `git init`、`.gitignore` 已有（Next.js 默认会生成）
  - [ ] 首次 commit：`feat: init personal site scaffold`
  - [ ] 推送到 GitHub 新仓库（Public / Private 都行）

- [ ] **7.3 部署到 Vercel**
  - [ ] 注册/登录 vercel.com，Import Project → 选择 GitHub 仓库
  - [ ] Framework Preset 自动识别 Next.js，保持默认设置 Deploy
  - [ ] 等构建成功，拿到 `xxx.vercel.app` 预览域名

- [ ] **7.4 绑定自定义域名**
  - [ ] 在 Vercel 项目 Settings → Domains 添加你的域名
  - [ ] 按提示去 DNS 服务商配 CNAME / A 记录
  - [ ] 等 HTTPS 证书自动签发，访问域名确认上线 ✅

---

## ✅ 完成度追踪

- Phase 1 脚手架：____ / ____
- Phase 2 首页：____ / ____
- Phase 3 作品页：____ / ____
- Phase 4 博客系统：____ / ____
- Phase 5 SEO + 优化：____ / ____
- Phase 6 进阶：____ / ____
- Phase 7 部署：____ / ____

**总进度**：____ %
