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
import { ModelRouter } from "../custom/services/model-router.js";



/**
 * 获取使用的模型
 * 
 * 简化设计：统一使用配置的默认模型
 */
const getDefaultModel = (config: StartupConfig): string => {
  return config.Router?.default || SERVER_DEFAULTS.DEFAULT_MODEL;
};

/**
 * 从默认模型字符串中提取 provider 名称
 * 
 * @param defaultModel 默认模型（格式: "provider,model"）
 * @returns provider 名称，如果格式不正确则返回 undefined
 */
const extractDefaultProvider = (defaultModel: string): string | undefined => {
  const parts = defaultModel.split(",");
  return parts.length >= 2 ? parts[0] : undefined;
};

/**
 * 静默处理已废弃的端点（避免日志污染）
 */
const DEPRECATED_PATTERNS = [
  /^\/+api\/event_logging\/batch/,  // 匹配 /api/event_logging/batch 和 //api/event_logging/batch
];

const isDeprecatedEndpoint = (url: string) => {
  return DEPRECATED_PATTERNS.some(pattern => pattern.test(url));
};

// 创建一个空 logger，用于废弃端点
const createNoopLogger = () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: function() { return this; },
  // 添加其他可能被调用的方法
  level: 'silent' as const,
  silent: () => {},
});

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
      },
      // 禁用 Fastify 自动请求日志，我们手动控制
      disableRequestLogging: true,
    });
    
    // 创建模型路由器
    const defaultModel = getDefaultModel(config);
    const defaultProvider = extractDefaultProvider(defaultModel);
    const modelRouter = new ModelRouter(config.Router?.rules);
    
    // 手动实现请求日志（排除废弃端点）
    server.addHook('onRequest', async (req: any, reply: any) => {
      if (isDeprecatedEndpoint(req.url)) {
        // 替换为空 logger，完全静默
        req.log = createNoopLogger() as any;
        
        // 每小时整点打印一次监控日志（分钟数为 0）
        const now = new Date();
        if (now.getMinutes() === 0 && now.getSeconds() < 10) {
          logger.warn({
            url: req.url,
            method: req.method,
            remoteAddress: req.ip,
            hour: now.getHours(),
          }, '⚠️ 废弃端点仍在被调用（每小时提醒一次）');
        }
        
        return reply.code(410).send({
          error: 'Gone',
          message: 'This endpoint has been deprecated and removed',
          deprecatedSince: '2026-01-01'
        });
      }
      
      // 对非废弃端点，手动记录请求日志
      req.log.info({
        req: {
          method: req.method,
          url: req.url,
          host: req.headers?.host,
          remoteAddress: req.ip,
          remotePort: req.socket?.remotePort,
        }
      }, 'incoming request');
    });
    
    // 手动记录响应完成日志（排除废弃端点）
    server.addHook('onResponse', async (req: any, reply: any) => {
      if (isDeprecatedEndpoint(req.url)) {
        return; // 废弃端点不记录响应日志
      }
      
      const responseTime = req._startTime ? Date.now() - req._startTime : 0;
      req.log.info({
        res: { statusCode: reply.statusCode },
        responseTime
      }, 'request completed');
    });
    
    // 添加路由中间件（在服务器启动前）
    server.addHook('preHandler', async (req: any, reply: any) => {
      // 记录请求开始时间（用于计算响应时间）
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
        
        // 使用模型路由器进行智能识别
        const routeResult = modelRouter.routeModel(originalModel, defaultProvider);
        if (routeResult) {
          routedModel = routeResult.model;
          reason = routeResult.ruleDescription || '智能识别模型';
        }
        
        // 如果识别失败，使用默认模型
        if (!routedModel) {
          routedModel = defaultModel;
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
        const isPassthrough = provider.type === 'passthrough' || 
                             provider.transformer?.use?.includes('passthrough');
        const modeLabel = isPassthrough ? ' [🔄 透传模式]' : '';
        
        logger.info({ msg: `📋 ${provider.name} (${provider.type})${modeLabel}` });
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
            msg: `模型列表: ${provider.models.join(', ')}` 
          });
        }
        
        if (isPassthrough) {
          logger.info({ 
            msg: `⚡ 透传模式: 请求将原样转发,仅添加认证头` 
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