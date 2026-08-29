// ============================================================================
// 拍照投喂 · 食物识别中转接口（服务端 Node 执行）
// ----------------------------------------------------------------------------
// 安全要求：
//   - 密钥（百度 API Key / HuggingFace Token）只从后端环境变量读取，
//     严禁写入任何前端代码，前端只 POST 图片数据到此接口。
// 调用链（免费优先 + 自动降级）：
//   1. 优先调用 百度菜品识别 免费接口（每天有免费额度）
//   2. 额度耗尽 / 调用失败 → 自动降级 免费开源视觉模型（HuggingFace 推理）
// 输出：{ ok, name, confidence, isFood, source } 或 { ok: false, message }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

// ---- 后端密钥（仅从环境变量读取）----
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;
const HF_TOKEN = process.env.HF_TOKEN; // 免费开源视觉模型 token（兜底用）
// 兜底开源视觉模型：可按需更换（如 qwen-vl 系列免费模型）
const HF_MODEL =
  process.env.HF_MODEL || "onnx-community/Qwen2.5-VL-7B-Instruct";

// access_token 缓存（服务端内存；百度默认 30 天有效，提前 60s 过期）
let baiduTokenCache: { token: string; expireAt: number } | null = null;

// 从 dataURL 提取纯 base64 并做 URL 编码（百度菜品识别接口要求）
function toBaiduImage(dataUrl: string): string {
  const pure = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return encodeURIComponent(pure);
}

// 获取百度 access_token（client_credentials 模式）
async function getBaiduAccessToken(): Promise<string> {
  if (
    baiduTokenCache &&
    baiduTokenCache.expireAt > Date.now()
  ) {
    return baiduTokenCache.token;
  }
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`百度获取 token 失败: ${JSON.stringify(data)}`);
  }
  baiduTokenCache = {
    token: data.access_token,
    expireAt:
      Date.now() + ((data.expires_in || 2592000) - 60) * 1000,
  };
  return data.access_token;
}

// 1) 百度菜品识别（免费接口；每日免费额度耗尽会返回错误码 17 → 触发降级）
async function recognizeByBaidu(
  dataUrl: string
): Promise<{ name: string; confidence: number } | null> {
  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) return null; // 未配置 → 直接降级
  try {
    const token = await getBaiduAccessToken();
    const res = await fetch(
      `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `image=${toBaiduImage(dataUrl)}&top_num=1`,
      }
    );
    const data = await res.json();
    // 17=当天免费额度超限，18=QPS 超限，其它错误码 → 均降级到开源模型
    if (data.error_code && data.error_code !== 0) {
      console.warn(
        `[recognize-food] 百度接口错误 ${data.error_code}: ${data.error_msg}`
      );
      return null;
    }
    const r = data.result?.[0];
    if (!r || !r.name) return null;
    return {
      name: String(r.name),
      confidence: typeof r.probability === "number" ? r.probability : 0.9,
    };
  } catch (err) {
    console.warn("[recognize-food] 百度识别失败，降级开源模型:", err);
    return null;
  }
}

// 2) 免费开源视觉模型兜底（HuggingFace Inference API）
async function recognizeByOpenModel(
  dataUrl: string
): Promise<{ name: string; confidence: number; isFood: boolean } | null> {
  if (!HF_TOKEN) return null; // 未配置兜底 token → 返回 null
  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs:
            '请判断这张图片是否包含食物。只输出 JSON，不要输出其它内容：{"is_food": true/false, "name": "食物名称", "confidence": 0到1之间的数字}',
          image: dataUrl, // dataURL，HuggingFace 视觉模型支持
        }),
      }
    );
    if (!res.ok) {
      console.warn(`[recognize-food] 开源模型 HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text =
      data?.[0]?.generated_text || data?.generated_text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    return {
      name: String(parsed.name || "食物"),
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      isFood: Boolean(parsed.is_food),
    };
  } catch (err) {
    console.warn("[recognize-food] 开源模型识别失败:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let image = "";
  try {
    const body = await req.json();
    image = typeof body.image === "string" ? body.image : "";
  } catch {
    return NextResponse.json(
      { ok: false, message: "请求格式错误" },
      { status: 400 }
    );
  }
  if (!image) {
    return NextResponse.json(
      { ok: false, message: "缺少图片数据" },
      { status: 400 }
    );
  }
  if (image.length > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, message: "图片过大，请压缩后重试" },
      { status: 400 }
    );
  }

  // 优先百度菜品识别
  const baidu = await recognizeByBaidu(image);
  if (baidu) {
    return NextResponse.json({
      ok: true,
      source: "baidu",
      name: baidu.name,
      confidence: baidu.confidence,
      isFood: true, // 菜品接口命中的即视为食物（置信度由前端按阈值校验）
    });
  }

  // 降级：免费开源视觉模型
  const openModel = await recognizeByOpenModel(image);
  if (openModel) {
    return NextResponse.json({
      ok: true,
      source: "open-model",
      name: openModel.name,
      confidence: openModel.confidence,
      isFood: openModel.isFood,
    });
  }

  // 全部不可用：密钥未配置 / 额度耗尽且无兜底模型
  return NextResponse.json({
    ok: false,
    message:
      "识别服务暂不可用：请在后端配置 BAIDU_API_KEY/BAIDU_SECRET_KEY（或兜底 HF_TOKEN）",
  });
}
