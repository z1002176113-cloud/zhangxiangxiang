"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ========== 类型与常量 ==========

// 桌宠动画状态（在原有基础上扩展）
type PetState =
  | "idle"
  | "walking"
  | "reacting"
  | "dragging"
  | "angry" // 捂脑袋委屈生气
  | "laughing" // 挠痒大笑
  | "spinning" // 转圈欢快
  | "confused" // 疑惑
  | "scared" // 害怕
  | "relieved" // 长舒一口气
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
// 长按判定阈值（毫秒）
const LONG_PRESS_MS = 600;
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

  // ---- 新增：猜拳弹窗定位 ----
  const [smoothShift, setSmoothShift] = useState(false); // 桌宠平滑上移/回位过渡标记
  const rpsPanelRef = useRef<HTMLDivElement>(null); // 猜拳面板（用于测量弹窗尺寸）
  const rpsOriginRef = useRef<Position | null>(null); // 打开猜拳弹窗时桌宠的原始坐标
  const shiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 过渡结束恢复计时器

  // ---- 原有 refs ----
  const petRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  }>({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
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
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 待触发的冷静回调（投喂解除时需取消）
  const pendingCalmRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 新增：手势识别状态（一次按压会话内的中间数据）----
  const gestureRef = useRef({
    zone: "none" as Zone | "none",
    downX: 0,
    downY: 0,
    downTime: 0,
    // 画圈
    circleAngle: 0,
    lastAngle: 0,
    lastAngleInit: false,
    // 长按 / 拖拽 / 手势完成标记
    longPressed: false,
    dragged: false,
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

      // 检查是否被拖拽
      if (dragRef.current.isDragging) {
        animFrameRef.current = requestAnimationFrame(wander);
        return;
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

  // 播放顺序动画序列（用于三段落地动画）
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

  // ========== 指针交互（拖拽 + 手势识别）==========

  // 拖拽移动宠物（原逻辑）
  const movePet = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) {
      dragRef.current.isDragging = true;
      setState("dragging");
    }
    gestureRef.current.dragged = true;
    // 用户手动拖拽后，关闭猜拳弹窗不再自动回到打开前的位置
    rpsOriginRef.current = null;
    const newX = e.clientX - dragRef.current.offsetX;
    const newY = e.clientY - dragRef.current.offsetY;
    setPosition(clampPosition(newX, newY));
  };

  // 按压开始：记录区域 / 启动长按计时
  const handlePointerDown = (e: React.PointerEvent) => {
    // 冷静模式下禁用全部交互（投喂面板按钮已单独处理，不经过此处）
    if (calmUntil && calmUntil > Date.now()) {
      showBubble(`我在冷静中…剩余 ${formatCalm(calmUntil - Date.now())}`);
      // 重置手势状态，避免 pointerup 用残留数据误触发交互
      gestureRef.current.zone = "none";
      return;
    }

    e.preventDefault();
    const rect = petRef.current?.getBoundingClientRect();
    if (!rect) return;

    const g = gestureRef.current;
    const offsetY = e.clientY - rect.top;
    g.zone = getZone(offsetY);
    g.downX = e.clientX;
    g.downY = e.clientY;
    g.downTime = performance.now();
    g.circleAngle = 0;
    g.lastAngleInit = false;
    g.longPressed = false;
    g.dragged = false;
    g.gestureDone = false;

    // 记录拖拽偏移（原逻辑）
    dragRef.current.offsetX = e.clientX - rect.left;
    dragRef.current.offsetY = e.clientY - rect.top;

    // 按压期间暂停漫游（原逻辑：按下即暂停，避免行走动画覆盖交互状态）
    dragRef.current.isDragging = true;

    setShowClose(true);

    // 长按计时：按住超过 LONG_PRESS_MS 标记为长按
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      gestureRef.current.longPressed = true;
    }, LONG_PRESS_MS);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // 指针移动：区分 挠痒 / 画圈 / 拖拽
  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
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
      return;
    }

    // 头部/身体区域：按原拖拽逻辑移动（点击在松开时区分）
    movePet(e);
  };

  // 指针松开：判定 长按落地 / 手势完成 / 点击 / 普通拖拽结束
  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    // 冷静模式下禁止一切交互（与 handlePointerDown 保持一致）
    if (calmUntil && calmUntil > Date.now()) {
      gestureRef.current.zone = "none";
      dragRef.current.isDragging = false;
      return;
    }
    const g = gestureRef.current;
    const moved =
      Math.abs(e.clientX - g.downX) + Math.abs(e.clientY - g.downY);

    // 长按拖动松开落地 → 疑惑 → 害怕 → 长舒一口气 三段动画
    if (g.longPressed && g.dragged) {
      dragRef.current.isDragging = false;
      setShowClose(false);
      playSequence([
        { s: "confused", ms: 1000 },
        { s: "scared", ms: 1200 },
        { s: "relieved", ms: 1200 },
      ]);
      showBubble("哎呀！吓死我了…呼~");
      // 三段动画总时长 3.4s，暂停游走 4s 防止被行走动画打断
      resetWander(4000);
      return;
    }

    // 手势已完成（挠痒 / 画圈）
    if (g.gestureDone) {
      dragRef.current.isDragging = false;
      setShowClose(false);
      resetWander();
      return;
    }

    // 纯点击（几乎未移动）
    if (moved < 5) {
      dragRef.current.isDragging = false;
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
      setShowClose(false);
      resetWander();
      return;
    }

    // 普通拖拽结束（原逻辑）
    dragRef.current.isDragging = false;
    setState("idle");
    resetWander();
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

  // 清理定时器（原逻辑 + 长按计时器 + 过渡计时器）
  useEffect(() => {
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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
    dragging: "",
    angry: "pet-angry",
    laughing: "pet-laughing",
    spinning: "pet-spinning",
    confused: "pet-confused",
    scared: "pet-scared",
    relieved: "pet-relieved",
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
          cursor: dragRef.current.isDragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
          transition: dragRef.current.isDragging
            ? "none"
            : smoothShift
              ? "left 0.35s ease, top 0.35s ease"
              : "left 0.1s linear, top 0.1s linear",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
                  {o.emoji}
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
