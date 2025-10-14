import Server from "../src/server.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// 环境变量插值函数
const interpolateEnvVars = (obj: any): any => {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g, (match, braced, unbraced) => {
      const varName = braced || unbraced;
      return process.env[varName] || match;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  } else if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result;
  }
  return obj;
};

// 读取配置文件
const readConfig = () => {
  const configPaths = [
    join(process.cwd(), "config.json"),
    join(homedir(), ".llms", "config.json"),
    process.env.LLMS_CONFIG_PATH
  ].filter(Boolean);

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, "utf-8");
        const config = JSON.parse(configContent);
        return interpolateEnvVars(config);
      } catch (error) {
        console.error(`Failed to parse config file ${configPath}:`, error);
      }
    }
  }
  
  console.log("No config file found, using default configuration");
  return null;
};

// 计算 token 数量（简化版）
const calculateTokenCount = (messages: any[], system: any[] = [], tools: any[] = []): number => {
  let tokenCount = 0;
  
  // 简化的 token 计算：每个字符约 0.25 tokens
  const countTokens = (text: string) => Math.ceil(text.length * 0.25);
  
  messages.forEach(msg => {
    if (msg.content) {
      tokenCount += countTokens(JSON.stringify(msg.content));
    }
  });
  
  system.forEach(sys => {
    if (sys.text) {
      tokenCount += countTokens(sys.text);
    }
  });
  
  if (tools && tools.length > 0) {
    tokenCount += countTokens(JSON.stringify(tools));
  }
  
  return tokenCount;
};

// 路由逻辑（参考 claude-code-router）
const getUseModel = (req: any, tokenCount: number, config: any): string => {
  // 1. 如果请求已经包含 provider,model 格式，直接验证并返回
  if (req.body.model && req.body.model.includes(",")) {
    const [provider, model] = req.body.model.split(",");
    const finalProvider = config.Providers.find((p: any) => p.name.toLowerCase() === provider.toLowerCase());
    const finalModel = finalProvider?.models?.find((m: any) => m.toLowerCase() === model.toLowerCase());
    if (finalProvider && finalModel) {
      return `${finalProvider.name},${finalModel}`;
    }
    return req.body.model;
  }

  // 2. 根据 token 数量选择长上下文模型
  const longContextThreshold = config.Router?.longContextThreshold || 60000;
  if (tokenCount > longContextThreshold && config.Router?.longContext) {
    console.log(`Using long context model due to token count: ${tokenCount}, threshold: ${longContextThreshold}`);
    return config.Router.longContext;
  }

  // 3. 根据特定模型名称选择背景模型
  if (req.body.model?.startsWith("claude-3-5-haiku") && config.Router?.background) {
    console.log(`Using background model for ${req.body.model}`);
    return config.Router.background;
  }

  // 4. 根据工具类型选择搜索模型
  if (req.body.tools && Array.isArray(req.body.tools) && 
      req.body.tools.some((tool: any) => tool.type?.startsWith("web_search")) && 
      config.Router?.webSearch) {
    return config.Router.webSearch;
  }

  // 5. 默认使用配置的默认模型
  return config.Router?.default || "openrouter,anthropic/claude-3.5-sonnet";
};

async function start() {
  try {
    // 读取配置文件
    const config = readConfig();
    
    const server = new Server();
    
    // 添加路由中间件（在服务器启动前）
    server.app.addHook('preHandler', async (req: any, reply: any) => {
      // 跳过非POST请求和API端点
      if (req.method !== 'POST' || req.url.startsWith('/api') || req.url.startsWith('/providers')) {
        return;
      }
      
      const body = req.body as any;
      if (!body || !body.model) {
        return;
      }
      
      // 如果模型名称不包含逗号，说明是直接模型名称，需要路由
      if (!body.model.includes(',')) {
        if (config && config.Router) {
          const tokenCount = calculateTokenCount(body.messages || [], body.system || [], body.tools || []);
          const routedModel = getUseModel(req, tokenCount, config);
          console.log(`🔄 Routing model ${body.model} → ${routedModel}`);
          body.model = routedModel;
        } else {
          // 如果没有配置文件，使用默认路由
          body.model = "openrouter,anthropic/claude-3.5-sonnet";
          console.log(`🔄 Using default routing: ${body.model}`);
        }
      }
    });
    
    // 启动服务器
    await server.start();
    
    // 如果配置文件存在，注册提供商（在服务器启动后）
    if (config && config.Providers) {
      console.log("Registering providers from config...");
      
      for (const provider of config.Providers) {
        try {
          const response = await fetch(`http://localhost:${config.PORT || 3000}/providers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: provider.id,
              name: provider.name,
              type: provider.type,
              baseUrl: provider.baseUrl,
              apiKey: provider.apiKey,
              models: provider.models,
              transformer: provider.transformer
            })
          });
          
          if (response.ok) {
            console.log(`✅ Registered provider: ${provider.name}`);
          } else {
            console.error(`❌ Failed to register provider ${provider.name}:`, await response.text());
          }
        } catch (error) {
          console.error(`❌ Error registering provider ${provider.name}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();