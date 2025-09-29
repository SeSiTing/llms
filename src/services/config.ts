import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import JSON5 from 'json5';

// 配置服务选项接口
export interface ConfigOptions {
  envPath?: string; // .env 文件路径
  jsonPath?: string; // config.json 文件路径
  useEnvFile?: boolean; // 是否使用 .env 文件
  useJsonFile?: boolean; // 是否使用 JSON 配置文件
  useEnvironmentVariables?: boolean; // 是否使用环境变量
  initialConfig?: AppConfig; // 初始配置对象
}

// 应用配置接口
export interface AppConfig {
  [key: string]: any; // 支持任意配置项
}

// 配置服务类：负责加载和管理应用配置
// 支持从 JSON 文件、.env 文件和环境变量中加载配置
export class ConfigService {
  private config: AppConfig = {}; // 配置存储对象
  private options: ConfigOptions; // 配置选项

  constructor(
    options: ConfigOptions = {
      jsonPath: "./config.json",
    }
  ) {
    this.options = {
      envPath: options.envPath || ".env",
      jsonPath: options.jsonPath,
      useEnvFile: false,
      useJsonFile: options.useJsonFile !== false,
      useEnvironmentVariables: options.useEnvironmentVariables !== false,
      ...options,
    };

    // 加载所有配置源
    this.loadConfig();
  }

  // 加载配置：按优先级从不同来源加载配置
  // 优先级：JSON 文件 < 初始配置 < .env 文件 < 环境变量
  private loadConfig(): void {
    // 从 JSON 文件加载配置
    if (this.options.useJsonFile && this.options.jsonPath) {
      this.loadJsonConfig();
    }

    // 合并初始配置
    if (this.options.initialConfig) {
      this.config = { ...this.config, ...this.options.initialConfig };
    }

    // 从 .env 文件加载配置
    if (this.options.useEnvFile) {
      this.loadEnvConfig();
    }

    // if (this.options.useEnvironmentVariables) {
    //   this.loadEnvironmentVariables();
    // }

    // 将日志配置同步到环境变量
    if (this.config.LOG_FILE) {
      process.env.LOG_FILE = this.config.LOG_FILE;
    }
    if (this.config.LOG) {
      process.env.LOG = this.config.LOG;
    }
  }

  // 从 JSON 文件加载配置（支持 JSON5 格式）
  private loadJsonConfig(): void {
    if (!this.options.jsonPath) return;

    const jsonPath = this.isAbsolutePath(this.options.jsonPath)
      ? this.options.jsonPath
      : join(process.cwd(), this.options.jsonPath);

    if (existsSync(jsonPath)) {
      try {
        const jsonContent = readFileSync(jsonPath, "utf-8");
        const jsonConfig = JSON5.parse(jsonContent);
        this.config = { ...this.config, ...jsonConfig };
        console.log(`Loaded JSON config from: ${jsonPath}`);
      } catch (error) {
        console.warn(`Failed to load JSON config from ${jsonPath}:`, error);
      }
    } else {
      console.warn(`JSON config file not found: ${jsonPath}`);
    }
  }

  private loadEnvConfig(): void {
    const envPath = this.isAbsolutePath(this.options.envPath!)
      ? this.options.envPath!
      : join(process.cwd(), this.options.envPath!);

    if (existsSync(envPath)) {
      try {
        const result = config({ path: envPath });
        if (result.parsed) {
          this.config = {
            ...this.config,
            ...this.parseEnvConfig(result.parsed),
          };
        }
      } catch (error) {
        console.warn(`Failed to load .env config from ${envPath}:`, error);
      }
    }
  }

  private loadEnvironmentVariables(): void {
    const envConfig = this.parseEnvConfig(process.env);
    this.config = { ...this.config, ...envConfig };
  }

  private parseEnvConfig(
    env: Record<string, string | undefined>
  ): Partial<AppConfig> {
    const parsed: Partial<AppConfig> = {};

    Object.assign(parsed, env);

    return parsed;
  }

  private isAbsolutePath(path: string): boolean {
    return path.startsWith("/") || path.includes(":");
  }

  // 获取配置项（支持默认值和类型推断）
  public get<T = any>(key: keyof AppConfig): T | undefined;
  public get<T = any>(key: keyof AppConfig, defaultValue: T): T;
  public get<T = any>(key: keyof AppConfig, defaultValue?: T): T | undefined {
    const value = this.config[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  // 获取所有配置
  public getAll(): AppConfig {
    return { ...this.config };
  }

  // 获取 HTTPS 代理配置（尝试多个可能的配置项）
  public getHttpsProxy(): string | undefined {
    return (
      this.get("HTTPS_PROXY") ||
      this.get("https_proxy") ||
      this.get("httpsProxy") ||
      this.get("PROXY_URL")
    );
  }

  // 检查配置项是否存在
  public has(key: keyof AppConfig): boolean {
    return this.config[key] !== undefined;
  }

  // 设置配置项
  public set(key: keyof AppConfig, value: any): void {
    this.config[key] = value;
  }

  // 重新加载配置
  public reload(): void {
    this.config = {};
    this.loadConfig();
  }

  // 获取配置来源摘要信息
  public getConfigSummary(): string {
    const summary: string[] = [];

    if (this.options.initialConfig) {
      summary.push("Initial Config");
    }

    if (this.options.useJsonFile && this.options.jsonPath) {
      summary.push(`JSON: ${this.options.jsonPath}`);
    }

    if (this.options.useEnvFile) {
      summary.push(`ENV: ${this.options.envPath}`);
    }

    if (this.options.useEnvironmentVariables) {
      summary.push("Environment Variables");
    }

    return `Config sources: ${summary.join(", ")}`;
  }
}
