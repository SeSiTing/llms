import { Transformer, TransformerConstructor } from "@/types/transformer";
import { ConfigService } from "./config";
import Transformers from "@/transformer";
import Module from "node:module";

// 转换器配置接口
interface TransformerConfig {
  transformers: Array<{
    name: string; // 转换器名称
    type: "class" | "module"; // 转换器类型
    path?: string; // 转换器文件路径
    options?: any; // 转换器选项
  }>;
}

// 转换器服务类：负责管理所有的转换器（Transformer）
// 转换器用于在不同 LLM API 格式之间进行转换
export class TransformerService {
  // 转换器存储：Map<转换器名称, 转换器实例或构造函数>
  private transformers: Map<string, Transformer | TransformerConstructor> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: any
  ) {}

  // 注册转换器
  registerTransformer(name: string, transformer: Transformer): void {
    this.transformers.set(name, transformer);
    this.logger.info(
      `register transformer: ${name}${
        transformer.endPoint
          ? ` (endpoint: ${transformer.endPoint})`
          : " (no endpoint)"
      }`
    );
  }

  // 获取指定转换器
  getTransformer(
    name: string
  ): Transformer | TransformerConstructor | undefined {
    return this.transformers.get(name);
  }

  // 获取所有转换器
  getAllTransformers(): Map<string, Transformer | TransformerConstructor> {
    return new Map(this.transformers);
  }

  // 获取所有带端点的转换器（如 AnthropicTransformer 的 /v1/messages）
  // 这些转换器会注册为 API 路由
  getTransformersWithEndpoint(): { name: string; transformer: Transformer }[] {
    const result: { name: string; transformer: Transformer }[] = [];

    this.transformers.forEach((transformer, name) => {
      if (transformer.endPoint) {
        result.push({ name, transformer });
      }
    });

    return result;
  }

  // 获取所有不带端点的转换器（功能性转换器，如 ReasoningTransformer）
  // 这些转换器通常作为中间件使用
  getTransformersWithoutEndpoint(): {
    name: string;
    transformer: Transformer;
  }[] {
    const result: { name: string; transformer: Transformer }[] = [];

    this.transformers.forEach((transformer, name) => {
      if (!transformer.endPoint) {
        result.push({ name, transformer });
      }
    });

    return result;
  }

  // 移除转换器
  removeTransformer(name: string): boolean {
    return this.transformers.delete(name);
  }

  // 检查转换器是否存在
  hasTransformer(name: string): boolean {
    return this.transformers.has(name);
  }

  // 从配置中注册转换器（支持动态加载外部转换器）
  async registerTransformerFromConfig(config: {
    path?: string;
    options?: any;
  }): Promise<boolean> {
    try {
      if (config.path) {
        const module = require(require.resolve(config.path));
        if (module) {
          const instance = new module(config.options);
          // Set logger for transformer instance
          if (instance && typeof instance === "object") {
            (instance as any).logger = this.logger;
          }
          if (!instance.name) {
            throw new Error(
              `Transformer instance from ${config.path} does not have a name property.`
            );
          }
          this.registerTransformer(instance.name, instance);
          return true;
        }
      }
      return false;
    } catch (error: any) {
      this.logger.error(
        `load transformer (${config.path}) \nerror: ${error.message}\nstack: ${error.stack}`
      );
      return false;
    }
  }

  // 初始化转换器服务
  // 1. 注册所有内置转换器
  // 2. 从配置文件加载自定义转换器
  async initialize(): Promise<void> {
    try {
      await this.registerDefaultTransformersInternal();
      await this.loadFromConfig();
    } catch (error: any) {
      this.logger.error(
        `TransformerService init error: ${error.message}\nStack: ${error.stack}`
      );
    }
  }

  // 注册内置转换器（从 transformer/index.ts 导入）
  private async registerDefaultTransformersInternal(): Promise<void> {
    try {
      Object.values(Transformers).forEach(
        (TransformerStatic: TransformerConstructor) => {
          if (
            "TransformerName" in TransformerStatic &&
            typeof TransformerStatic.TransformerName === "string"
          ) {
            // 静态名称注册（类级别）
            this.registerTransformer(
              TransformerStatic.TransformerName,
              TransformerStatic
            );
          } else {
            // 实例化后注册（实例级别）
            const transformerInstance = new TransformerStatic();
            // Set logger for transformer instance
            // 为转换器实例设置日志记录器
            if (
              transformerInstance &&
              typeof transformerInstance === "object"
            ) {
              (transformerInstance as any).logger = this.logger;
            }
            this.registerTransformer(
              transformerInstance.name!,
              transformerInstance
            );
          }
        }
      );
    } catch (error) {
      this.logger.error({ error }, "transformer regist error:");
    }
  }

  // 从配置文件加载自定义转换器
  private async loadFromConfig(): Promise<void> {
    const transformers = this.configService.get<
      TransformerConfig["transformers"]
    >("transformers", []);
    for (const transformer of transformers) {
      await this.registerTransformerFromConfig(transformer);
    }
  }
}
