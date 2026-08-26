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
  | "happy" // 猜拳赢/投喂开心
  | "sad"; // 猜拳输/进入冷静

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
  const [position, setPosition] = useState<Position>({ x: -1, y: -1 });
  const [state, setState] = useState<PetState>("idle");
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [showClose, setShowClose] = useState(false);

  // ---- 新增：持久化状态（localStorage）----
  const [calmUntil, setCalmUntil] = useState<number | null>(null); // 冷静截止时间
  const [scratchCount, setScratchCount] = useState(0); // 挠痒累计次数
  const [items, setItems] = useState<Record<ItemType, number>>(
    DEFAULT_PERSISTED.items
  );

  // ---- 新增：UI 面板状态 ----
  const [showGame, setShowGame] = useState(false); // 猜拳面板
  const [showShop, setShowShop] = useState(false); // 商城面板
  const [gameResult, setGameResult] = useState<{
    player: RPSChoice;
    comp: RPSChoice;
    result: "win" | "lose" | "draw";
  } | null>(null);
  const [calmLeft, setCalmLeft] = useState(0); // 冷静剩余秒数

  // ---- 新增：互动状态（点击桌宠激活，鼠标离开退出）----
  const [interactionActive, setInteractionActive] = useState(false); // 是否处于手势监听状态

  // ---- 新增：猜拳弹窗定位 ----
  const [smoothShift, setSmoothShift] = useState(false); // 桌宠平滑上移/回位过渡标记
  const rpsPanelRef = useRef<HTMLDivElement>(null); // 猜拳面板（用于测量弹窗尺寸）
  const rpsOriginRef = useRef<Position | null>(null); // 打开猜拳弹窗时桌宠的原始坐标
  const shiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 过渡结束恢复计时器

  // ---- 原有 refs ----
  const petRef = useRef<HTMLDivElement>(null);
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

  // ---- 初始化位置（右下角）----
  useEffect(() => {
    setPosition({
      x: window.innerWidth - PET_SIZE - MARGIN,
      y: window.innerHeight - PET_SIZE - MARGIN,
    });
  }, []);

  // ---- 新增：挂载时从 localStorage 加载持久化状态 ----
  useEffect(() => {
    const s = loadPersisted();
    setCalmUntil(s.calmUntil);
    setScratchCount(s.scratchCount);
    setItems(s.items);
  }, []);

  // ---- 新增：持久化状态变化时写入 localStorage ----
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ calmUntil, scratchCount, items })
    );
  }, [calmUntil, scratchCount, items]);

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
  }, [position.x, clampPosition]);

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

  // ========== 指针交互（点击激活 + 手势识别）==========
  // 规则：
  // 1. 拖动移动功能已删除，鼠标滑动不再移动桌宠，桌宠位置不受鼠标影响
  // 2. 第一次点击桌宠 → 激活互动模式，才开始监听手势
  // 3. 激活后仅当鼠标在桌宠范围内时识别手势（点击脑袋/肚子、头顶画圈）
  // 4. 鼠标离开桌宠（pointerleave）→ 立即退出互动、重置手势轨迹
  // 5. 离开后需重新点击桌宠才能再次互动

  // 按压开始：未激活则先激活（本次点击只激活、不触发肢体互动）；
  // 已激活则记录按压区域与起点，供松开时识别点击手势
  const handlePointerDown = (e: React.PointerEvent) => {
    // 冷静模式下禁用全部交互
    if (calmUntil && calmUntil > Date.now()) {
      showBubble(`我在冷静中…剩余 ${formatCalm(calmUntil - Date.now())}`);
      gestureRef.current.zone = "none";
      return;
    }

    e.preventDefault();
    const rect = petRef.current?.getBoundingClientRect();
    if (!rect) return;

    const g = gestureRef.current;

    // 第一次点击桌宠：仅激活互动模式，不触发肢体互动
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

    setShowClose(true);
  };

  // 指针移动：仅激活后、鼠标在桌宠内时识别手势（当前仅头顶画圈）
  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!interactionActive) return;
    if (g.zone === "none") return;
    if (calmUntil && calmUntil > Date.now()) return;

    const rect = petRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 头顶区域：画圈手势识别（计算绕中心的角度累计）
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
    }
    // 头部/身体区域：无拖拽、无滑动，移动时不做处理（点击在松开时识别）
  };

  // 指针松开：识别点击手势（脑袋生气 / 肚子挠痒 / 其他随机交互）
  const handlePointerUp = (e: React.PointerEvent) => {
    // 冷静模式下禁止一切交互
    if (calmUntil && calmUntil > Date.now()) {
      gestureRef.current.zone = "none";
      return;
    }
    const g = gestureRef.current;
    // 未激活点击 / 已离开时 zone 为 "none"，直接忽略
    if (g.zone === "none") return;

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
        // 点击脑袋 → 捂脑袋委屈生气
        setState("angry");
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

  // 鼠标离开桌宠区域：立即退出互动状态，重置全部手势轨迹记录
  const handlePointerLeave = () => {
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

  // 清理定时器（原逻辑 + 过渡计时器）
  useEffect(() => {
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
      if (pendingCalmRef.current) clearTimeout(pendingCalmRef.current);
      if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
    };
  }, []);

  // ---- 新增：猜拳弹窗定位逻辑（弹窗只显示在桌宠正下方）----

  // 打开猜拳弹窗：默认放在桌宠正下方、水平居中；若下方空间不足，
  // 不移动弹窗，而是把桌宠整体向上偏移腾出空间（带平滑过渡），
  // 且保证桌宠不跑出屏幕顶部。
  useEffect(() => {
    if (!showGame) return;
    // 记录桌宠原始坐标（关闭弹窗后恢复）
    rpsOriginRef.current = { x: position.x, y: position.y };
    // 打开弹窗期间暂停自动漫游，保证弹窗跟随的桌宠位置稳定、关闭后能精确回位
    wanderRef.current.isWandering = false;
    wanderRef.current.pauseUntil = performance.now() + 3600 * 1000;
    setState("idle");
    // 等一帧，确保面板渲染完成、能测量到弹窗自身宽高
    const raf = requestAnimationFrame(() => {
      const petEl = petRef.current;
      const panelEl = rpsPanelRef.current;
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
  }, [showGame]);

  // 关闭猜拳弹窗：桌宠平滑回到打开前的位置，并恢复自动漫游
  useEffect(() => {
    if (showGame) return;
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
  }, [showGame]);

  // 动画状态类名映射
  const petAnimClass = {
    idle: "pet-idle",
    walking: "pet-walking",
    reacting: "pet-reacting",
    angry: "pet-angry",
    laughing: "pet-laughing",
    spinning: "pet-spinning",
    happy: "pet-happy",
    sad: "pet-sad",
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
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          transition: smoothShift
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

        {/* 图片精灵 */}
        <img
          src="/pet/pet.png"
          alt="My Baby 桌宠"
          className={`pet-sprite ${petAnimClass}`}
          style={{
            transform: facing === "left" ? "scaleX(-1)" : "none",
          }}
          draggable={false}
        />

        {/* ---- 新增：工具栏（猜拳 / 商城）---- */}
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
            }}
          >
            ✊
          </button>
          <button
            className="pet-tool-btn"
            aria-label="道具商城"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowShop((v) => !v);
              setShowGame(false);
            }}
          >
            🛍️
          </button>
        </div>

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
