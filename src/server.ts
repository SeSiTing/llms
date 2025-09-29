import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  FastifyRegisterOptions,
  preHandlerHookHandler,
  onRequestHookHandler,
  preParsingHookHandler,
  preValidationHookHandler,
  preSerializationHookHandler,
  onSendHookHandler,
  onResponseHookHandler,
  onTimeoutHookHandler,
  onErrorHookHandler,
  onRouteHookHandler,
  onRegisterHookHandler,
  onReadyHookHandler,
  onListenHookHandler,
  onCloseHookHandler,
  FastifyBaseLogger,
  FastifyLoggerOptions,
} from "fastify";
import cors from "@fastify/cors";
import { ConfigService, AppConfig } from "./services/config";
import { errorHandler } from "./api/middleware";
import { registerApiRoutes } from "./api/routes";
import { LLMService } from "./services/llm";
import { ProviderService } from "./services/provider";
import { TransformerService } from "./services/transformer";
import { PinoLoggerOptions } from "fastify/types/logger";

// Extend FastifyRequest to include custom properties
// 扩展 FastifyRequest 以包含自定义属性
declare module "fastify" {
  interface FastifyRequest {
    provider?: string; // 请求关联的提供商名称
  }
  interface FastifyInstance {
    _server?: Server; // 服务器实例引用
  }
}

// 服务器配置选项接口
interface ServerOptions {
  initialConfig?: AppConfig; // 初始配置
  logger?: boolean | PinoLoggerOptions; // 日志配置
}

// Application factory
// 应用工厂函数：创建 Fastify 实例
function createApp(logger: boolean | PinoLoggerOptions): FastifyInstance {
  const fastify = Fastify({
    bodyLimit: 50 * 1024 * 1024, // 设置请求体大小限制为 50MB
    logger,
  });

  // Register error handler
  // 注册全局错误处理器
  fastify.setErrorHandler(errorHandler);

  // Register CORS
  // 注册跨域资源共享（CORS）插件
  fastify.register(cors);
  return fastify;
}

// Server class
// 服务器主类：管理应用生命周期和核心服务
class Server {
  private app: FastifyInstance; // Fastify 应用实例
  configService: ConfigService; // 配置服务
  llmService: LLMService; // LLM 服务
  providerService: ProviderService; // 提供商服务
  transformerService: TransformerService; // 转换器服务

  constructor(options: ServerOptions = {}) {
    // 创建 Fastify 应用实例
    this.app = createApp(options.logger ?? true);
    // 初始化配置服务
    this.configService = new ConfigService(options);
    // 初始化转换器服务
    this.transformerService = new TransformerService(
      this.configService,
      this.app.log
    );
    // 异步初始化转换器，然后初始化提供商服务和 LLM 服务
    this.transformerService.initialize().finally(() => {
      this.providerService = new ProviderService(
        this.configService,
        this.transformerService,
        this.app.log
      );
      this.llmService = new LLMService(this.providerService);
    });
  }

  // Type-safe register method using Fastify native types
  // 类型安全的插件注册方法
  async register<Options extends FastifyPluginOptions = FastifyPluginOptions>(
    plugin: FastifyPluginAsync<Options> | FastifyPluginCallback<Options>,
    options?: FastifyRegisterOptions<Options>
  ): Promise<void> {
    await (this.app as any).register(plugin, options);
  }

  // Type-safe addHook method with Fastify native types
  // 类型安全的钩子添加方法（支持多种钩子类型）
  addHook(hookName: "onRequest", hookFunction: onRequestHookHandler): void;
  addHook(hookName: "preParsing", hookFunction: preParsingHookHandler): void;
  addHook(
    hookName: "preValidation",
    hookFunction: preValidationHookHandler
  ): void;
  addHook(hookName: "preHandler", hookFunction: preHandlerHookHandler): void;
  addHook(
    hookName: "preSerialization",
    hookFunction: preSerializationHookHandler
  ): void;
  addHook(hookName: "onSend", hookFunction: onSendHookHandler): void;
  addHook(hookName: "onResponse", hookFunction: onResponseHookHandler): void;
  addHook(hookName: "onTimeout", hookFunction: onTimeoutHookHandler): void;
  addHook(hookName: "onError", hookFunction: onErrorHookHandler): void;
  addHook(hookName: "onRoute", hookFunction: onRouteHookHandler): void;
  addHook(hookName: "onRegister", hookFunction: onRegisterHookHandler): void;
  addHook(hookName: "onReady", hookFunction: onReadyHookHandler): void;
  addHook(hookName: "onListen", hookFunction: onListenHookHandler): void;
  addHook(hookName: "onClose", hookFunction: onCloseHookHandler): void;
  public addHook(hookName: string, hookFunction: any): void {
    this.app.addHook(hookName as any, hookFunction);
  }

  async start(): Promise<void> {
    try {
      // 将服务器实例保存到 Fastify 实例中，供路由访问
      this.app._server = this;

      // 预处理钩子：记录 /v1/messages 请求体并确保 stream 字段存在
      this.app.addHook("preHandler", (request, reply, done) => {
        if (request.url.startsWith("/v1/messages") && request.body) {
          request.log.info({ data: request.body, type: "request body" });
          request.body.stream === true;
          if (!request.body.stream) {
            request.body.stream = false; // Ensure stream is false if not set
          }
        }
        done();
      });

      // 预处理钩子：解析模型提供商中间件
      // 从请求的 model 字段中提取提供商名称（格式：provider,model）
      this.app.addHook(
        "preHandler",
        async (req: FastifyRequest, reply: FastifyReply) => {
          if (req.url.startsWith("/api") || req.method !== "POST") return;
          // Skip middleware for provider management endpoints
          // 跳过提供商管理端点
          if (req.url.startsWith("/providers")) return;
          try {
            const body = req.body as any;
            if (!body || !body.model) {
              return reply
                .code(400)
                .send({ error: "Missing model in request body" });
            }
            // 分割 model 字段，格式为 "provider,model"
            const [provider, model] = body.model.split(",");
            body.model = model;
            req.provider = provider;
            return;
          } catch (err) {
            req.log.error("Error in modelProviderMiddleware:", err);
            return reply.code(500).send({ error: "Internal server error" });
          }
        }
      );

      // 注册所有 API 路由
      this.app.register(registerApiRoutes);

      // 启动服务器监听
      const address = await this.app.listen({
        port: parseInt(this.configService.get("PORT") || "3000", 10),
        host: this.configService.get("HOST") || "127.0.0.1",
      });

      this.app.log.info(`🚀 LLMs API server listening on ${address}`);

      // 优雅关闭处理函数
      const shutdown = async (signal: string) => {
        this.app.log.info(`Received ${signal}, shutting down gracefully...`);
        await this.app.close();
        process.exit(0);
      };

      // 监听进程退出信号
      process.on("SIGINT", () => shutdown("SIGINT"));
      process.on("SIGTERM", () => shutdown("SIGTERM"));
    } catch (error) {
      this.app.log.error(`Error starting server: ${error}`);
      process.exit(1);
    }
  }
}

// Export for external use
// 导出服务器类供外部使用
export default Server;
