"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type PetState = "idle" | "walk" | "click";

const BUBBLES = [
  "你好呀～",
  "今天也要加油！",
  "点我干嘛 😜",
  "咕咕咕～",
  "我在这里！",
  "陪你写代码 💻",
  "休息一下吧～",
  "喵～",
];

const EXPRESSIONS = ["😊", "😍", "🤔", "😴", "😎", "🥳", "😅", "🤗"];

/**
 * 使用 canvas 去除图片的黑色背景：
 * - 亮度低于阈值的像素 → 完全透明
 * - 阈值附近的像素 → 渐变透明（边缘柔和）
 */
function removeBlackBackground(
  src: string,
  threshold = 40
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        // 计算亮度
        const brightness = (r + g + b) / 3;
        if (brightness < threshold) {
          // 完全透明
          data[i + 3] = 0;
        } else if (brightness < threshold + 30) {
          // 边缘渐变透明
          const alpha = ((brightness - threshold) / 30) * a;
          data[i + 3] = alpha;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function DesktopPet() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [petState, setPetState] = useState<PetState>("idle");
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [expression, setExpression] = useState("😊");
  const [isDragging, setIsDragging] = useState(false);
  const [frame, setFrame] = useState(0);
  const [petSrc, setPetSrc] = useState<string | null>(null);

  const dragOffset = useRef({ x: 0, y: 0 });
  const walkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // 初始化 + 去黑背景
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setPos({
      x: window.innerWidth - 120,
      y: window.innerHeight - 120,
    });
    removeBlackBackground("/pet.png", 40)
      .then(setPetSrc)
      .catch(() => setPetSrc("/pet.png"));
  }, []);

  // 帧动画
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // 自动随机游走
  const startRandomWalk = useCallback(() => {
    if (walkTimer.current) clearTimeout(walkTimer.current);
    const delay = 5000 + Math.random() * 8000;
    walkTimer.current = setTimeout(() => {
      if (isDragging) {
        startRandomWalk();
        return;
      }
      const dir = Math.random() > 0.5 ? "right" : "left";
      const distance = 80 + Math.random() * 120;
      setDirection(dir);
      setPetState("walk");
      setPos((prev) => {
        let newX = prev.x + (dir === "right" ? distance : -distance);
        newX = Math.max(20, Math.min(window.innerWidth - 100, newX));
        return { ...prev, x: newX };
      });
      setTimeout(() => setPetState("idle"), 2500);
      startRandomWalk();
    }, delay);
  }, [isDragging]);

  useEffect(() => {
    startRandomWalk();
    return () => {
      if (walkTimer.current) clearTimeout(walkTimer.current);
    };
  }, [startRandomWalk]);

  // 拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleUp = () => {
      setIsDragging(false);
      setPetState("idle");
      startRandomWalk();
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, startRandomWalk]);

  // 点击交互
  const handleClick = () => {
    setPetState("click");
    setExpression(EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)]);
    setBubble(BUBBLES[Math.floor(Math.random() * BUBBLES.length)]);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3000);
    setTimeout(() => setPetState("idle"), 600);
  };

  // 根据状态和帧计算样式
  const getTransform = () => {
    const scaleX = direction === "left" ? -1 : 1;
    let translate = "";

    if (petState === "idle") {
      const bob = Math.sin(frame * 0.5) * 3;
      translate = `translateY(${bob}px)`;
    } else if (petState === "walk") {
      const sway = Math.sin(frame * 1.2) * 4;
      const hop = Math.abs(Math.sin(frame * 1.2)) * -6;
      translate = `translate(${sway}px, ${hop}px)`;
    } else if (petState === "click") {
      translate = `translateY(-12px) scale(1.15)`;
    }

    return `scaleX(${scaleX}) ${translate}`;
  };

  return (
    <div
      className="fixed z-[9999] select-none"
      style={{ left: pos.x, top: pos.y, pointerEvents: isDragging ? "none" : "auto" }}
    >
      {/* 气泡 */}
      {bubble && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white/95 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-lg"
          style={{ animation: "fadeBubble 0.3s ease-out" }}
        >
          {bubble}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-white text-xs">▼</span>
        </div>
      )}

      {/* 表情 */}
      {petState === "click" && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg"
          style={{ animation: "popIn 0.3s ease-out" }}
        >
          {expression}
        </div>
      )}

      {/* 桌宠本体 */}
      <div
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="cursor-pointer transition-transform"
        style={{
          transform: getTransform(),
          transition: petState === "walk" ? "left 2.5s linear, top 0.3s ease" : "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={petSrc || "/pet.png"}
          alt="桌宠"
          width={94}
          height={80}
          draggable={false}
          className="block"
          style={{
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))",
          }}
        />
      </div>

      <style>{`
        @keyframes fadeBubble {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: translateX(-50%) scale(0); }
          60% { transform: translateX(-50%) scale(1.3); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
