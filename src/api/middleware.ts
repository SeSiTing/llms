import { FastifyRequest, FastifyReply } from "fastify";

// API 错误接口：扩展标准 Error，添加 HTTP 状态码和错误类型
export interface ApiError extends Error {
  statusCode?: number; // HTTP 状态码
  code?: string; // 错误代码（如 "provider_not_found"）
  type?: string; // 错误类型（如 "api_error"）
}

// 创建 API 错误对象
// 用于统一错误格式，方便错误处理和日志记录
export function createApiError(
  message: string,
  statusCode: number = 500,
  code: string = "internal_error",
  type: string = "api_error"
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.type = type;
  return error;
}

// 全局错误处理器
// 捕获所有未处理的错误，记录日志并返回统一格式的错误响应
export async function errorHandler(
  error: ApiError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 记录错误日志
  request.log.error(error);

  // 确定 HTTP 状态码
  const statusCode = error.statusCode || 500;
  // 构建错误响应
  const response = {
    error: {
      message: error.message + error.stack || "Internal Server Error",
      type: error.type || "api_error",
      code: error.code || "internal_error",
    },
  };

  return reply.code(statusCode).send(response);
}
