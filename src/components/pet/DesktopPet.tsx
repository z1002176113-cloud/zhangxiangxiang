"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ========== 类型与常量 ==========

// 桌宠动画状态（在原有基础上扩展）
type PetState =
  | "idle"
  | "walking"
  | "reacting"
  | "angry" // 捂脑袋委屈生气
  | "laughing" // 挠痒大笑
  | "spinning" // 转圈欢快
  | "confused" // 疑惑（拖拽松手落地动画第一段）
  | "scared" // 害怕（拖拽松手落地动画第二段）
  | "relieved" // 长舒一口气（拖拽松手落地动画第三段）
  | "happy" // 猜拳赢/投喂开心
  | "sad" // 猜拳输/进入冷静
  | "eating"; // 拍照投喂进食中

// 交互区域
type Zone = "halo" | "head" | "body";

// 猜拳手势
type RPSChoice = "rock" | "paper" | "scissors";

// 道具类型
type ItemType = "fish" | "heart" | "candy";

// 随机气泡文字
const BUBBLE_MESSAGES = [
  "你好呀~",
  "陪我玩吧！",
  "今天也要开心哦",
  "点我一下嘛",
  "我在等你~",
  "摸摸我！",
  "我是 My Baby",
  "嘻嘻~",
  "你今天好看！",
  "一起加油！",
];

// 随机表情符号
const EMOJIS = ["✨", "💕", "😄", "🌟", "💖", "😋", "🎀", "🌸", "💫", "☺️"];

// localStorage 存储键
const STORAGE_KEY = "my-baby-pet-state";

// 冷静持续时长（1 小时）
const CALM_DURATION = 60 * 60 * 1000;
// 挠痒累计次数达到该值触发冷静
const SCRATCH_LIMIT = 3;
// 画圈手势完成所需角度（弧度，2π = 一圈）
const CIRCLE_ANGLE = Math.PI * 2;

// 桌宠渲染尺寸（px）
const PET_SIZE = 80;
const MARGIN = 16;

// ========== 新增：桌宠表情帧（透明底 PNG，public/pet/ 目录，相对路径）==========
// 状态管理对象：6 张图片全部登记于此，切换表情时带 300ms 淡入淡出过渡。
// 注意：图片为 public 静态资源，统一由 CSS 等比适配容器尺寸，避免切换跳动。
const petFrames = {
  idle: "/pet/pet_idle.png", // 待机
  happy: "/pet/pet_happy.png", // 开心
  angry: "/pet/pet_angry.png", // 生气
  surprised: "/pet/pet_surprise.png", // 惊讶
  sad: "/pet/pet_sad.png", // 委屈
  eat: "/pet/pet_eat.png", // 进食
} as const;

// 状态 → 表情帧映射（多个动画状态共用同一表情图）
function petFrameForState(s: PetState): string {
  switch (s) {
    case "happy":
    case "laughing": // 挠痒成功 → 开心
    case "spinning": // 转圈欢快 → 开心
      return petFrames.happy;
    case "angry":
      return petFrames.angry;
    case "sad":
      return petFrames.sad;
    case "eating":
      return petFrames.eat;
    case "reacting": // 点击/惊讶反应 → 惊讶
      return petFrames.surprised;
    default:
      // idle / walking / confused / scared / relieved → 待机帧
      return petFrames.idle;
  }
}

// 长按拖动：按住后位移超过该阈值（px）判定为拖拽，屏蔽本次点击
const DRAG_THRESHOLD = 8;

// 桌宠坐标持久化存储键（拖拽结束保存，刷新页面位置不重置）
const PET_POS_KEY = "my-baby-pet-pos";

// ========== 新增：拍照投喂（图像识别 + 投喂动画 + 语音播报）==========
const FEED_DAILY_LIMIT = 5; // 每日拍照投喂上限（本地持久化，0 点重置）
const FEED_LIMIT_KEY = "my-baby-pet-feed-limit"; // 每日次数持久化键
const FEED_CONF_THRESHOLD = 0.6; // 置信度阈值：低于此值视为非食物提示
// 识别成功后的趣味台词（AI 生成模拟：内置随机模板，后续可接入大模型动态生成）
const FOOD_LINES = [
  (n: string) => `哇！${n}真香！我太爱了~😋`,
  (n: string) => `${n}！好美味，谢谢你投喂~💖`,
  (n: string) => `咔嚓咔嚓，${n}超级好吃！🍽️`,
  (n: string) => `今天能吃上${n}，太幸福啦！✨`,
];

// 读取今日剩余拍照投喂次数（按日期判断，跨天即 0 点重置）
function loadFeedLeft(): number {
  if (typeof window === "undefined") return FEED_DAILY_LIMIT;
  try {
    const raw = localStorage.getItem(FEED_LIMIT_KEY);
    if (!raw) return FEED_DAILY_LIMIT;
    const d = JSON.parse(raw);
    if (d.date !== new Date().toDateString()) return FEED_DAILY_LIMIT;
    return Math.max(0, FEED_DAILY_LIMIT - (d.count || 0));
  } catch {
    return FEED_DAILY_LIMIT;
  }
}

// 消耗一次拍照投喂额度（写入 localStorage，按天记录）
function consumeFeedCount(): void {
  if (typeof window === "undefined") return;
  try {
    const today = new Date().toDateString();
    let count = 0;
    const raw = localStorage.getItem(FEED_LIMIT_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.date === today) count = d.count || 0;
    }
    localStorage.setItem(
      FEED_LIMIT_KEY,
      JSON.stringify({ date: today, count: count + 1 })
    );
  } catch {
    /* localStorage 不可用时静默 */
  }
}

// 交互区域高度比例（相对于容器高度）
const ZONE_HALO_END = 0.22; // 头顶区：0 - 22%
const ZONE_HEAD_END = 0.5; // 头部区：22% - 50%

// 道具配置
const ITEMS: { key: ItemType; name: string; emoji: string; desc: string }[] = [
  { key: "fish", name: "小鱼干", emoji: "🐟", desc: "投喂后解除冷静" },
  { key: "heart", name: "爱心", emoji: "💖", desc: "投喂后解除冷静" },
  { key: "candy", name: "糖果", emoji: "🍬", desc: "投喂后解除冷静" },
];

// 猜拳选项
const RPS_OPTIONS: { key: RPSChoice; label: string; emoji: string }[] = [
  { key: "rock", label: "石头", emoji: "🪨" },
  { key: "scissors", label: "剪刀", emoji: "✂️" },
  { key: "paper", label: "布", emoji: "📄" },
];
const RPS_LABEL: Record<RPSChoice, string> = {
  rock: "石头",
  scissors: "剪刀",
  paper: "布",
};

// 猜拳胜负规则表：用户手势 → 能被它克制（赢过）的桌宠手势
// 石头赢剪刀；剪刀赢布；布赢石头
const RPS_BEATS: Record<RPSChoice, RPSChoice> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

// ========== 新增：多功能模块（对话 / 识图 / 备忘 / 录制 / 资料 / 查询）==========

// 对话消息
interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  time: number;
}

// 备忘录条目
interface Memo {
  id: string;
  title: string;
  content: string;
  time: number; // 提醒时间戳
  notified?: boolean; // 是否已弹过提醒
}

// 资料库条目（错题 / 收集的选中文本）
interface LibEntry {
  id: string;
  title: string;
  text: string;
  time: number;
}

// 虚拟文件夹记录（浏览器无法真正建文件夹，仅记录下载文件的元数据）
interface VirtualFile {
  id: string;
  name: string;
  kind: "image" | "video";
  time: number;
}

// 侧边功能面板选项卡
const SIDE_TABS = [
  { key: "chat", label: "💬 对话" },
  { key: "food", label: "🍎 识图" },
  { key: "memo", label: "📝 备忘" },
  { key: "capture", label: "🎬 录制" },
  { key: "lib", label: "📚 资料" },
  { key: "search", label: "🔍 查询" },
] as const;
type SideTab = (typeof SIDE_TABS)[number]["key"];

// 新增数据的 localStorage 存储键
const CHAT_KEY = "my-baby-pet-chat";
const MEMO_KEY = "my-baby-pet-memos";
const LIB_KEY = "my-baby-pet-library";
const FILES_KEY = "my-baby-pet-files";

// 通用 localStorage 工具（读取容错、写入容错）
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储失败静默处理 */
  }
}

// 生成简单唯一 id
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// 模拟识图：把识别出的食物映射到背包道具类型（与商城投喂逻辑复用）
const FOOD_MAP: { name: string; item: ItemType }[] = [
  { name: "小鱼干", item: "fish" },
  { name: "香煎三文鱼", item: "fish" },
  { name: "烤鱼", item: "fish" },
  { name: "爱心便当", item: "heart" },
  { name: "草莓蛋糕", item: "heart" },
  { name: "爱心饼干", item: "heart" },
  { name: "水果糖", item: "candy" },
  { name: "巧克力", item: "candy" },
  { name: "棉花糖", item: "candy" },
];

// 模拟 AI 对话回复（按关键词匹配；预留真实大模型接口，见 sendChat 内注释）
function simulateAIReply(userText: string): string {
  const t = userText.toLowerCase();
  if (t.includes("你好") || t.includes("hi") || t.includes("hello") || t.includes("嗨"))
    return "你好呀！我是 My Baby，很高兴见到你 😊";
  if (t.includes("名字") || t.includes("是谁")) return "我叫 My Baby，是你的专属桌宠！";
  if (t.includes("猜拳")) return "来猜拳呀！点桌宠工具栏的 ✊ 按钮就能玩啦～";
  if (t.includes("冷静") || t.includes("生气") || t.includes("消气"))
    return "如果你惹我生气了，我会进入冷静模式 1 小时。投喂小鱼干、爱心或糖果可以让我提前消气哦～";
  if (t.includes("备忘") || t.includes("提醒"))
    return "记得用「备忘」功能设置提醒时间，到点我会用系统通知叫你！";
  if (t.includes("吃") || t.includes("饿") || t.includes("识别"))
    return "在「识图」里上传食物图片，我能把它变成背包道具，随时可以投喂～";
  if (t.includes("截图") || t.includes("录屏") || t.includes("录制"))
    return "用「录制」功能可以捕获屏幕：截图或录视频，下载保存到本地～";
  if (t.includes("资料") || t.includes("收藏") || t.includes("错题"))
    return "在页面上选中任意文字，然后点一下我，就能自动收藏到资料库啦！";
  if (t.includes("查询") || t.includes("搜索"))
    return "用「查询」功能输入关键词，我能帮你搜索并解析重点（目前是模拟结果）～";
  if (t.includes("谢谢") || t.includes("感谢") || t.includes("爱你"))
    return "不客气！能帮到你就太好啦 💖";
  if (t.includes("再见") || t.includes("拜拜") || t.includes("晚安"))
    return "拜拜～记得常来看我哦！👋";
  return "嗯嗯，我在听呢～（这是模拟回复，接入大模型后我会更聪明！）";
}

