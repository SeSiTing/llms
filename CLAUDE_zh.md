# CLAUDE_zh.md

此文件为 Claude Code (claude.ai/code) 在此仓库中处理代码时提供指导。

## 项目概述

这是一个通用的 LLM API 转换服务器，作为中间件来标准化不同 LLM 提供商（Anthropic、Gemini、Deepseek 等）之间的请求和响应。它使用模块化转换器系统来处理提供商特定的 API 格式。

## 核心架构组件

1. **转换器**：每个提供商都有一个专用的转换器类，实现：
   - `transformRequestIn`：将提供商的请求格式转换为统一格式
   - `transformResponseIn`：将提供商的响应格式转换为统一格式
   - `transformRequestOut`：将统一请求格式转换为提供商格式
   - `transformResponseOut`：将统一响应格式转换回提供商格式
   - `endPoint`：指定提供商的 API 端点

2. **统一格式**：使用 `UnifiedChatRequest` 和 `UnifiedChatResponse` 类型标准化请求和响应。

3. **流式支持**：处理提供商的实时流式响应，将分块数据转换为标准化格式。

## 常用开发命令

- **安装依赖**：`pnpm install` 或 `npm install`
- **开发模式**：`npm run dev`（使用 nodemon + tsx 进行热重载）
- **构建**：`npm run build`（输出到 dist/cjs 和 dist/esm）
- **代码检查**：`npm run lint`（在 src 目录运行 ESLint）
- **启动服务器（CJS）**：`npm start` 或 `node dist/cjs/server.cjs`
- **启动服务器（ESM）**：`npm run start:esm` 或 `node dist/esm/server.mjs`

## 项目结构

- `src/server.ts`：主入口点
- `src/transformer/`：提供商特定的转换器实现
- `src/services/`：核心服务（config、llm、provider、transformer）
- `src/types/`：TypeScript 类型定义
- `src/utils/`：工具函数
- `src/api/`：API 路由和中间件

## 路径别名

- `@` 映射到 `src` 目录，使用 `import xxx from '@/xxx'`

## 构建系统

项目使用 esbuild 进行构建，分别输出 CJS 和 ESM。构建脚本位于 `scripts/build.ts`。

## 添加新转换器

1. 在 `src/transformer/` 中创建新的转换器文件
2. 实现所需的转换器方法
3. 在 `src/transformer/index.ts` 中导出转换器
4. 转换器将在启动时自动注册


