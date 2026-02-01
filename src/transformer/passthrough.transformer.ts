import { Transformer } from "@/types/transformer";
import { LLMProvider } from "@/types/llm";

/**
 * Passthrough Transformer - 完全透传模式
 * 不做任何请求/响应转换,仅处理认证
 * 适用于已经兼容 Anthropic API 格式的服务(如智谱 GLM、MiniMax)
 * 
 * 工作原理:
 * 1. 不设置 endPoint - 通过 provider 配置动态选择
 * 2. 不实现 transformRequestOut/In - 请求原样透传
 * 3. 仅实现 auth 方法 - 添加必要的认证头
 * 4. 通过 bypass 模式跳过所有转换器链
 */
export class PassthroughTransformer implements Transformer {
  name = "passthrough";
  // 不设置 endPoint - passthrough 通过 provider 的 transformer 配置动态选择
  // 它会复用其他 transformer 的路由(如 anthropic 的 /v1/messages)
  logger?: any;

  /**
   * 认证处理 - 添加 Anthropic 兼容的认证头
   * 这是透传模式下唯一执行的方法
   */
  async auth(request: any, provider: LLMProvider): Promise<any> {
    const headers: Record<string, string | undefined> = {
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };

    return {
      body: request,
      config: {
        headers,
      },
    };
  }

  // 不实现以下方法,实现完全透传:
  // - transformRequestOut: 不转换请求格式
  // - transformRequestIn: 不转换请求格式
  // - transformResponseOut: 不转换响应格式
  // - transformResponseIn: 不转换响应格式
}
