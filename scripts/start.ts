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
 * 识别Claude模型名称模式并转换为支持的模型
 * 
 * 支持的识别模式：
 * - claude-haiku-*-* → anthropic/claude-haiku-4.5
 * - claude-sonnet-*-* → anthropic/claude-sonnet-4.5
 * - claude-opus-*-* → anthropic/claude-opus-4.1
 * 
 * @param modelName 原始模型名称
 * @param provider 提供商配置（用于获取provider名称）
 * @returns 转换后的模型名称（格式: provider,model），如果无法识别则返回null
 */
function recognizeClaudeModel(modelName: string, provider: ConfigProvider): string | null {
  if (!modelName || typeof modelName !== 'string') {
    return null;
  }
  
  const lowerModel = modelName.toLowerCase();
  
  // 识别haiku模式: claude-haiku-*-*
  if (lowerModel.includes('claude-haiku') || lowerModel.includes('haiku')) {
    return `${provider.name},anthropic/claude-haiku-4.5`;
  }
  
  // 识别sonnet模式: claude-sonnet-*-*
  if (lowerModel.includes('claude-sonnet') || lowerModel.includes('sonnet')) {
    return `${provider.name},anthropic/claude-sonnet-4.5`;
  }
  
  // 识别opus模式: claude-opus-*-*
  if (lowerModel.includes('claude-opus') || lowerModel.includes('opus')) {
    return `${provider.name},anthropic/claude-opus-4.1`;
  }
  
  return null;
}

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
      
      // 如果模型名称不包含逗号，说明需要路由
      if (!body.model.includes(',')) {
        const originalModel = body.model;
        let routedModel: string | null = null;
        let reason = '';
        
        // 先尝试智能识别Claude模型
        if (config && config.providers && config.providers.length > 0) {
          // 使用第一个provider进行识别（通常只有一个）
          const provider = config.providers[0];
          routedModel = recognizeClaudeModel(originalModel, provider);
          if (routedModel) {
            reason = '智能识别Claude模型';
          }
        }
        
        // 如果识别失败，使用默认模型
        if (!routedModel) {
          routedModel = config && config.Router 
            ? getDefaultModel(config)
            : SERVER_DEFAULTS.DEFAULT_MODEL;
          reason = '使用默认模型';
        }
        
        req.log.info({ original: originalModel, routed: routedModel }, '🔄 使用默认模型');
        req.log.info({
          originalModel,
          routedModel,
          reason,
        }, '[ROUTE] 🔄 ROUTED - 模型路由');
        (req as any)._originalModel = originalModel;
        body.model = routedModel;
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