// 浏览器原生语音识别构造器（SpeechRecognition，仅 HTTPS/localhost 可用）
type SRInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((_e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((_e: any) => void) | null;
  start: () => void;
  stop: () => void;
};
const SRCtor: (new () => SRInstance) | undefined =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

// 猜拳按钮手势图标（统一的白色线性风格）
// fill 为 none、stroke 继承按钮文字色（深色按钮上显示为白色线条）
function RPSIcon({ choice }: { choice: RPSChoice }) {
  if (choice === "rock") {
    // 石头：拳头（握拳主体 + 顶部三条指缝 + 左侧拇指）
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <rect x="7" y="6" width="10" height="12" rx="4.5" />
        <path d="M4.5 12.5h2.5" />
        <path d="M9.5 8v2M11.5 7.5v2.5M13.5 8v2" />
      </svg>
    );
  }
  if (choice === "scissors") {
    // 剪刀：剪刀手（手掌 + 食指中指张开呈 V 形）
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="11" width="12" height="8" rx="3" />
        <path d="M8.5 4l2 6.5" />
        <path d="M15.5 4l-2 6.5" />
      </svg>
    );
  }
  // 布：张开手掌（手掌 + 四指 + 左侧拇指）
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="11" width="12" height="8" rx="3" />
      <path d="M7.5 10.5V6.5" />
      <path d="M10 10.5V5" />
      <path d="M12.5 10.5V4.5" />
      <path d="M15 10.5V5.5" />
      <path d="M5.5 13l-1 2.5" />
    </svg>
  );
}

interface Position {
  x: number;
  y: number;
}

// 持久化数据结构
interface PersistedState {
  calmUntil: number | null; // 冷静截止时间戳
  scratchCount: number; // 挠痒累计次数
  items: Record<ItemType, number>; // 道具背包数量
}

const DEFAULT_PERSISTED: PersistedState = {
  calmUntil: null,
  scratchCount: 0,
  items: { fish: 1, heart: 0, candy: 0 },
};

// 从 localStorage 读取持久化状态
function loadPersisted(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    const parsed = JSON.parse(raw);
    const s: PersistedState = {
      calmUntil: typeof parsed.calmUntil === "number" ? parsed.calmUntil : null,
      scratchCount:
        typeof parsed.scratchCount === "number" ? parsed.scratchCount : 0,
      items: { ...DEFAULT_PERSISTED.items, ...(parsed.items || {}) },
    };
    // 已过期的冷静状态视为未冷静
    if (s.calmUntil && s.calmUntil <= Date.now()) s.calmUntil = null;
    return s;
  } catch {
    return DEFAULT_PERSISTED;
  }
}

