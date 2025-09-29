import { LLMProvider, UnifiedChatRequest } from "./llm";

// 转换器配置选项
export interface TransformerOptions {
  [key: string]: any;
}

interface TransformerWithStaticName {
  new (options?: TransformerOptions): Transformer;
  TransformerName?: string;
}


interface TransformerWithInstanceName {
  new (): Transformer;
  name?: never;
}

// 转换器构造函数类型
export type TransformerConstructor = TransformerWithStaticName;

// 转换器上下文：存储请求处理过程中的状态信息
export interface TransformerContext {
  [key: string]: any;
}

// 转换器接口：定义请求/响应转换的核心方法
// 转换器是整个系统的核心，负责在不同 API 格式之间进行转换
export type Transformer = {
  // 请求入站转换：将统一格式转换为目标提供商格式
  // 用于中间件转换器，在发送到提供商之前对请求进行处理
  transformRequestIn?: (
    request: UnifiedChatRequest,
    provider: LLMProvider,
    context: TransformerContext,
  ) => Promise<Record<string, any>>;
  
  // 响应入站转换：将提供商响应转换回统一格式
  // 用于主转换器，将提供商响应转换为客户端期望的格式
  transformResponseIn?: (response: Response, context?: TransformerContext) => Promise<Response>;

  // 请求出站转换：将提供商格式转换为统一格式
  // 用于主转换器，接收客户端请求并转换为统一格式
  transformRequestOut?: (request: any, context: TransformerContext) => Promise<UnifiedChatRequest>;
  
  // 响应出站转换：将统一格式响应转换为提供商格式
  // 用于中间件转换器，在返回给客户端之前对响应进行处理
  transformResponseOut?: (response: Response, context: TransformerContext) => Promise<Response>;

  // API 端点：转换器对应的 HTTP 路径（如 "/v1/messages"）
  // 带端点的转换器会注册为 API 路由
  endPoint?: string;
  
  // 转换器名称
  name?: string;
  
  // 认证处理：为请求添加认证信息
  auth?: (request: any, provider: LLMProvider, context: TransformerContext) => Promise<any>;
  
  // Logger for transformer
  // 日志记录器
  logger?: any;
};
