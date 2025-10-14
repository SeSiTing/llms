/**
 * 转换器配置选项
 */
export interface TransformerConfig {
  /** 使用的转换器列表 */
  use?: string[];
  /** 其他自定义属性 */
  [key: string]: unknown;
}

/**
 * 提供商配置
 * 
 * 与 src/types/llm.ts 的 RegisterProviderRequest 保持一致
 */
export interface ConfigProvider {
  /** 提供商 ID */
  id: string;
  /** 提供商名称 */
  name: string;
  /** 提供商类型（如 "openai", "anthropic"） */
  type: string;
  /** API 基础 URL */
  baseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 支持的模型列表 */
  models: string[];
  /** 转换器配置 */
  transformer?: TransformerConfig;
}

/**
 * 路由配置
 * 
 * 简化设计：统一使用默认模型
 */
export interface RouterConfig {
  /** 默认模型（格式: "provider,model"） */
  default: string;
}

/**
 * 服务器启动配置
 * 
 * 配置文件的完整结构定义
 */
export interface StartupConfig {
  /** 是否启用日志 */
  LOG?: boolean;
  /** 日志级别 */
  LOG_LEVEL?: string;
  /** 服务器主机地址 */
  HOST?: string;
  /** 服务器端口 */
  PORT?: number;
  /** API 超时时间（毫秒） */
  API_TIMEOUT_MS?: string;
  /** 代理服务器地址 */
  PROXY_URL?: string;
  /** 提供商配置列表 */
  providers?: ConfigProvider[];
  /** 路由配置 */
  Router?: RouterConfig;
  /** 扩展的配置文件路径 */
  extends?: string;
}

/**
 * 消息内容
 */
export interface MessageContent {
  /** 消息内容（字符串或结构化对象） */
  content?: string | Record<string, unknown>;
  /** 其他消息属性 */
  [key: string]: unknown;
}

/**
 * 系统消息
 */
export interface SystemMessage {
  /** 系统消息文本 */
  text?: string;
  /** 其他系统消息属性 */
  [key: string]: unknown;
}

/**
 * 工具定义
 */
export interface Tool {
  /** 工具类型 */
  type?: string;
  /** 其他工具属性 */
  [key: string]: unknown;
}

/**
 * 请求体
 */
export interface RequestBody {
  /** 模型名称 */
  model?: string;
  /** 消息列表 */
  messages?: MessageContent[];
  /** 系统消息列表 */
  system?: SystemMessage[];
  /** 工具列表 */
  tools?: Tool[];
  /** 其他请求属性 */
  [key: string]: unknown;
}

