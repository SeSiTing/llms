import type { ChatCompletionMessageParam as OpenAIMessage } from "openai/resources/chat/completions";
import type { MessageParam as AnthropicMessage } from "@anthropic-ai/sdk/resources/messages";
import type {
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import type {
  Message,
  MessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { Tool as AnthropicTool } from "@anthropic-ai/sdk/resources/messages";
import { Transformer } from "./transformer";

// ==================== 注解和引用 ====================

// URL 引用：用于标记内容来源
export interface UrlCitation {
  url: string; // 来源 URL
  title: string; // 来源标题
  content: string; // 引用内容
  start_index: number; // 起始位置
  end_index: number; // 结束位置
}

// 注解：附加在消息内容上的元数据
export interface Annotation {
  type: "url_citation";
  url_citation?: UrlCitation;
}

// ==================== 消息内容类型 ====================

// 文本内容
export interface TextContent {
  type: "text";
  text: string;
  cache_control?: {
    type?: string; // 缓存控制
  };
}

// 图片内容
export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string; // 图片 URL（支持 base64 或 HTTP URL）
  };
  media_type: string; // 媒体类型（如 "image/jpeg"）
}

// 消息内容联合类型
export type MessageContent = TextContent | ImageContent;

// ==================== 统一消息格式 ====================

// 统一的消息接口：标准化不同提供商的消息格式
// 支持文本、工具调用、工具响应、推理内容等
export interface UnifiedMessage {
  role: "user" | "assistant" | "system" | "tool"; // 消息角色
  content: string | null | MessageContent[]; // 消息内容（支持多种格式）
  tool_calls?: Array<{
    id: string; // 工具调用 ID
    type: "function";
    function: {
      name: string; // 工具名称
      arguments: string; // 工具参数（JSON 字符串）
    };
  }>;
  tool_call_id?: string; // 工具响应关联的工具调用 ID
  cache_control?: {
    type?: string; // 缓存控制
  };
  thinking?: {
    content: string; // 推理内容
    signature?: string; // 推理签名
  };
}

// ==================== 工具定义 ====================

// 统一的工具定义接口：描述可供模型调用的函数
export interface UnifiedTool {
  type: "function";
  function: {
    name: string; // 函数名称
    description: string; // 函数描述
    parameters: {
      type: "object";
      properties: Record<string, any>; // 参数定义
      required?: string[]; // 必需参数列表
      additionalProperties?: boolean;
      $schema?: string;
    };
  };
}

// 推理强度级别（用于控制模型的思考深度）
export type ThinkLevel = "none" | "low" | "medium" | "high";

// ==================== 统一请求格式 ====================

// 统一的聊天请求接口：标准化不同提供商的请求格式
// 这是系统内部使用的核心数据结构
export interface UnifiedChatRequest {
  messages: UnifiedMessage[]; // 消息列表
  model: string; // 模型名称
  max_tokens?: number; // 最大生成 token 数
  temperature?: number; // 温度参数（控制随机性）
  stream?: boolean; // 是否流式返回
  tools?: UnifiedTool[]; // 可用工具列表
  tool_choice?:
    | "auto" // 自动选择
    | "none" // 不使用工具
    | "required" // 必须使用工具
    | string // 指定工具名称
    | { type: "function"; function: { name: string } }; // 指定工具
  reasoning?: {
    // OpenAI-style
    effort?: ThinkLevel; // 推理强度

    // Anthropic-style
    max_tokens?: number; // 推理最大 token 数

    enabled?: boolean; // 是否启用推理
  };
}

// 统一的响应接口
export interface UnifiedChatResponse {
  id: string;
  model: string;
  content: string | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  annotations?: Annotation[];
}

// 流式响应相关类型
export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices?: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
      annotations?: Annotation[];
    };
    finish_reason?: string | null;
  }>;
}

// Anthropic 流式事件类型
export type AnthropicStreamEvent = MessageStreamEvent;

// OpenAI 流式块类型
export type OpenAIStreamChunk = ChatCompletionChunk;

// OpenAI 特定类型
export interface OpenAIChatRequest {
  messages: OpenAIMessage[];
  model: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: ChatCompletionTool[];
  tool_choice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } };
}

// Anthropic 特定类型
export interface AnthropicChatRequest {
  messages: AnthropicMessage[];
  model: string;
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
  system?: string;
  tools?: AnthropicTool[];
  tool_choice?: { type: "auto" } | { type: "tool"; name: string };
}

// 转换选项
export interface ConversionOptions {
  targetProvider: "openai" | "anthropic";
  sourceProvider: "openai" | "anthropic";
}

// ==================== 提供商管理 ====================

// LLM 提供商接口：描述一个 LLM 服务提供商的配置
export interface LLMProvider {
  name: string; // 提供商名称（如 "openai", "anthropic"）
  baseUrl: string; // API 基础 URL
  apiKey: string; // API 密钥
  models: string[]; // 支持的模型列表
  transformer?: {
    [key: string]: {
      use?: Transformer[]; // 模型特定的转换器列表
    };
  } & {
    use?: Transformer[]; // 提供商级别的转换器列表
  };
}

// 注册提供商请求类型
export type RegisterProviderRequest = LLMProvider;

// 模型路由：描述模型名称到提供商的映射关系
export interface ModelRoute {
  provider: string; // 提供商名称
  model: string; // 模型名称
  fullModel: string; // 完整模型名称（格式：provider,model）
}

// 请求路由信息：解析后的路由结果
export interface RequestRouteInfo {
  provider: LLMProvider; // 提供商对象
  originalModel: string; // 原始模型名称（用户请求的）
  targetModel: string; // 目标模型名称（实际使用的）
}

// 配置文件中的提供商格式
export interface ConfigProvider {
  name: string; // 提供商名称
  api_base_url: string; // API 基础 URL
  api_key: string; // API 密钥
  models: string[]; // 支持的模型列表
  transformer: {
    use?: string[] | Array<any>[]; // 提供商级别的转换器配置
  } & {
    [key: string]: {
      use?: string[] | Array<any>[]; // 模型特定的转换器配置
    };
  };
}
