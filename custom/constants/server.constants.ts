import { join } from 'path';
import { homedir } from 'os';
import type { ModelRouteRule } from '../types/config.types.js';

/**
 * 服务器默认配置
 */
export const SERVER_DEFAULTS = {
  /** 默认端口 */
  PORT: 3000,
  /** 默认主机地址 */
  HOST: '127.0.0.1',
  /** 默认模型（格式: "provider,model"） */
  DEFAULT_MODEL: 'openrouter,anthropic/claude-3.5-sonnet',
} as const;

/**
 * 配置文件路径（按优先级排序）
 * 
 * 1. 当前工作目录的 config.json
 * 2. 用户主目录的 .llms/config.json
 * 3. 环境变量 LLMS_CONFIG_PATH 指定的路径
 */
export const CONFIG_PATHS = [
  join(process.cwd(), 'config.json'),
  join(homedir(), '.llms', 'config.json'),
  process.env.LLMS_CONFIG_PATH,
].filter((p): p is string => Boolean(p));

/**
 * 配置文件简写规则
 * 
 * 支持简写形式，例如 "default" 会展开为 "configs/config-default.json"
 */
export const CONFIG_SHORTCUTS = {
  /** 配置文件所在目录 */
  DIR: 'configs',
  /** 配置文件名前缀 */
  PREFIX: 'config-',
  /** 配置文件扩展名 */
  SUFFIX: '.json',
} as const;

/**
 * API 端点路径
 */
export const API_ENDPOINTS = {
  /** 提供商管理端点 */
  PROVIDERS: '/providers',
  /** API 路由前缀 */
  API_PREFIX: '/api',
} as const;

/**
 * 默认模型路由规则
 * 
 * 按优先级顺序排列，第一个匹配的规则将被使用
 * 这些规则可以通过配置文件中的 Router.rules 进行覆盖或扩展
 */
export const DEFAULT_ROUTE_RULES: readonly ModelRouteRule[] = [
  // Claude Haiku 模型
  {
    pattern: "claude-haiku|haiku",
    targetModel: "anthropic/claude-haiku-4.5",
    provider: "openrouter",
    description: "识别 Claude Haiku 模型",
  },
  // Claude Sonnet 模型
  {
    pattern: "claude-sonnet|sonnet",
    targetModel: "anthropic/claude-sonnet-4.5",
    provider: "openrouter",
    description: "识别 Claude Sonnet 模型",
  },
  // Claude Opus 模型
  {
    pattern: "claude-opus|opus",
    targetModel: "anthropic/claude-opus-4.1",
    provider: "openrouter",
    description: "识别 Claude Opus 模型",
  },
] as const;

