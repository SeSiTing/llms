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
 * 2. 创建并启动服务器
 * 3. 注册提供商
 */
async function start() {
  try {
    // 读取配置文件
    const config = loadConfig();
    
    const server = new Server();
    
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
    
    // 如果配置文件存在，注册提供商（在服务器启动后）
    if (config && config.providers) {
      logger.info({ msg: '🔧 提供商配置' });
      
      for (const provider of config.providers) {
        try {
          // 配置文件结构与 src 保持一致，直接使用
          const providerData = { ...provider };
          
          logger.info({ msg: `📋 ${provider.name} (${provider.type})` });
          logger.info({ msg: `📍 Base URL: ${provider.baseUrl}` });
          
          // 安全显示 API Key（显示后6位）
          if (provider.apiKey && !provider.apiKey.startsWith('$')) {
            const maskedKey = `...${provider.apiKey.slice(-6)}`;
            logger.info({ msg: `🔑 API Key: ✅ ${maskedKey}` });
          } else {
            logger.info({ msg: '🔑 API Key: ❌ 缺失' });
          }
          
          logger.info({ msg: `🤖 模型数量: ${providerData.models?.length || 0}` });
          if (providerData.models?.length > 0) {
            logger.info({ msg: `模型列表: ${providerData.models.slice(0, 3).join(', ')}${providerData.models.length > 3 ? '...' : ''}` });
          }
          
          logger.info({ msg: '🔄 正在注册...' });
          
          const response = await fetch(
            `http://localhost:${config.PORT || SERVER_DEFAULTS.PORT}${API_ENDPOINTS.PROVIDERS}`, 
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(providerData)
            }
          );
          
          if (response.ok) {
            logger.info({ msg: '✅ 注册成功' });
          } else {
            const errorText = await response.text();
            logger.error({ err: new Error(errorText) }, '❌ 注册失败');
          }
        } catch (error) {
          logger.error({ err: error as Error }, '❌ 注册错误');
        }
      }
      
      logger.info({ msg: '🎉 所有提供商配置完成！' });
    }
  } catch (error) {
    logger.error({ err: error as Error }, '启动服务器失败');
    process.exit(1);
  }
}

start();