export function DesktopPet() {
  // ---- 原有状态：位置 / 动画 / 朝向 / 气泡 / 表情 / 关闭按钮 ----
  // 位置：客户端首次渲染与 SSR 保持一致（-1，避免 hydration 不匹配），
  // 挂载后在 effect 中恢复拖拽保存的坐标或设置默认右下角
  const [position, setPosition] = useState<Position>({ x: -1, y: -1 });
  // 最新坐标引用：拖拽结束保存坐标时读取，避免闭包拿到旧值
  const positionRef = useRef<Position>({ x: -1, y: -1 });
  const [state, setState] = useState<PetState>("idle");
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [showClose, setShowClose] = useState(false);

  // ---- 新增：表情帧切换（300ms 淡入淡出过渡）----
  const [frameSrc, setFrameSrc] = useState<string>(petFrames.idle); // 当前表情图片
  const [frameVisible, setFrameVisible] = useState(true); // 淡入淡出透明度开关
  const displayedSrcRef = useRef<string>(petFrames.idle); // 实际显示中的表情图（供快速切换判断）
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 监听状态变化：先淡出 300ms → 切换图片 → 淡入
  useEffect(() => {
    const next = petFrameForState(state);
    if (next === displayedSrcRef.current) {
      // 目标表情就是当前显示的：确保可见（覆盖淡出中间态被快速切回的场景）
      setFrameVisible(true);
      return;
    }
    setFrameVisible(false);
    if (frameTimerRef.current) clearTimeout(frameTimerRef.current);
    frameTimerRef.current = setTimeout(() => {
      displayedSrcRef.current = next;
      setFrameSrc(next);
      setFrameVisible(true);
    }, 300);
    return () => {
      if (frameTimerRef.current) clearTimeout(frameTimerRef.current);
    };
  }, [state]);

  // ---- 新增：持久化状态（localStorage，惰性初始化，避免挂载时被空值覆盖）----
  const [calmUntil, setCalmUntil] = useState<number | null>(() =>
    loadPersisted().calmUntil
  ); // 冷静截止时间
  const [scratchCount, setScratchCount] = useState(() =>
    loadPersisted().scratchCount
  ); // 挠痒累计次数
  const [items, setItems] = useState<Record<ItemType, number>>(
    () => loadPersisted().items
  );

  // ---- 新增：UI 面板状态 ----
  const [showGame, setShowGame] = useState(false); // 猜拳面板
  const [showShop, setShowShop] = useState(false); // 商城面板
  // ---- 新增：拍照投喂面板 ----
  const [showFeed, setShowFeed] = useState(false); // 拍照投喂面板开关
  const [feedBusy, setFeedBusy] = useState(false); // 识别请求中
  const [feedLeft, setFeedLeft] = useState(() => loadFeedLeft()); // 今日剩余投喂次数
  const [cameraOn, setCameraOn] = useState(false); // 摄像头预览是否开启
  const [flying, setFlying] = useState<{
    emoji: string;
    fromX: number;
    fromY: number;
    dx: number;
    dy: number;
  } | null>(null); // 投喂飞行动画（食物从面板飞到桌宠嘴边）
  const [gameResult, setGameResult] = useState<{
    player: RPSChoice;
    comp: RPSChoice;
    result: "win" | "lose" | "draw";
  } | null>(null);
  const [calmLeft, setCalmLeft] = useState(0); // 冷静剩余秒数

  // ---- 新增：互动状态（点击桌宠激活，鼠标离开退出）----
  const [interactionActive, setInteractionActive] = useState(false); // 是否处于手势监听状态
  // 拖拽标志位：位移超过阈值进入拖拽模式，拖拽期间跳过全部手势识别
  const [isDragging, setIsDragging] = useState(false);

  // ---- 新增：多功能侧边面板 ----
  const [showSide, setShowSide] = useState(false); // 侧边面板开关
  const [sideTab, setSideTab] = useState<SideTab>("chat"); // 当前激活的选项卡

  // ---- 新增：对话模块 ----
  const [chats, setChats] = useState<ChatMessage[]>(() =>
    loadJSON<ChatMessage[]>(CHAT_KEY, [])
  ); // 对话记录（localStorage 惰性初始化）
  const [chatInput, setChatInput] = useState(""); // 输入框文本
  const [isThinking, setIsThinking] = useState(false); // AI 回复中
  const [isListening, setIsListening] = useState(false); // 语音识别中
  const [micDenied, setMicDenied] = useState(false); // 麦克风授权被拒

  // ---- 新增：识图投喂 ----
  const [recognizing, setRecognizing] = useState(false); // 模拟识别中

  // ---- 新增：备忘录 ----
  const [memos, setMemos] = useState<Memo[]>(() =>
    loadJSON<Memo[]>(MEMO_KEY, [])
  ); // 备忘录列表（localStorage 惰性初始化）
  const [memoTitle, setMemoTitle] = useState("");
  const [memoContent, setMemoContent] = useState("");
  const [memoTime, setMemoTime] = useState(""); // datetime-local 字符串

  // ---- 新增：截图 / 录屏（虚拟文件夹）----
  const [vfiles, setVfiles] = useState<VirtualFile[]>(() =>
    loadJSON<VirtualFile[]>(FILES_KEY, [])
  ); // 虚拟文件记录（localStorage 惰性初始化）
  const [recording, setRecording] = useState(false); // 是否正在录屏

  // ---- 新增：资料库（错题 / 选中文本收集）----
  const [library, setLibrary] = useState<LibEntry[]>(() =>
    loadJSON<LibEntry[]>(LIB_KEY, [])
  ); // 资料列表（localStorage 惰性初始化）
  const [renamingId, setRenamingId] = useState<string | null>(null); // 正在重命名的条目
  const [renameVal, setRenameVal] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null); // 展开查看的条目

  // ---- 新增：资料查询 ----
  const [searchKw, setSearchKw] = useState("");
  const [searchResults, setSearchResults] = useState<
    { title: string; url: string; snippet: string }[] | null
  >(null);
  const [parsing, setParsing] = useState(false); // 智能解析中
  const [searchSummary, setSearchSummary] = useState<string | null>(null);

  // ---- 新增：猜拳弹窗定位 ----
  const [smoothShift, setSmoothShift] = useState(false); // 桌宠平滑上移/回位过渡标记
  const rpsPanelRef = useRef<HTMLDivElement>(null); // 猜拳面板（用于测量弹窗尺寸）
  const rpsOriginRef = useRef<Position | null>(null); // 打开猜拳弹窗时桌宠的原始坐标
  const shiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 过渡结束恢复计时器

  // ---- 新增：拍照投喂（复用猜拳弹窗定位逻辑）----
  const feedPanelRef = useRef<HTMLDivElement>(null); // 拍照投喂面板（定位测量）
  const feedVideoRef = useRef<HTMLVideoElement>(null); // 摄像头预览
  const feedStreamRef = useRef<MediaStream | null>(null); // 摄像头媒体流
  const feedFileInputRef = useRef<HTMLInputElement>(null); // 本地上传（隐藏 input）
  const feedRef = useRef<{ name: string; item: ItemType; nutrition?: string } | null>(
    null
  ); // 当前识别食物（供动画结束回调）

  // ---- 原有 refs ----
  const petRef = useRef<HTMLDivElement>(null);
  // ---- 新增：拖拽过程数据（按下起点 / 偏移 / 是否发生过位移）----
  const dragRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    dragged: boolean; // 本次按压是否发生过超过阈值的位移
  }>({ startX: 0, startY: 0, offsetX: 0, offsetY: 0, dragged: false });
  const wanderRef = useRef<{
    targetX: number;
    speed: number;
    isWandering: boolean;
    pauseUntil: number;
  }>({ targetX: 0, speed: 0, isWandering: false, pauseUntil: 0 });
  const animFrameRef = useRef<number>(0);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 待触发的冷静回调（投喂解除时需取消）
  const pendingCalmRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 新增：手势识别状态（一次按压会话内的中间数据）----
  const gestureRef = useRef({
    zone: "none" as Zone | "none",
    downX: 0,
    downY: 0,
    // 画圈
    circleAngle: 0,
    lastAngle: 0,
    lastAngleInit: false,
    // 手势完成标记
    gestureDone: false,
  });

  // ---- 新增：多功能模块 refs ----
  const sidePanelRef = useRef<HTMLDivElement>(null); // 侧边面板（用于测量定位）
  const foodInputRef = useRef<HTMLInputElement>(null); // 隐藏的图片选择框
  const srRef = useRef<SRInstance | null>(null); // 语音识别实例
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // 录屏实例
  const mediaStreamRef = useRef<MediaStream | null>(null); // 屏幕捕获流

  // （位置恢复 / positionRef 同步 effect 在 clampPosition 定义之后，
  //   避免在初始化前引用导致的暂时性死区错误）

  // （持久化数据已通过 useState 惰性初始化加载，无需挂载时再 setState，
  //   避免保存 effect 用初始空值覆盖 localStorage）

  // ---- 新增：持久化状态变化时写入 localStorage ----
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ calmUntil, scratchCount, items })
    );
  }, [calmUntil, scratchCount, items]);

  // ---- 新增：多功能模块数据变化时写入 localStorage ----
  useEffect(() => {
    saveJSON(CHAT_KEY, chats);
  }, [chats]);
  useEffect(() => {
    saveJSON(MEMO_KEY, memos);
  }, [memos]);
  useEffect(() => {
    saveJSON(LIB_KEY, library);
  }, [library]);
  useEffect(() => {
    saveJSON(FILES_KEY, vfiles);
  }, [vfiles]);

  // ---- 新增：备忘录到点提醒（每 10s 检查一次，弹出桌面通知）----
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setMemos((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (!m.notified && m.time <= now) {
            changed = true;
            // 桌面通知（需要 HTTPS/localhost + 用户授权）
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              try {
                const n = new Notification("⏰ 备忘录提醒", {
                  body: `${m.title}：${m.content || "时间到了！"}`,
                  tag: m.id,
                });
                n.onclick = () => {
                  window.focus();
                  n.close();
                };
              } catch {
                /* 通知失败静默处理 */
              }
            }
            return { ...m, notified: true };
          }
          return m;
        });
        return changed ? next : prev;
      });
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  // ---- 新增：每秒检查冷静是否到期 / 更新剩余秒数 ----
  useEffect(() => {
    const tick = () => {
      setCalmUntil((prev) => (prev && prev <= Date.now() ? null : prev));
      setCalmLeft((prev) => {
        if (!calmUntil) return 0;
        const left = Math.max(0, Math.ceil((calmUntil - Date.now()) / 1000));
        return left === prev ? prev : left;
      });
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calmUntil]);

  // ---- 边界约束 ----
  const clampPosition = useCallback((x: number, y: number): Position => {
    const maxX = window.innerWidth - PET_SIZE;
    const maxY = window.innerHeight - PET_SIZE;
    return {
      x: Math.max(MARGIN, Math.min(x, maxX)),
      y: Math.max(MARGIN, Math.min(y, maxY)),
    };
  }, []);

  // ---- 初始化位置：优先恢复拖拽保存的坐标（localStorage），否则默认右下角 ----
  // 客户端首次渲染保持与 SSR 一致的 -1（避免 hydration 不匹配导致 DOM 不更新），
  // 挂载后再读取本地坐标并渲染，DOM 才能正确恢复位置
  useEffect(() => {
    const saved = loadJSON<Position>(PET_POS_KEY, { x: -1, y: -1 });
    if (saved.x >= 0 && saved.y >= 0) {
      setPosition(clampPosition(saved.x, saved.y));
    } else {
      setPosition({
        x: window.innerWidth - PET_SIZE - MARGIN,
        y: window.innerHeight - PET_SIZE - MARGIN,
      });
    }
  }, [clampPosition]);

  // ---- 同步最新坐标到 ref（拖拽结束保存时使用）----
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // ---- 自动游走逻辑（原有，保留）----
  useEffect(() => {
    let lastTime = performance.now();

    const wander = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // 如果在暂停中，不移动
      if (currentTime < wanderRef.current.pauseUntil) {
        animFrameRef.current = requestAnimationFrame(wander);
        return;
      }

      // 拖拽中：不自动游走，避免行走动画与拖拽位置互相冲突
      if (isDragging) {
        animFrameRef.current = requestAnimationFrame(wander);
        return;
      }

      // 如果没有目标或到达目标，设置新的漫游目标
      if (!wanderRef.current.isWandering) {
        const maxX = window.innerWidth - PET_SIZE;
        const newX = MARGIN + Math.random() * (maxX - MARGIN);
        wanderRef.current.targetX = newX;
        wanderRef.current.speed = 30 + Math.random() * 50;
        wanderRef.current.isWandering = true;
        setState("walking");

        if (newX > position.x) setFacing("right");
        else setFacing("left");
      }

      const targetX = wanderRef.current.targetX;
      const currentX = position.x;
      const diff = targetX - currentX;
      const distance = Math.abs(diff);
      const moveDistance = (wanderRef.current.speed * deltaTime) / 1000;

      if (distance <= moveDistance) {
        wanderRef.current.isWandering = false;
        setState("idle");
        wanderRef.current.pauseUntil =
          currentTime + 2000 + Math.random() * 3000;

        if (Math.random() < 0.3) {
          showBubble(
            BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)]
          );
        }
      } else {
        const newX = currentX + (diff > 0 ? moveDistance : -moveDistance);
        setPosition((prev) => clampPosition(newX, prev.y));
      }

      animFrameRef.current = requestAnimationFrame(wander);
    };

    animFrameRef.current = requestAnimationFrame(wander);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [position.x, clampPosition, isDragging]);

  // ========== 基础工具函数 ==========

  // 根据按压点的纵向偏移判断交互区域
  const getZone = (offsetY: number): Zone => {
    const ratio = offsetY / PET_SIZE;
    if (ratio < ZONE_HALO_END) return "halo";
    if (ratio < ZONE_HEAD_END) return "head";
    return "body";
  };

  // 显示气泡（原逻辑保留）
  const showBubble = (msg: string) => {
    setBubble(msg);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), 2500);
  };

  // 播放顺序动画序列（用于拖拽松手落地三段动画：疑惑 → 害怕 → 舒一口气）
  const playSequence = (seq: { s: PetState; ms: number }[]) => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    let acc = 0;
    seq.forEach((step) => {
      setTimeout(() => setState(step.s), acc);
      acc += step.ms;
    });
    stateTimerRef.current = setTimeout(() => setState("idle"), acc);
  };

  // 重置漫游（原逻辑，可指定暂停时长，用于长动画场景）
  const resetWander = (pauseMs = 1000) => {
    wanderRef.current.isWandering = false;
    wanderRef.current.pauseUntil = performance.now() + pauseMs;
  };

  // 格式化冷静剩余时间 mm:ss
  const formatCalm = (ms: number) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ========== 交互行为 ==========

  // 点击交互（原逻辑保留：随机气泡 + 表情 + 弹跳）
  const handleClick = useCallback(() => {
    setState("reacting");

    const msg =
      BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)];
    showBubble(msg);

    const em = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    setEmoji(em);
    if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
    emojiTimerRef.current = setTimeout(() => setEmoji(null), 1500);

    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1000);
  }, []);

  // 进入冷静模式（挠痒累计达到 3 次触发）
  const enterCalm = () => {
    setCalmUntil(Date.now() + CALM_DURATION);
    setCalmLeft(CALM_DURATION / 1000); // 立即显示剩余时间（interval 随后持续刷新）
    setScratchCount(0);
    setState("sad");
    showBubble("呜呜…被你挠得太多次了，我要冷静 1 小时 ❄️");
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1500);
  };

  // 点击肚子（挠痒）：大笑 + 累计计数，达到 3 次触发冷静
  const handleScratch = () => {
    setState("laughing");
    showBubble("哈哈哈…好痒！别挠啦！😆");
    setEmoji("😂");
    if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
    emojiTimerRef.current = setTimeout(() => setEmoji(null), 1500);

    // 累计挠痒次数，达到 SCRATCH_LIMIT 触发冷静
    // 延迟 1.2s 触发（先播完大笑动画）；投喂解除时通过 pendingCalmRef 取消
    setScratchCount((prev) => {
      const next = prev + 1;
      if (next >= SCRATCH_LIMIT && !pendingCalmRef.current) {
        pendingCalmRef.current = setTimeout(() => {
          pendingCalmRef.current = null;
          enterCalm();
        }, 1200);
      }
      return next;
    });

    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1200);
  };

  // 头顶画圈：欢快转圈
  const handleSpin = () => {
    setState("spinning");
    showBubble("哇！转圈圈好开心！🎉");
    setEmoji("🎉");
    if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
    emojiTimerRef.current = setTimeout(() => setEmoji(null), 1800);

    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1600);
  };

  // 猜拳对局（胜负判断已按规则完全重写，保证准确）
  const handleRPS = (choice: RPSChoice) => {
    const comp = RPS_OPTIONS[Math.floor(Math.random() * 3)].key;
    // 胜负判断：
    // 1) 手势相同 → 平局
    // 2) 用户手势克制桌宠手势（RPS_BEATS[choice] === comp）→ 用户赢
    // 3) 其余 → 用户输
    let result: "win" | "lose" | "draw";
    if (choice === comp) {
      result = "draw";
    } else if (RPS_BEATS[choice] === comp) {
      result = "win";
    } else {
      result = "lose";
    }
    setGameResult({ player: choice, comp, result });

    if (result === "win") {
      // 用户赢 → 桌宠开心动画 + 开心气泡
      setState("happy");
      showBubble("耶！你赢啦！太棒了！🎉");
    } else if (result === "lose") {
      // 用户输 → 桌宠伤心动画 + 伤心气泡
      setState("sad");
      showBubble("呜呜…你输啦，别难过呀 😢");
    } else {
      // 平局 → 平局气泡
      showBubble("平局！再来一局？🤝");
    }

    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1500);
  };

  // 商城：领取道具
  const addItem = (type: ItemType) => {
    setItems((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    const name = ITEMS.find((i) => i.key === type)?.name ?? "道具";
    showBubble(`获得 ${name}！`);
  };

  // 商城/背包：投喂道具（冷静时解除冷静）
  const feedItem = (type: ItemType) => {
    if (items[type] <= 0) {
      showBubble("背包里没有这个道具啦~");
      return;
    }
    // 若冷静尚未触发（延迟中），先取消，避免投喂后被冷静覆盖
    if (pendingCalmRef.current) {
      clearTimeout(pendingCalmRef.current);
      pendingCalmRef.current = null;
    }
    const name = ITEMS.find((i) => i.key === type)?.name ?? "道具";
    setItems((prev) => ({ ...prev, [type]: prev[type] - 1 }));
    setCalmUntil(null);
    setState("happy");
    showBubble(`谢谢你投喂 ${name}！我不冷静啦！💖`);
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1500);
  };

  // ========== 新增：拍照投喂（图像识别 + 投喂动画 + 语音播报）==========
  // ---- 预留：3D 模型扩展桥接接口 ----
  // 后续接入 3D 桌宠模型（如 three.js 加载 glTF）时，在页面初始化注册：
  //   window.__PET_3D_BRIDGE = {
  //     onFeed: (foodName: string) => { /* 播放 3D 进食动画 */ },
  //     setEmotion: (s: string) => { /* 切换 3D 表情 */ },
  //   };
  // 下方 feedNow() 已兼容调用（不存在则静默），无需改动其它逻辑。

  // 语音播报趣味台词（浏览器 SpeechSynthesis，需 HTTPS/localhost）
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 1.1;
      u.pitch = 1.2;
      window.speechSynthesis.speak(u);
    } catch {
      /* 语音不可用时静默 */
    }
  };

  // 打开摄像头（需 HTTPS/localhost，用户需授权）
  const openCamera = async () => {
    if (!window.isSecureContext) {
      showBubble("摄像头需要 HTTPS/localhost 环境");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showBubble("当前浏览器不支持摄像头");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      feedStreamRef.current = stream;
      setCameraOn(true);
      // 等视频元素挂载后再绑定媒体流
      setTimeout(() => {
        if (feedVideoRef.current) feedVideoRef.current.srcObject = stream;
      }, 60);
    } catch {
      showBubble("无法访问摄像头（可能已被拒绝授权）");
    }
  };

  const stopCamera = () => {
    feedStreamRef.current?.getTracks().forEach((t) => t.stop());
    feedStreamRef.current = null;
    setCameraOn(false);
  };

  // 拍照：把摄像头当前帧画到 canvas → dataURL
  const capturePhoto = () => {
    const video = feedVideoRef.current;
    if (!video || !video.videoWidth) {
      showBubble("摄像头画面未就绪，请稍后再拍");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    runFoodRecognition(canvas.toDataURL("image/jpeg", 0.85));
  };

  // 本地上传图片（前端压缩到最大 640px，减小上传体积）
  const handleFeedFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 640;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const scale = Math.min(max / w, max / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")?.drawImage(img, 0, 0, w, h);
        runFoodRecognition(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 提交图片到后端识别（消费每日额度；置信度<0.6 或非食物 → 提示）
  const runFoodRecognition = async (dataUrl: string) => {
    if (feedBusy) return;
    if (feedLeft <= 0) {
      showBubble(
        `今日拍照投喂次数已用完（${FEED_DAILY_LIMIT} 次），明天 0 点重置~`
      );
      return;
    }
    setFeedBusy(true);
    showBubble("正在识别图片中的食物…🔍");
    try {
      // 调用后端中转接口（密钥在后端环境变量，前端不接触密钥）
      const res = await fetch("/api/vision-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json().catch(() => null);
      // 仅当接口调用失败时弹出错误提示（正常识别不受影响）
      if (!res.ok || !data?.ok) {
        showBubble(data?.message || "识别服务调用失败，请稍后重试");
        return;
      }
      // 完成一次识别 → 占用一次每日额度（0 点自动重置）
      consumeFeedCount();
      setFeedLeft((v) => Math.max(0, v - 1));
      // 置信度低于阈值或识别为非食物 → 提示，不生成道具
      if (!data.isFood || data.confidence < FEED_CONF_THRESHOLD) {
        const why = !data.isFood
          ? "识别到的不是食物"
          : `置信度 ${(data.confidence * 100).toFixed(0)}% 偏低`;
        showBubble(`${why}，换个清晰的食物照片试试~`);
        return;
      }
      // 后端统一输出：{ foodName, foodType, nutrition, confidence, isFood }
      onFeedSuccess(data.foodName, data.foodType, data.nutrition);
    } catch {
      showBubble("网络异常，识别服务调用失败");
    } finally {
      setFeedBusy(false);
    }
  };

  // 识别成功：生成数字食物道具存入背包（与商城道具通用）→ 触发投喂动画 + 解除冷静
  const onFeedSuccess = (name: string, foodType?: string, nutrition?: string) => {
    // 道具类型优先使用后端返回的 foodType（fish/heart/candy），
    // 无效时回退到名称映射（复用 FOOD_MAP 规则，未命中默认小鱼干）
    const validTypes: ItemType[] = ["fish", "heart", "candy"];
    const item: ItemType =
      foodType && (validTypes as string[]).includes(foodType)
        ? (foodType as ItemType)
        : FOOD_MAP.find((f) => f.name.includes(name) || name.includes(f.name))
            ?.item ?? "fish";
    // 生成数字食物道具存入背包（localStorage 由 items 持久化 effect 自动保存）
    setItems((prev) => ({ ...prev, [item]: prev[item] + 1 }));
    // 解除冷静（与商城投喂一致）
    if (pendingCalmRef.current) {
      clearTimeout(pendingCalmRef.current);
      pendingCalmRef.current = null;
    }
    setCalmUntil(null);
    // 记录本次识别结果供飞行动画结束回调使用
    feedRef.current = { name, item, nutrition };
    const emoji = ITEMS.find((i) => i.key === item)?.emoji ?? "🍽️";
    // 2D 模拟投喂飞行动画：食物从面板中心飞到桌宠嘴边
    const petEl = petRef.current;
    const panelEl = feedPanelRef.current;
    if (petEl && panelEl) {
      const pr = panelEl.getBoundingClientRect();
      const pr2 = petEl.getBoundingClientRect();
      const fromX = pr.left + pr.width / 2;
      const fromY = pr.top + 10;
      setFlying({
        emoji,
        fromX,
        fromY,
        dx: pr2.left + pr2.width / 2 - fromX,
        dy: pr2.top + pr2.height / 2 - fromY,
      });
    } else {
      // 面板不可测量时直接进食
      feedNow();
    }
  };

  // 进食：切换进食表情，1000ms 后自动切回待机，播报 AI 趣味台词 + 语音，并调用 3D 桥接（如有）
  const feedNow = () => {
    const info = feedRef.current;
    const name = info?.name ?? "食物";
    setState("eating");
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    // 投喂成功显示进食图（pet_eat），1000ms 后自动切回待机
    stateTimerRef.current = setTimeout(() => setState("idle"), 1000);
    // AI 生成趣味台词 + 语音播报（带营养信息：后端返回 calorie 等）
    const line = FOOD_LINES[Math.floor(Math.random() * FOOD_LINES.length)](name);
    showBubble(info?.nutrition ? `${line}（${info.nutrition}）` : line);
    speak(line);
    // 预留 3D 模型扩展桥接（未注册则静默）
    try {
      (window as unknown as { __PET_3D_BRIDGE?: { onFeed?: (n: string) => void } })
        .__PET_3D_BRIDGE?.onFeed?.(name);
    } catch {
      /* 忽略 */
    }
  };

  // ========== 新增：对话模块 ==========
  // ---- 预留：接入真实大模型对话接口（模拟逻辑占位，后续替换）----
  // const LLM_API_URL = "https://your-llm-endpoint/v1/chat/completions";
  // const LLM_API_KEY = "sk-xxx"; // 生产环境务必放服务端，勿暴露前端
  // const chatWithAI = async (history: { role: "user" | "assistant"; content: string }[]) => {
  //   const res = await fetch(LLM_API_URL, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${LLM_API_KEY}`,
  //     },
  //     body: JSON.stringify({
  //       model: "gpt-4o-mini",
  //       messages: history,
  //     }),
  //   });
  //   const data = await res.json();
  //   return data.choices[0].message.content as string;
  // };

  // 追加一条对话消息（最多保留 50 条）
  const pushChat = (role: "user" | "bot", text: string) => {
    setChats((prev) => {
      const next = [...prev, { id: uid(), role, text, time: Date.now() }];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
  };

  // 发送文字消息（模拟 AI 回复；接入真实大模型后改为异步调用 chatWithAI）
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || isThinking || isListening) return;
    if (calmUntil && calmUntil > Date.now()) {
      showBubble("我在冷静中，不想聊天…");
      return;
    }
    pushChat("user", text);
    setChatInput("");
    setIsThinking(true);
    // 模拟思考延迟
    setTimeout(() => {
      pushChat("bot", simulateAIReply(text));
      setIsThinking(false);
    }, 600 + Math.random() * 700);
  };

  // 语音输入：浏览器原生 SpeechRecognition（仅 HTTPS/localhost 可用）
  const toggleListen = () => {
    // 正在识别 → 停止
    if (isListening) {
      srRef.current?.stop();
      return;
    }
    if (!SRCtor) {
      showBubble("当前浏览器不支持语音识别（需要 HTTPS/localhost）");
      return;
    }
    if (!window.isSecureContext) {
      showBubble("语音识别仅支持 HTTPS/localhost 环境");
      return;
    }
    // 先请求麦克风授权（授权成功后立即释放轨道，SpeechRecognition 自行管理录音）
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        const rec = new SRCtor();
        rec.lang = "zh-CN";
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (e: any) => {
          let final = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
          }
          if (final) setChatInput((prev) => (prev ? prev + final : final));
        };
        rec.onerror = (e: any) => {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setMicDenied(true);
            showBubble("麦克风授权被拒绝，无法使用语音输入");
          } else if (e.error === "no-speech") {
            showBubble("没有听到声音，请再试一次");
          }
          setIsListening(false);
        };
        rec.onend = () => setIsListening(false);
        srRef.current = rec;
        setMicDenied(false);
        setIsListening(true);
        rec.start();
      })
      .catch(() => {
        setMicDenied(true);
        showBubble("麦克风授权被拒绝，无法使用语音输入");
      });
  };

  // ========== 新增：识图投喂模块 ==========
  // ---- 预留：接入真实图片识别 API ----
  // const OCR_API_URL = "https://your-ocr-endpoint/recognize";
  // const recognizeImage = async (file: File) => {
  //   const form = new FormData();
  //   form.append("image", file);
  //   const res = await fetch(OCR_API_URL, { method: "POST", body: form });
  //   const data = await res.json();
  //   return data.foodName; // 返回识别出的食物名称
  // };

  // 处理用户选择的图片：模拟识别 → 生成投喂道具存入背包（复用商城投喂逻辑）
  const handleFoodFile = (file: File) => {
    if (!file) return;
    setRecognizing(true);
    showBubble("正在识别图片中的食物…🔍");
    // 模拟识别耗时（接入真实 API 后替换为异步请求 recognizeImage）
    setTimeout(() => {
      const food = FOOD_MAP[Math.floor(Math.random() * FOOD_MAP.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      setItems((prev) => ({ ...prev, [food.item]: prev[food.item] + qty }));
      setRecognizing(false);
      showBubble(`识别到「${food.name}」×${qty}，已存入背包！🍽️`);
    }, 900);
  };

  // ========== 新增：备忘录模块 ==========
  // 请求桌面通知授权（需要 HTTPS/localhost）
  const requestNotifyPermission = () => {
    if (typeof Notification === "undefined") {
      showBubble("当前环境不支持桌面通知（需要 HTTPS/localhost）");
      return;
    }
    if (!window.isSecureContext) {
      showBubble("桌面通知仅支持 HTTPS/localhost 环境");
      return;
    }
    Notification.requestPermission().then((p) => {
      if (p === "granted") showBubble("桌面通知已开启 ✅");
      else showBubble("通知权限未开启，到点将无法弹窗提醒");
    });
  };

  // 新增备忘录
  const addMemo = () => {
    const title = memoTitle.trim() || "未命名提醒";
    const content = memoContent.trim();
    const t = memoTime ? new Date(memoTime).getTime() : 0;
    if (!t) {
      showBubble("请先设置提醒时间");
      return;
    }
    setMemos((prev) => [...prev, { id: uid(), title, content, time: t }]);
    setMemoTitle("");
    setMemoContent("");
    setMemoTime("");
    showBubble("备忘录已添加 ✅");
  };

  // 删除备忘录
  const deleteMemo = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  // ========== 新增：截图 / 录屏模块（虚拟文件夹） ==========
  // 添加一条虚拟文件记录
  const addVFile = (name: string, kind: "image" | "video") => {
    setVfiles((prev) => [{ id: uid(), name, kind, time: Date.now() }, ...prev]);
  };
  const deleteVFile = (id: string) => {
    setVfiles((prev) => prev.filter((f) => f.id !== id));
  };
  const clearVFiles = () => {
    setVfiles([]);
    showBubble("虚拟文件夹记录已清空");
  };

  // 屏幕捕获可用性检查（getDisplayMedia 需要 HTTPS/localhost + 用户手动选择）
  const captureHint = (): boolean => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {
      showBubble("当前环境不支持屏幕捕获（需要 HTTPS/localhost）");
      return false;
    }
    if (!window.isSecureContext) {
      showBubble("屏幕捕获仅支持 HTTPS/localhost 环境");
      return false;
    }
    return true;
  };

  // 截图：屏幕捕获 → 画布绘制 → 下载图片 + 记录虚拟文件夹
  const takeScreenshot = async () => {
    if (!captureHint()) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 250)); // 等首帧渲染
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach((t) => t.stop());
      canvas.toBlob((blob) => {
        if (!blob) return;
        const name = `截图_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        addVFile(name, "image");
        showBubble("截图已下载，并记录到图片文件夹 📸");
      }, "image/png");
    } catch {
      showBubble("已取消屏幕捕获");
    }
  };

  // 录屏：MediaRecorder 录制 → 停止后下载 webm + 记录虚拟文件夹
  const toggleRecording = async () => {
    if (recording) {
      // 结束录制
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      return;
    }
    if (!captureHint()) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const name = `录屏_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.webm`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        addVFile(name, "video");
        showBubble("录屏已下载，并记录到视频文件夹 🎬");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      // 用户点击浏览器"停止共享"时同步结束录制
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      };
    } catch {
      showBubble("已取消屏幕捕获");
    }
  };

  // ========== 新增：错题 / 资料收集模块 ==========
  // 抓取页面当前选中的文字（抓取后清空选中状态并返回文本）
  const capturePageSelection = (): string => {
    const sel = window.getSelection?.();
    if (!sel || sel.isCollapsed) return "";
    const text = sel.toString().trim();
    if (text) {
      sel.removeAllRanges();
      return text;
    }
    return "";
  };

  // 保存一条资料（默认标题取文本前 14 字）
  const saveToLibrary = (text: string) => {
    const title = text.length > 14 ? text.slice(0, 14) + "…" : text;
    setLibrary((prev) => [{ id: uid(), title, text, time: Date.now() }, ...prev]);
  };

  const deleteLib = (id: string) => {
    setLibrary((prev) => prev.filter((l) => l.id !== id));
  };

  const startRename = (id: string, cur: string) => {
    setRenamingId(id);
    setRenameVal(cur);
  };

  const commitRename = (id: string) => {
    const val = renameVal.trim();
    if (val) {
      setLibrary((prev) => prev.map((l) => (l.id === id ? { ...l, title: val } : l)));
    }
    setRenamingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ========== 新增：资料查询模块 ==========
  // ---- 预留：接入第三方搜索引擎接口 ----
  // const SEARCH_API_URL = "https://your-search-api?q=";
  // const searchWeb = async (kw: string) => {
  //   const res = await fetch(SEARCH_API_URL + encodeURIComponent(kw));
  //   const data = await res.json();
  //   return data.results as { title: string; url: string; snippet: string }[];
  // };

  // 模拟搜索：返回占位结果（接入真实搜索 API 后替换为 searchWeb）
  const simulateSearch = (kw: string) => {
    const q = kw.trim();
    if (!q) {
      showBubble("请输入查询关键词");
      return;
    }
    setSearchSummary(null);
    setSearchResults([
      {
        title: `${q} - 百科词条`,
        url: `https://example.com/wiki/${encodeURIComponent(q)}`,
        snippet: `关于「${q}」的百科介绍（模拟结果）。接入真实搜索 API 后将返回实时网页内容。`,
      },
      {
        title: `${q} 相关教程`,
        url: `https://example.com/tutorial/${encodeURIComponent(q)}`,
        snippet: "（模拟结果）相关教程与经验分享。",
      },
      {
        title: `${q} 热门问答`,
        url: `https://example.com/qa/${encodeURIComponent(q)}`,
        snippet: "（模拟结果）社区精选问答。",
      },
    ]);
  };

  // 进阶智能解析：把搜索结果交给大模型总结（模拟；预留接口模板见注释）
  const simulateParse = () => {
    if (!searchResults) {
      showBubble("请先执行搜索");
      return;
    }
    setParsing(true);
    // ---- 预留：把 searchResults 作为上下文提交给大模型 ----
    // const summarizeResults = async (results: typeof searchResults) => {
    //   const res = await fetch(LLM_API_URL, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${LLM_API_KEY}`,
    //     },
    //     body: JSON.stringify({
    //       model: "gpt-4o-mini",
    //       messages: [
    //         { role: "user", content: "请用中文总结以下搜索结果的要点：" + JSON.stringify(results) },
    //       ],
    //     }),
    //   });
    //   const data = await res.json();
    //   return data.choices[0].message.content as string;
    // };
    setTimeout(() => {
      setParsing(false);
      setSearchSummary(
        `（模拟总结）针对「${searchKw}」的搜索结果共 ${searchResults.length} 条：以上为模拟结果，暂未接入真实搜索引擎与大模型。接入后我将帮你提炼重点、对比结论。`
      );
    }, 1000);
  };

  // ========== 指针交互（点击激活 + 手势识别 + 长按拖拽）==========
  // 规则：
  // 1. 第一次点击桌宠 → 激活互动模式，开始监听手势（不进入拖拽）
  // 2. 激活后按住并移动超过 8px → 进入拖拽模式（isDragging），可自由拖动桌宠
  // 3. 拖拽期间跳过全部手势识别（挠痒 / 点击脑袋 / 画圈），松手保存坐标 + 落地动画
  // 4. 激活后仅当鼠标在桌宠范围内时识别手势；鼠标离开 → 立即退出互动、重置轨迹
  // 5. 离开后需重新点击桌宠才能再次互动；拖拽中 mouseleave 不退出拖拽

  // 按压开始：未激活则先激活（本次点击只激活、不触发肢体互动、不拖拽）；
  // 已激活则记录按压区域、起点与拖拽偏移，供移动/松开时区分拖拽与点击
  const handlePointerDown = (e: React.PointerEvent) => {
    // 冷静模式下禁用全部交互
    if (calmUntil && calmUntil > Date.now()) {
      showBubble(`我在冷静中…剩余 ${formatCalm(calmUntil - Date.now())}`);
      gestureRef.current.zone = "none";
      return;
    }

    // 抓取页面选中文字 → 自动收藏到资料库（点击桌宠即收集）
    const selText = capturePageSelection();
    if (selText) {
      saveToLibrary(selText);
      showBubble("已收藏到资料库 📚");
    }

    e.preventDefault();
    const rect = petRef.current?.getBoundingClientRect();
    if (!rect) return;

    const g = gestureRef.current;

    // 第一次点击桌宠：仅激活互动模式，不触发肢体互动，也不进入拖拽
    if (!interactionActive) {
      setInteractionActive(true);
      g.zone = "none";
      g.circleAngle = 0;
      g.lastAngleInit = false;
      g.gestureDone = false;
      setShowClose(true);
      return;
    }

    // 已激活：记录按压区域与起点，供松开/移动时识别手势
    const offsetY = e.clientY - rect.top;
    g.zone = getZone(offsetY);
    g.downX = e.clientX;
    g.downY = e.clientY;
    g.circleAngle = 0;
    g.lastAngleInit = false;
    g.gestureDone = false;

    // 记录拖拽起点与按下偏移（供移动时计算新坐标）
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.offsetX = e.clientX - rect.left;
    dragRef.current.offsetY = e.clientY - rect.top;
    dragRef.current.dragged = false;

    // 按压期间暂停自动游走，避免行走动画与交互/拖拽冲突
    resetWander();

    setShowClose(true);
  };

  // 拖拽移动桌宠：按指针当前位置与按下时偏移计算新坐标，并做屏幕边界限制
  const movePet = (e: React.PointerEvent) => {
    const next = clampPosition(
      e.clientX - dragRef.current.offsetX,
      e.clientY - dragRef.current.offsetY
    );
    setPosition(next);
    // 同步最新坐标到 ref，保证拖拽松手瞬间保存的是最后位置
    positionRef.current = next;
  };

  // 指针移动：拖拽中只更新位置；未拖拽时识别手势（头顶画圈），
  // 头部/身体区域按住位移超过阈值（8px）判定为拖拽
  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!interactionActive) return;
    if (g.zone === "none") return;
    if (calmUntil && calmUntil > Date.now()) return;

    const rect = petRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 拖拽模式：只更新桌宠位置，跳过全部手势识别（挠痒 / 点击脑袋 / 画圈）
    if (isDragging) {
      movePet(e);
      return;
    }

    // 头顶区域：画圈手势识别（计算绕中心的角度累计），不进入拖拽
    if (g.zone === "halo") {
      const cx = rect.width / 2;
      const cy = (rect.height * ZONE_HALO_END) / 2;
      const angle = Math.atan2(
        e.clientY - rect.top - cy,
        e.clientX - rect.left - cx
      );
      if (!g.lastAngleInit) {
        g.lastAngle = angle;
        g.lastAngleInit = true;
      }
      let diff = angle - g.lastAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.circleAngle += Math.abs(diff);
      g.lastAngle = angle;
      if (g.circleAngle >= CIRCLE_ANGLE) {
        g.gestureDone = true;
        handleSpin();
      }
      return;
    }

    // 头部/身体区域：按住移动超过位移阈值 → 判定为拖拽（屏蔽本次点击）
    const moved =
      Math.abs(e.clientX - dragRef.current.startX) +
      Math.abs(e.clientY - dragRef.current.startY);
    if (moved > DRAG_THRESHOLD) {
      setIsDragging(true);
      dragRef.current.dragged = true;
      // 捕获指针：拖拽中鼠标移出桌宠区域仍持续跟踪，mouseleave 不退出拖拽
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* 个别浏览器可能抛错，忽略即可 */
      }
      movePet(e);
    }
  };

  // 指针松开：判定 拖拽结束（保存坐标 + 落地动画）/ 手势完成 / 点击 / 普通结束
  const handlePointerUp = (e: React.PointerEvent) => {
    // 冷静模式下禁止一切交互
    if (calmUntil && calmUntil > Date.now()) {
      gestureRef.current.zone = "none";
      setIsDragging(false);
      dragRef.current.dragged = false;
      return;
    }
    const g = gestureRef.current;
    // 未激活点击 / 已离开时 zone 为 "none"，直接忽略
    if (g.zone === "none") {
      setIsDragging(false);
      dragRef.current.dragged = false;
      return;
    }

    // ---- 拖拽结束：保存新坐标 + 播放落地动画（疑惑→害怕→舒一口气）----
    if (isDragging || dragRef.current.dragged) {
      setIsDragging(false);
      setShowClose(false);
      // 保存桌宠新坐标到本地存储，刷新页面位置不重置
      saveJSON(PET_POS_KEY, positionRef.current);
      // 拖拽松手落地 → 疑惑 → 害怕 → 长舒一口气 三段动画
      playSequence([
        { s: "confused", ms: 1000 },
        { s: "scared", ms: 1200 },
        { s: "relieved", ms: 1200 },
      ]);
      showBubble("哎呀！吓死我了…呼~");
      // 三段动画总时长 3.4s，暂停自动游走 4s 防止被行走动画打断
      resetWander(4000);
      g.zone = "none";
      g.gestureDone = false;
      dragRef.current.dragged = false;
      return;
    }

    const moved =
      Math.abs(e.clientX - g.downX) + Math.abs(e.clientY - g.downY);

    // 画圈手势已完成
    if (g.gestureDone) {
      g.zone = "none";
      g.gestureDone = false;
      setShowClose(false);
      resetWander();
      return;
    }

    // 纯点击（几乎未移动）
    if (moved < 5) {
      if (g.zone === "head") {
        // 点击脑袋 → 委屈表情（pet_sad）
        setState("sad");
        showBubble("呜呜~不许碰我的脑袋！😤");
        setEmoji("😤");
        if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
        emojiTimerRef.current = setTimeout(() => setEmoji(null), 1500);
        if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
        stateTimerRef.current = setTimeout(() => setState("idle"), 1200);
      } else if (g.zone === "body") {
        // 点击肚子 → 大笑（挠痒计数，累计 3 次进入冷静）
        handleScratch();
      } else {
        // 其他区域点击 → 原随机交互
        handleClick();
      }
      g.zone = "none";
      setShowClose(false);
      resetWander();
      return;
    }

    // 有移动但未完成手势：清理轨迹记录
    g.zone = "none";
    setShowClose(false);
    resetWander();
  };

  // 鼠标离开桌宠区域：非拖拽状态下立即退出互动状态，重置全部手势轨迹记录；
  // 拖拽中 mouseleave 不退出拖拽（指针已捕获，可继续拖动）
  const handlePointerLeave = () => {
    if (isDragging) return;
    setInteractionActive(false);
    const g = gestureRef.current;
    g.zone = "none";
    g.circleAngle = 0;
    g.lastAngle = 0;
    g.lastAngleInit = false;
    g.gestureDone = false;
    setShowClose(false);
  };

  // 关闭桌宠（原逻辑）
  const handleClose = useCallback(() => {
    if (petRef.current) {
      petRef.current.style.display = "none";
    }
  }, []);

  // 窗口大小变化时重新约束位置（原逻辑）
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  // 清理定时器（原逻辑 + 过渡计时器 + 录屏/语音资源）
  useEffect(() => {
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
      if (pendingCalmRef.current) clearTimeout(pendingCalmRef.current);
      if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
      // 卸载时释放录屏、语音与摄像头资源
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      feedStreamRef.current?.getTracks().forEach((t) => t.stop());
      srRef.current?.stop();
    };
  }, []);

  // ---- 新增：猜拳 / 拍照投喂弹窗定位逻辑（弹窗只显示在桌宠正下方）----

  // 打开弹窗：默认放在桌宠正下方、水平居中；若下方空间不足，
  // 不移动弹窗，而是把桌宠整体向上偏移腾出空间（带平滑过渡），
  // 且保证桌宠不跑出屏幕顶部。（猜拳面板与拍照投喂面板复用同一套逻辑）
  useEffect(() => {
    if (!showGame && !showFeed) return;
    // 记录桌宠原始坐标（关闭弹窗后恢复）
    rpsOriginRef.current = { x: position.x, y: position.y };
    // 打开弹窗期间暂停自动漫游，保证弹窗跟随的桌宠位置稳定、关闭后能精确回位
    wanderRef.current.isWandering = false;
    wanderRef.current.pauseUntil = performance.now() + 3600 * 1000;
    setState("idle");
    // 等一帧，确保面板渲染完成、能测量到弹窗自身宽高
    const raf = requestAnimationFrame(() => {
      const petEl = petRef.current;
      const panelEl = (showFeed ? feedPanelRef.current : rpsPanelRef.current);
      if (!petEl) return;
      const rect = petEl.getBoundingClientRect();
      const panelH = panelEl ? panelEl.getBoundingClientRect().height : 150;
      const GAP = 8; // 弹窗与桌宠底边的间距
      const panelBottom = rect.bottom + GAP + panelH;
      if (panelBottom > window.innerHeight) {
        const shift = panelBottom - window.innerHeight + 8; // 需要上移的量（含余量）
        // 上限保护：桌宠不能跑出浏览器屏幕顶部
        const newY = Math.max(0, rect.top - shift);
        if (Math.abs(newY - rect.top) > 1) {
          setSmoothShift(true);
          setPosition((prev) => ({ x: prev.x, y: newY }));
          if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
          shiftTimerRef.current = setTimeout(() => setSmoothShift(false), 400);
        }
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGame, showFeed]);

  // 关闭弹窗：桌宠平滑回到打开前的位置，并恢复自动漫游
  useEffect(() => {
    if (showGame || showFeed) return;
    const origin = rpsOriginRef.current;
    if (origin) {
      rpsOriginRef.current = null;
      setPosition((prev) => {
        const same =
          Math.abs(prev.x - origin.x) < 1 && Math.abs(prev.y - origin.y) < 1;
        return same ? prev : origin;
      });
      setSmoothShift(true);
      if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
      shiftTimerRef.current = setTimeout(() => setSmoothShift(false), 400);
      // 恢复自动漫游（延迟 600ms，等回位过渡播完再开始游走）
      wanderRef.current.isWandering = false;
      wanderRef.current.pauseUntil = performance.now() + 600;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGame, showFeed]);

  // ---- 新增：侧边面板定位（依附桌宠 + 边界检测 + 避让情绪气泡）----
  useEffect(() => {
    if (!showSide) return;
    // 面板打开期间暂停自动漫游，保证桌宠位置稳定、面板不会跟着跑
    wanderRef.current.isWandering = false;
    wanderRef.current.pauseUntil = performance.now() + 3600 * 1000;
    setState("idle");
    // 等一帧确保面板渲染完成、能测量到实际宽高
    const raf = requestAnimationFrame(() => {
      const petEl = petRef.current;
      const panelEl = sidePanelRef.current;
      if (!petEl || !panelEl) return;
      const petRect = petEl.getBoundingClientRect();
      const panelW = panelEl.offsetWidth;
      const panelH = panelEl.offsetHeight;
      // 水平：默认放在桌宠右侧；右侧放不下则翻转到左侧，左边缘再兜底
      let left = petRect.width + 8;
      if (petRect.right + 8 + panelW > window.innerWidth) {
        left = -panelW - 8;
      }
      if (petRect.left + left < 8) left = 8 - petRect.left;
      // 垂直：以桌宠中心为基准；有气泡时避让气泡区域（气泡在桌宠上方）；
      // 同时夹紧在视口内，若空间不足则优先保证不超出屏幕
      let top = petRect.height / 2 - panelH / 2;
      const bubbleMin = bubble ? -(PET_SIZE + 8) : -Infinity;
      const viewportMin = 8 - petRect.top;
      const viewportMax = window.innerHeight - 8 - panelH - petRect.top;
      const minTop = Math.max(bubbleMin, viewportMin);
      if (minTop > viewportMax) {
        top = Math.max(0, viewportMax);
      } else {
        top = Math.min(Math.max(top, minTop), viewportMax);
      }
      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSide, sideTab, bubble]);

  // 关闭侧边面板：恢复自动漫游
  useEffect(() => {
    if (showSide) return;
    wanderRef.current.isWandering = false;
    wanderRef.current.pauseUntil = performance.now() + 600;
  }, [showSide]);

  // 动画状态类名映射
  const petAnimClass = {
    idle: "pet-idle",
    walking: "pet-walking",
    reacting: "pet-reacting",
    angry: "pet-angry",
    laughing: "pet-laughing",
    spinning: "pet-spinning",
    confused: "pet-confused",
    scared: "pet-scared",
    relieved: "pet-relieved",
    happy: "pet-happy",
    sad: "pet-sad",
    eating: "pet-eating",
  }[state];

  // 猜拳结果文案（以玩家视角展示：你 vs 桌宠）
  const resultText =
    gameResult?.result === "win"
      ? "你赢啦！🎉"
      : gameResult?.result === "lose"
        ? "你输啦…😢"
        : "平局！🤝";

  return (
    <>
      {/* 桌宠主体 */}
      <div
        ref={petRef}
        className="desktop-pet"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${PET_SIZE}px`,
          height: `${PET_SIZE}px`,
          zIndex: 9999,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
          transition: isDragging
            ? "none"
            : smoothShift
              ? "left 0.35s ease, top 0.35s ease"
              : "left 0.1s linear, top 0.1s linear",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* 关闭按钮 */}
        {showClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="pet-close"
            aria-label="关闭桌宠"
          >
            ×
          </button>
        )}

        {/* 图片精灵：表情帧随状态切换（300ms 淡入淡出） */}
        <img
          src={frameSrc}
          alt="My Baby 桌宠"
          className={`pet-sprite ${petAnimClass}`}
          style={{
            opacity: frameVisible ? 1 : 0,
            transform: facing === "left" ? "scaleX(-1)" : "none",
          }}
          draggable={false}
        />

        {/* ---- 新增：工具栏（猜拳 / 商城 / 功能面板）---- */}
        <div className="pet-toolbar">
          <button
            className="pet-tool-btn"
            aria-label="猜拳小游戏"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              // 冷静时不能玩游戏
              if (calmUntil && calmUntil > Date.now()) {
                showBubble("我在冷静中，不玩游戏~");
                return;
              }
              setShowGame((v) => !v);
              setShowShop(false);
              setShowSide(false);
              setShowFeed(false);
            }}
          >
            ✊
          </button>
          <button
            className="pet-tool-btn"
            aria-label="拍照投喂"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowFeed((v) => !v);
              setShowGame(false);
              setShowShop(false);
              setShowSide(false);
            }}
          >
            📷
          </button>
          <button
            className="pet-tool-btn"
            aria-label="道具商城"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowShop((v) => !v);
              setShowGame(false);
              setShowSide(false);
              setShowFeed(false);
            }}
          >
            🛍️
          </button>
          <button
            className="pet-tool-btn"
            aria-label="功能面板"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowSide((v) => !v);
              setShowGame(false);
              setShowShop(false);
              setShowFeed(false);
            }}
          >
            🧰
          </button>
        </div>

        {/* ---- 新增：投喂飞行动画（食物从面板飞到桌宠嘴边，动画结束后进食）---- */}
        {flying && (
          <div
            className="pet-flying-food"
            style={
              {
                left: flying.fromX,
                top: flying.fromY,
                "--fly-dx": `${flying.dx}px`,
                "--fly-dy": `${flying.dy}px`,
              } as React.CSSProperties
            }
            onAnimationEnd={() => {
              setFlying(null);
              feedNow();
            }}
          >
            {flying.emoji}
          </div>
        )}

        {/* ---- 新增：冷静徽标（显示剩余时间，每秒刷新）---- */}
        {calmUntil && calmUntil > Date.now() && (
          <div className="pet-calm-badge">
            ❄️ 冷静中 {formatCalm(calmLeft * 1000)}
          </div>
        )}

        {/* ---- 新增：猜拳小游戏面板 ---- */}
        {showGame && (
          <div
            ref={rpsPanelRef}
            className="pet-panel pet-panel-below"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="pet-panel-title">猜拳小游戏</div>
            {gameResult && (
              <div className="pet-rps-result">
                你出 {RPS_LABEL[gameResult.player]} vs 我出{" "}
                {RPS_LABEL[gameResult.comp]}
                <br />
                <b>{resultText}</b>
              </div>
            )}
            <div className="pet-rps-btns">
              {RPS_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  className="pet-rps-btn"
                  onClick={() => handleRPS(o.key)}
                  title={o.label}
                >
                  <RPSIcon choice={o.key} />
                </button>
              ))}
            </div>
            <button
              className="pet-panel-close"
              onClick={() => setShowGame(false)}
            >
              关闭
            </button>
          </div>
        )}

        {/* ---- 新增：拍照投喂面板（复用猜拳弹窗定位：桌宠正下方，空间不足自动上移桌宠）---- */}
        {showFeed && (
          <div
            ref={feedPanelRef}
            className="pet-panel pet-panel-below"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="pet-panel-title">📷 拍照投喂</div>
            <div className="pet-feed-left">
              今日剩余 <b>{feedLeft}</b> / {FEED_DAILY_LIMIT} 次（0 点重置）
            </div>
            {cameraOn ? (
              <>
                <video
                  ref={feedVideoRef}
                  className="pet-feed-video"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="pet-feed-btns">
                  <button
                    className="pet-item-btn"
                    onClick={capturePhoto}
                    disabled={feedBusy}
                  >
                    📸 拍照识别
                  </button>
                  <button
                    className="pet-item-btn secondary"
                    onClick={stopCamera}
                  >
                    关闭摄像头
                  </button>
                </div>
              </>
            ) : (
              <div className="pet-feed-btns">
                <button
                  className="pet-item-btn"
                  onClick={openCamera}
                  disabled={feedBusy}
                >
                  📷 打开摄像头
                </button>
                <button
                  className="pet-item-btn"
                  onClick={() => feedFileInputRef.current?.click()}
                  disabled={feedBusy}
                >
                  🖼️ 本地上传
                </button>
              </div>
            )}
            <input
              ref={feedFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFeedFile(f);
                e.target.value = "";
              }}
            />
            {feedBusy && <div className="pet-hint">识别中…</div>}
            <div className="pet-hint-muted">
              需 HTTPS/localhost 环境；置信度低于 60% 或非食物将提示；
              识别成功自动生成投喂道具并解除冷静
            </div>
            <button
              className="pet-panel-close"
              onClick={() => {
                setShowFeed(false);
                stopCamera();
              }}
            >
              关闭
            </button>
          </div>
        )}

        {/* ---- 新增：模拟商城 + 道具背包面板 ---- */}
        {showShop && (
          <div className="pet-panel" onPointerDown={(e) => e.stopPropagation()}>
            <div className="pet-panel-title">道具商城 & 背包</div>
            {ITEMS.map((item) => (
              <div key={item.key} className="pet-item-row">
                <span className="pet-item-info">
                  {item.emoji} {item.name}{" "}
                  <span className="pet-item-count">×{items[item.key]}</span>
                  <span className="pet-item-desc">{item.desc}</span>
                </span>
                <span className="pet-item-actions">
                  <button
                    className="pet-item-btn secondary"
                    onClick={() => addItem(item.key)}
                  >
                    领取
                  </button>
                  <button
                    className="pet-item-btn"
                    disabled={items[item.key] <= 0}
                    onClick={() => feedItem(item.key)}
                  >
                    投喂
                  </button>
                </span>
              </div>
            ))}
            <button
              className="pet-panel-close"
              onClick={() => setShowShop(false)}
            >
              关闭
            </button>
          </div>
        )}

        {/* ---- 新增：多功能悬浮侧边面板（对话 / 识图 / 备忘 / 录制 / 资料 / 查询）---- */}
        {showSide && (
          <div
            ref={sidePanelRef}
            className="pet-panel pet-side-panel"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="pet-side-head">
              <span className="pet-panel-title">功能面板</span>
              <button
                className="pet-side-close"
                onClick={() => setShowSide(false)}
                aria-label="关闭面板"
              >
                ×
              </button>
            </div>

            {/* 选项卡 */}
            <div className="pet-side-tabs">
              {SIDE_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`pet-side-tab${sideTab === t.key ? " active" : ""}`}
                  onClick={() => setSideTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="pet-side-body">
              {/* ---- 模块1：对话（文字 + 语音）---- */}
              {sideTab === "chat" && (
                <div className="pet-chat">
                  <div className="pet-chat-list">
                    {chats.length === 0 && (
                      <div className="pet-chat-empty">
                        和我聊聊吧~ 支持文字或语音输入 💬
                      </div>
                    )}
                    {chats.map((c) => (
                      <div key={c.id} className={`pet-chat-msg ${c.role}`}>
                        {c.text}
                      </div>
                    ))}
                    {isThinking && <div className="pet-chat-msg bot">正在思考…</div>}
                  </div>
                  <div className="pet-chat-input-row">
                    <input
                      className="pet-chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendChat();
                      }}
                      placeholder="输入消息…"
                      maxLength={300}
                    />
                    <button
                      className="pet-chat-mic"
                      disabled={!SRCtor || micDenied}
                      title={
                        !SRCtor
                          ? "当前浏览器不支持语音识别（需要 HTTPS/localhost）"
                          : micDenied
                            ? "麦克风授权被拒绝"
                            : isListening
                              ? "点击停止"
                              : "语音输入"
                      }
                      onClick={toggleListen}
                    >
                      {isListening ? "◼" : "🎤"}
                    </button>
                    <button
                      className="pet-chat-send"
                      onClick={sendChat}
                      disabled={!chatInput.trim() || isThinking}
                    >
                      发送
                    </button>
                  </div>
                  <p className="pet-hint-muted">
                    语音识别需要 HTTPS/localhost 环境与麦克风授权；AI 回复为模拟逻辑，
                    预留真实大模型接口位置。
                  </p>
                </div>
              )}

              {/* ---- 模块2：识图投喂 ---- */}
              {sideTab === "food" && (
                <div className="pet-food">
                  <p className="pet-hint">
                    上传食物图片，自动识别并转换为背包投喂道具。
                  </p>
                  <input
                    ref={foodInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFoodFile(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className="pet-upload-btn"
                    disabled={recognizing}
                    onClick={() => foodInputRef.current?.click()}
                  >
                    {recognizing ? "识别中…" : "📤 上传图片识别"}
                  </button>
                  <p className="pet-hint-muted">
                    当前为模拟识别（预留真实识图 API 接口）。识别得到的道具可在
                    「商城」背包投喂，用来解除桌宠冷静状态。
                  </p>
                </div>
              )}

              {/* ---- 模块3：备忘录提醒 ---- */}
              {sideTab === "memo" && (
                <div className="pet-memo">
                  <div className="pet-memo-form">
                    <input
                      className="pet-memo-input"
                      value={memoTitle}
                      onChange={(e) => setMemoTitle(e.target.value)}
                      placeholder="标题"
                      maxLength={30}
                    />
                    <input
                      className="pet-memo-input"
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      placeholder="内容（可选）"
                      maxLength={80}
                    />
                    <input
                      className="pet-memo-input"
                      type="datetime-local"
                      value={memoTime}
                      onChange={(e) => setMemoTime(e.target.value)}
                    />
                    <div className="pet-memo-actions">
                      <button className="pet-item-btn" onClick={addMemo}>
                        添加提醒
                      </button>
                      <button
                        className="pet-item-btn secondary"
                        onClick={requestNotifyPermission}
                      >
                        开启通知
                      </button>
                    </div>
                    <p className="pet-hint-muted">
                      {typeof Notification !== "undefined" &&
                      Notification.permission === "granted"
                        ? "桌面通知已开启 ✅ 到点自动提醒"
                        : "桌面通知需要 HTTPS/localhost 环境与授权"}
                    </p>
                  </div>
                  <div className="pet-memo-list">
                    {memos.length === 0 && (
                      <div className="pet-chat-empty">暂无备忘录</div>
                    )}
                    {memos.map((m) => (
                      <div key={m.id} className="pet-memo-item">
                        <div className="pet-memo-item-top">
                          <b>{m.title}</b>
                          <button
                            className="pet-lib-del"
                            onClick={() => deleteMemo(m.id)}
                            title="删除"
                          >
                            ✕
                          </button>
                        </div>
                        {m.content && (
                          <div className="pet-memo-item-content">{m.content}</div>
                        )}
                        <div className="pet-memo-item-time">
                          ⏰{" "}
                          {new Date(m.time).toLocaleString("zh-CN", {
                            hour12: false,
                          })}
                          {m.notified ? " · 已提醒" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- 模块4：截图 / 录屏（虚拟文件夹）---- */}
              {sideTab === "capture" && (
                <div className="pet-capture">
                  <p className="pet-hint">
                    屏幕捕获需要 HTTPS/localhost 环境，且需在浏览器弹窗中手动确认选择。
                  </p>
                  <div className="pet-capture-btns">
                    <button className="pet-upload-btn" onClick={takeScreenshot}>
                      📸 截图
                    </button>
                    <button
                      className={`pet-upload-btn${recording ? " recording" : ""}`}
                      onClick={toggleRecording}
                    >
                      {recording ? "⏹ 结束录制" : "🎥 开始录制"}
                    </button>
                  </div>
                  <div className="pet-file-list">
                    <div className="pet-file-head">
                      <span>📁 虚拟文件夹（文件记录）</span>
                      {vfiles.length > 0 && (
                        <button className="pet-lib-del" onClick={clearVFiles}>
                          清空
                        </button>
                      )}
                    </div>
                    {vfiles.length === 0 && (
                      <div className="pet-chat-empty">
                        暂无记录（文件会下载到本地，这里只记录元数据）
                      </div>
                    )}
                    {vfiles.map((f) => (
                      <div key={f.id} className="pet-file-item">
                        <span>
                          {f.kind === "image" ? "🖼️" : "🎬"} {f.name}
                        </span>
                        <button
                          className="pet-lib-del"
                          onClick={() => deleteVFile(f.id)}
                          title="删除记录"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- 模块5：错题 & 资料收集 ---- */}
              {sideTab === "lib" && (
                <div className="pet-lib">
                  <p className="pet-hint">
                    在页面选中任意文字后点击桌宠，即可自动收藏到资料库。
                  </p>
                  {library.length === 0 && (
                    <div className="pet-chat-empty">暂无收藏资料</div>
                  )}
                  {library.map((l) => (
                    <div key={l.id} className="pet-lib-item">
                      <div className="pet-lib-item-top">
                        {renamingId === l.id ? (
                          <input
                            className="pet-lib-rename"
                            value={renameVal}
                            onChange={(e) => setRenameVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(l.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => commitRename(l.id)}
                            autoFocus
                          />
                        ) : (
                          <b onClick={() => toggleExpand(l.id)} title="点击查看全文">
                            {l.title}
                          </b>
                        )}
                        <div className="pet-lib-actions">
                          <button
                            className="pet-lib-del"
                            onClick={() => startRename(l.id, l.title)}
                            title="重命名"
                          >
                            ✏️
                          </button>
                          <button
                            className="pet-lib-del"
                            onClick={() => deleteLib(l.id)}
                            title="删除"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="pet-lib-time">
                        {new Date(l.time).toLocaleString("zh-CN", {
                          hour12: false,
                        })}
                      </div>
                      {expandedId === l.id && (
                        <div className="pet-lib-text">{l.text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ---- 模块6：资料查询（搜索 + 智能解析）---- */}
              {sideTab === "search" && (
                <div className="pet-search">
                  <div className="pet-search-row">
                    <input
                      className="pet-chat-input"
                      value={searchKw}
                      onChange={(e) => setSearchKw(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") simulateSearch(searchKw);
                      }}
                      placeholder="输入查询关键词…"
                    />
                    <button
                      className="pet-chat-send"
                      onClick={() => simulateSearch(searchKw)}
                    >
                      搜索
                    </button>
                  </div>
                  {searchResults && (
                    <>
                      <div className="pet-search-results">
                        {searchResults.map((r, i) => (
                          <div key={i} className="pet-search-result">
                            <a href={r.url} target="_blank" rel="noreferrer">
                              {r.title}
                            </a>
                            <p>{r.snippet}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        className="pet-upload-btn"
                        disabled={parsing}
                        onClick={simulateParse}
                      >
                        {parsing ? "解析中…" : "🤖 智能解析总结"}
                      </button>
                      {searchSummary && (
                        <div className="pet-search-summary">{searchSummary}</div>
                      )}
                    </>
                  )}
                  <p className="pet-hint-muted">
                    当前为模拟搜索与模拟解析，预留了真实搜索 / 大模型接口位置。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 气泡 */}
        {bubble && (
          <div
            className="pet-bubble"
            style={{
              position: "absolute",
              bottom: `${PET_SIZE + 8}px`,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {bubble}
            <div className="pet-bubble-arrow" />
          </div>
        )}

        {/* 飘起的表情 */}
        {emoji && (
          <div
            className="pet-emoji"
            style={{
              position: "absolute",
              top: "-8px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {emoji}
          </div>
        )}
      </div>
    </>
  );
}
