import type { WorkItem } from "@/types";

export const works: WorkItem[] = [
  {
    date: "2026-08-24",
    title: "第一版需求",
    tags: ["需求", "产品", "规划"],
    description:
      "第一版需求完成，基于 JS 基础的继续学习，梳理功能清单与实现路径。",
  },
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
];
