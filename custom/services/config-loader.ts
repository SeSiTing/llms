import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { StartupConfig } from "@custom/types/config.types.js";
import { CONFIG_SHORTCUTS } from "@custom/constants/server.constants.js";
import { logger } from "./logger.js";

/**
 * 环境变量插值函数
 * 
 * 支持 ${VAR_NAME} 格式
 */
const interpolateEnvVars = (obj: unknown): unknown => {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  } else if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result;
  }
  return obj;
};

/**
 * 读取配置文件
 */
const loadConfigFile = (configPath: string): StartupConfig => {
  const configContent = readFileSync(configPath, "utf-8");
  const config = JSON.parse(configContent);
  return config;
};

/**
 * 读取配置文件
 * 
 * 使用环境变量 LLMS_CONFIG_PROFILE 指定的配置文件
 * 如果未设置，使用默认值 default
 */
export const loadConfig = (): StartupConfig | null => {
  const profile = process.env.LLMS_CONFIG_PROFILE || 'default';
  const profileConfigPath = join(
    process.cwd(),
    CONFIG_SHORTCUTS.DIR,
    `${CONFIG_SHORTCUTS.PREFIX}${profile}${CONFIG_SHORTCUTS.SUFFIX}`
  );

  if (!existsSync(profileConfigPath)) {
    logger.error({ msg: '配置文件未找到', path: profileConfigPath, profile });
    return null;
  }

  try {
    const config = loadConfigFile(profileConfigPath);
    logger.info({ msg: '📁 已加载配置文件', path: profileConfigPath, profile });
    
    const interpolatedConfig = interpolateEnvVars(config) as StartupConfig;
    
    // 打印路由配置
    if (interpolatedConfig.Router) {
      logger.info({ msg: '🛣️ 路由配置' });
      Object.entries(interpolatedConfig.Router).forEach(([key, value]) => {
        logger.info({ msg: `  ${key}: ${value}` });
      });
    }
    
    logger.info({ 
      msg: '🚀 服务器启动',
      host: interpolatedConfig.HOST || '127.0.0.1', 
      port: interpolatedConfig.PORT || 3000 
    });
    
    return interpolatedConfig;
  } catch (error) {
    logger.error({ err: error }, '解析配置文件失败');
    return null;
  }
};
