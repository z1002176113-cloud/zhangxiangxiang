"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// 桌宠状态
type PetState = "idle" | "walking" | "reacting" | "dragging";

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

interface Position {
  x: number;
  y: number;
}

export function DesktopPet() {
  const [position, setPosition] = useState<Position>({ x: -1, y: -1 });
  const [state, setState] = useState<PetState>("idle");
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [showClose, setShowClose] = useState(false);

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

  const PET_SIZE = 80;
  const MARGIN = 16;

  // 初始化位置（右下角）
  useEffect(() => {
    setPosition({
      x: window.innerWidth - PET_SIZE - MARGIN,
      y: window.innerHeight - PET_SIZE - MARGIN,
    });
  }, []);

  // 边界约束
  const clampPosition = useCallback((x: number, y: number): Position => {
    const maxX = window.innerWidth - PET_SIZE;
    const maxY = window.innerHeight - PET_SIZE;
    return {
      x: Math.max(MARGIN, Math.min(x, maxX)),
      y: Math.max(MARGIN, Math.min(y, maxY)),
    };
  }, []);

  // 自动游走逻辑
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
        // 随机选择一个新位置
        const maxX = window.innerWidth - PET_SIZE;
        const newX = MARGIN + Math.random() * (maxX - MARGIN);
        // 随机速度 30-80 px/s
        wanderRef.current.targetX = newX;
        wanderRef.current.speed = 30 + Math.random() * 50;
        wanderRef.current.isWandering = true;
        setState("walking");

        // 朝向右
        if (newX > position.x) setFacing("right");
        else setFacing("left");
      }

      // 检查是否被拖拽
      if (dragRef.current.isDragging) {
        animFrameRef.current = requestAnimationFrame(wander);
        return;
      }

      // 朝目标移动
      const targetX = wanderRef.current.targetX;
      const currentX = position.x;
      const diff = targetX - currentX;
      const distance = Math.abs(diff);
      const moveDistance = (wanderRef.current.speed * deltaTime) / 1000;

      if (distance <= moveDistance) {
        // 到达目标
        wanderRef.current.isWandering = false;
        setState("idle");
        // 暂停 2-5 秒
        wanderRef.current.pauseUntil =
          currentTime + 2000 + Math.random() * 3000;

        // 偶尔弹出气泡
        if (Math.random() < 0.3) {
          showBubble(BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)]);
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

  // 拖拽开始
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const rect = petRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragRef.current.isDragging = true;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      dragRef.current.offsetX = e.clientX - rect.left;
      dragRef.current.offsetY = e.clientY - rect.top;
      setState("dragging");
      setShowClose(true);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  // 拖拽移动
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.isDragging) return;
      const newX = e.clientX - dragRef.current.offsetX;
      const newY = e.clientY - dragRef.current.offsetY;
      setPosition(clampPosition(newX, newY));
    },
    [clampPosition]
  );

  // 拖拽结束
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasDragging = dragRef.current.isDragging;
      const movedDistance =
        Math.abs(e.clientX - dragRef.current.startX) +
        Math.abs(e.clientY - dragRef.current.startY);

      dragRef.current.isDragging = false;

      if (wasDragging && movedDistance < 5) {
        // 点击（非拖拽）
        handleClick();
      }

      setState("idle");
      // 重新开始漫游
      wanderRef.current.isWandering = false;
      wanderRef.current.pauseUntil = performance.now() + 1000;
      setShowClose(false);
    },
    [handleClick]
  );

  // 点击交互
  const handleClick = useCallback(() => {
    setState("reacting");

    // 显示气泡
    const msg = BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)];
    showBubble(msg);

    // 显示表情
    const em = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    setEmoji(em);
    if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
    emojiTimerRef.current = setTimeout(() => setEmoji(null), 1500);

    // 1 秒后恢复 idle
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState("idle"), 1000);
  }, []);

  // 显示气泡
  const showBubble = (msg: string) => {
    setBubble(msg);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), 2500);
  };

  // 关闭桌宠
  const handleClose = useCallback(() => {
    if (petRef.current) {
      petRef.current.style.display = "none";
    }
  }, []);

  // 窗口大小变化时重新约束位置
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
    };
  }, []);

  // 动画状态类名
  const petAnimClass = {
    idle: "pet-idle",
    walking: "pet-walking",
    reacting: "pet-reacting",
    dragging: "",
  }[state];

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
