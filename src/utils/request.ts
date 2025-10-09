import { ProxyAgent } from "undici";
import { UnifiedChatRequest } from "../types/llm";

// 发送统一格式的请求到 LLM 提供商
// 核心功能：
// 1. 设置 HTTP 请求头（包括认证信息）
// 2. 处理超时和取消信号
// 3. 支持 HTTPS 代理
// 4. 记录请求日志
export function sendUnifiedRequest(
  url: URL | string,
  request: UnifiedChatRequest,
  config: any,
  logger?: any,
  context: any
): Promise<Response> {
  // 构建 HTTP 请求头
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value as string);
      }
    });
  }

  // 处理超时和取消信号
  let combinedSignal: AbortSignal;
  const timeoutSignal = AbortSignal.timeout(config.TIMEOUT ?? 60 * 1000 * 60); // 默认 60 分钟超时

  if (config.signal) {
    // 合并外部信号和超时信号
    const controller = new AbortController();
    const abortHandler = () => controller.abort();
    config.signal.addEventListener("abort", abortHandler);
    timeoutSignal.addEventListener("abort", abortHandler);
    combinedSignal = controller.signal;
  } else {
    combinedSignal = timeoutSignal;
  }

  // 构建 fetch 请求选项
  const fetchOptions: RequestInit = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
    signal: combinedSignal,
  };

  // 配置 HTTPS 代理（如果提供）
  if (config.httpsProxy) {
    (fetchOptions as any).dispatcher = new ProxyAgent(
      new URL(config.httpsProxy).toString()
    );
  }

  // 设置连接超时（默认30秒）
  const connectTimeout = config.CONNECT_TIMEOUT ?? 30 * 1000;
  if ((fetchOptions as any).dispatcher) {
    (fetchOptions as any).dispatcher.connectTimeout = connectTimeout;
  }

  // 记录最终请求信息
  logger?.debug(
    {
      reqId: context.req.id,
      request: fetchOptions,
      headers: Object.fromEntries(headers.entries()),
      requestUrl: typeof url === "string" ? url : url.toString(),
      useProxy: config.httpsProxy,
    },
    "final request"
  );

  // 发送 HTTP 请求
  return fetch(typeof url === "string" ? url : url.toString(), fetchOptions);
}
