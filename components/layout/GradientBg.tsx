export function GradientBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* 左上渐变光斑 */}
      <div
        className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl animate-gradient-float"
        style={{
          background:
            "linear-gradient(135deg, #818cf8 0%, #6366f1 40%, #a855f7 100%)",
        }}
      />
      {/* 右下渐变光斑 */}
      <div
        className="absolute -bottom-32 -right-32 h-[24rem] w-[24rem] rounded-full opacity-25 blur-3xl animate-gradient-float"
        style={{
          background:
            "linear-gradient(135deg, #c084fc 0%, #e879f9 50%, #f472b6 100%)",
          animationDelay: "5s",
        }}
      />
      {/* 中央淡光 */}
      <div
        className="absolute top-1/2 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{
          background:
            "linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a78bfa 100%)",
        }}
      />
    </div>
  );
}
