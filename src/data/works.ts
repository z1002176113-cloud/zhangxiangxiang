import type { WorkItem } from "@/types";

export const works: WorkItem[] = [
  {
    date: "2026-08-21",
    title: "故事转手绘视频",
    tags: ["视频", "手绘", "Node.js", "自动化"],
    description:
      "基于 Node.js 自动化脚本，将故事图片序列转换为带有手绘风格转场动画的无声视频，配合剧情节奏逐帧呈现画面过渡效果。",
    video: "/videos/picture_silent.mp4",
  },
  {
    date: "2026-08-20",
    title: "英语单词记录 - Chrome 扩展",
    tags: ["Chrome Extension", "Manifest V3", "JavaScript"],
    description:
      "一款 Chrome Manifest V3 浏览器扩展，帮助用户在浏览英文网页时随手记录生词，自动获取词性和中文释义，方便后续复习。",
    link: "https://github.com/z1002176113-cloud/English-word-record",
    linkLabel: "查看源码",
  },
  {
    date: "2026-08-19",
    title: "字符串对比 - Chrome 扩展",
    tags: ["Chrome Extension", "Manifest V3", "JavaScript"],
    description:
      "一个 Chrome 浏览器扩展 (Manifest V3)，用于在浏览器中本地对比两段文本的差异。粘贴两段文本到左右两栏，一键即可看到字符级或行级差异高亮，全程不联网、不上传、零依赖。",
    link: "https://github.com/z1002176113-cloud/string-comparison",
    linkLabel: "查看源码",
  },
  {
    date: "2024-06",
    title: "个人站点重构",
    tags: ["Next.js", "TypeScript", "Tailwind CSS"],
    description:
      "基于 Next.js App Router 重新构建个人站点，采用 Markdown 本地管理博客内容，静态生成保障性能与 SEO，部署于 Vercel。",
    link: "https://zhangxiangxiang.com",
    linkLabel: "查看站点",
  },
  {
    date: "2023-11",
    title: "企业级 Dashboard 系统",
    tags: ["React", "Redux", "Node.js", "PostgreSQL"],
    description:
      "从零搭建数据可视化 Dashboard，包含实时图表、权限管理、多租户隔离。前端 React + ECharts，后端 Node.js + Prisma ORM。",
  },
  {
    date: "2022-08",
    title: "电商小程序开发",
    tags: ["React Native", "小程序", "支付"],
    description:
      "跨平台电商应用开发，支持微信/支付宝双端支付，商品管理、订单跟踪、优惠券系统全流程闭环。",
    link: "#",
    linkLabel: "案例介绍",
  },
  {
    date: "2021-03",
    title: "开始自由职业生涯",
    tags: ["自由职业"],
    description:
      "离开公司，开始独立承接 Web 开发项目。专注于前端工程化和用户体验优化，服务多位国内外客户。",
  },
];
