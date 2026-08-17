export interface WorkItem {
  date: string;
  title: string;
  tags: string[];
  description: string;
  link?: string;
  linkLabel?: string;
}

export const works: WorkItem[] = [
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
