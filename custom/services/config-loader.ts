import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { StartupConfig } from "@custom/types/config.types.js";
import { CONFIG_PATHS, CONFIG_SHORTCUTS } from "@custom/constants/server.constants.js";
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
 * 读取并合并配置文件
 * 
 * 支持 extends 字段引用其他配置文件
 */
const loadConfigFile = (configPath: string): StartupConfig => {
  const configContent = readFileSync(configPath, "utf-8");
  const config = JSON.parse(configContent);
  
  // 如果有 extends 字段，读取并合并扩展配置
  if (config.extends) {
    let baseConfigPath: string;
    
    // 支持简写：如果不包含路径分隔符且不以 .json 结尾，使用简写规则
    // 例如: "openai" -> "configs/config-openai.json"
    if (!config.extends.includes('/') && !config.extends.endsWith(CONFIG_SHORTCUTS.SUFFIX)) {
      baseConfigPath = join(
        process.cwd(), 
        CONFIG_SHORTCUTS.DIR, 
        `${CONFIG_SHORTCUTS.PREFIX}${config.extends}${CONFIG_SHORTCUTS.SUFFIX}`
      );
    } else {
      baseConfigPath = join(process.cwd(), config.extends);
    }
    
    if (existsSync(baseConfigPath)) {
      const baseConfig = loadConfigFile(baseConfigPath);
      // 合并配置：当前配置覆盖基础配置
      return { ...baseConfig, ...config, extends: undefined };
    } else {
      logger.warn({ msg: '扩展配置文件未找到', path: baseConfigPath });
    }
  }
  
  return config;
};

/**
 * 读取配置文件
 * 
 * 按优先级从多个位置尝试读取配置
 */
export const loadConfig = (): StartupConfig | null => {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const config = loadConfigFile(configPath);
        logger.info({ msg: '📁 已加载配置文件', path: configPath });
        if (config.extends) {
          logger.info({ msg: '📋 继承配置', extends: config.extends });
        }
        
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
      }
    }
  }
  
  logger.info({ msg: '未找到配置文件，使用默认配置' });
  return null;
};
