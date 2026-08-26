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
 * 使用 canvas 去除图片的黑色背景 + 保留并加深眼瞳：
 * 1. 邻域感知去除大面积黑色背景
 * 2. 自动定位被亮色包围的小块暗区（眼瞳），强制涂黑
 */
function removeBlackBackground(
  src: string,
  threshold = 30
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
      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const srcData = new Uint8ClampedArray(data);

      // 第一步：计算每个像素的邻域暗度（5x5 窗口）
      const darknessMap = new Float32Array(w * h);
      const windowSize = 5;
      const half = Math.floor(windowSize / 2);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let darkCount = 0;
          let total = 0;
          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
              total++;
              const idx = (ny * w + nx) * 4;
              const r = srcData[idx];
              const g = srcData[idx + 1];
              const b = srcData[idx + 2];
              const brightness = (r + g + b) / 3;
              if (brightness < threshold) darkCount++;
            }
          }
          darknessMap[y * w + x] = total > 0 ? darkCount / total : 0;
        }
      }

      // 第二步：根据邻域暗度决定透明度 + 标记眼瞳候选
      // 眼瞳特征：本身暗 + 周围（3x3）大部分亮
      const isPupil = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          const i = p * 4;
          const r = srcData[i];
          const g = srcData[i + 1];
          const b = srcData[i + 2];
          const a = srcData[i + 3];
          const brightness = (r + g + b) / 3;
          const darkness = darknessMap[p];

          if (brightness < threshold && darkness > 0.7) {
            // 像素暗 + 周围大部分也暗 → 背景（透明）
            data[i + 3] = 0;
          } else if (brightness < threshold && darkness > 0.5) {
            // 像素暗 + 周围一半暗 → 背景边缘，半透明
            data[i + 3] = a * 0.3;
          } else if (brightness < 80 && a > 200) {
            // 暗像素 + 周围亮 → 可能是眼瞳候选，3x3 验证
            let brightNeighbors = 0;
            let nbCount = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                nbCount++;
                const nIdx = (ny * w + nx) * 4;
                const nr = srcData[nIdx];
                const ng = srcData[nIdx + 1];
                const nb2 = srcData[nIdx + 2];
                const nBright = (nr + ng + nb2) / 3;
                if (nBright > 120) brightNeighbors++;
              }
            }
            if (nbCount > 0 && brightNeighbors / nbCount > 0.6) {
              isPupil[p] = 1;
            }
          }
        }
      }

      // 第三步：对眼瞳候选区域进行连通域扩展，整块涂黑
      const visited = new Uint8Array(w * h);
      for (let p = 0; p < isPupil.length; p++) {
        if (isPupil[p] && !visited[p]) {
          // BFS 收集连通的眼瞳区域
          const queue = [p];
          const region: number[] = [];
          visited[p] = 1;
          while (queue.length > 0) {
            const cur = queue.shift()!;
            region.push(cur);
            const cx = cur % w;
            const cy = Math.floor(cur / w);
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const np = ny * w + nx;
                if (!visited[np] && isPupil[np]) {
                  visited[np] = 1;
                  queue.push(np);
                }
              }
            }
          }
          // 如果区域大小合理（1~500 像素），全部强制涂黑
          if (region.length >= 2 && region.length <= 500) {
            for (const rp of region) {
              const ri = rp * 4;
              data[ri] = 0;       // R
              data[ri + 1] = 0;   // G
              data[ri + 2] = 0;   // B
              data[ri + 3] = 255; // A 全不透明
            }
          }
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
