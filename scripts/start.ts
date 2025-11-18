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
      // 记录请求开始时间
      (req as any)._startTime = Date.now();
      
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
        const originalModel = body.model;
        req.log.info({
          reqId: req.id,
          originalModel,
          routedModel: defaultModel,
          reason: '使用默认模型',
        }, '[ROUTE] 🔄 ROUTED - 模型路由');
        (req as any)._originalModel = originalModel;
        body.model = defaultModel;
      }
    });
    
    // 打印提供商配置信息
    if (config && config.providers) {
      logger.info({ msg: '🔧 提供商配置' });
      
      for (const provider of config.providers) {
        logger.info({ msg: `📋 ${provider.name} (${provider.type})` });
        logger.info({ msg: `📍 Base URL: ${provider.api_base_url}` });
        
        // 安全显示 API Key
        if (provider.api_key && !provider.api_key.startsWith('$') && !provider.api_key.startsWith('${')) {
          const maskedKey = `...${provider.api_key.slice(-6)}`;
          logger.info({ msg: `🔑 API Key: ✅ ${maskedKey}` });
        } else {
          logger.info({ msg: `🔑 API Key: 🔐 使用环境变量` });
        }
        
        logger.info({ msg: `🤖 模型数量: ${provider.models?.length || 0}` });
        if (provider.models?.length > 0) {
          logger.info({ 
            msg: `模型列表: ${provider.models.slice(0, 3).join(', ')}${provider.models.length > 3 ? '...' : ''}` 
          });
        }
      }
    }
    
    // 启动服务器
    await server.start();
  } catch (error) {
    logger.error({ err: error as Error }, '启动服务器失败');
    process.exit(1);
  }
}

start();