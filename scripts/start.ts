import Server from "../src/server.js";
import type { 
  StartupConfig, 
  ConfigProvider, 
  RequestBody 
} from "../custom/types/config.types.js";
import { 
  SERVER_DEFAULTS, 
  API_ENDPOINTS
} from "../custom/constants/server.constants.js";
import { loadConfig } from "../custom/services/config-loader.js";
import { logger } from "../custom/services/logger.js";



/**
 * 获取使用的模型
 * 
 * 简化设计：统一使用配置的默认模型
 */
const getDefaultModel = (config: StartupConfig): string => {
  return config.Router?.default || SERVER_DEFAULTS.DEFAULT_MODEL;
};

/**
 * 主启动函数
 * 
 * 1. 读取配置文件
 * 2. 创建并启动服务器（providers 通过 initialConfig 自动注册）
 */
async function start() {
  try {
    // 读取配置文件
    const config = loadConfig();
    
    const port = config?.PORT || process.env.PORT || SERVER_DEFAULTS.PORT;
    const host = config?.HOST || process.env.HOST || SERVER_DEFAULTS.HOST;
    
    const server = new Server({
      initialConfig: {
        HOST: host,
        PORT: String(port),
        providers: config.providers,
        Router: config.Router
      }
    });
    
    // 添加路由中间件（在服务器启动前）
    server.addHook('preHandler', async (req: any, reply: any) => {
      // 跳过非POST请求和API端点
      if (req.method !== 'POST' || 
          req.url.startsWith(API_ENDPOINTS.API_PREFIX) || 
          req.url.startsWith(API_ENDPOINTS.PROVIDERS)) {
        return;
      }
      
      const body = req.body as RequestBody;
      if (!body || !body.model) {
        return;
      }
      
      // 如果模型名称不包含逗号，说明需要使用默认模型
      if (!body.model.includes(',')) {
        const defaultModel = config && config.Router 
          ? getDefaultModel(config)
          : SERVER_DEFAULTS.DEFAULT_MODEL;
        req.log.info({ original: body.model, routed: defaultModel }, '🔄 使用默认模型');
        body.model = defaultModel;
      }
    });
    
    // 启动服务器
    await server.start();
  } catch (error) {
    logger.error({ err: error as Error }, '启动服务器失败');
    process.exit(1);
  }
}

start();