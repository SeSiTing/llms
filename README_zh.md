# LLMs

> 一个通用的 LLM API 转换服务器，最初为 [claude-code-router](https://github.com/musistudio/claude-code-router) 开发。

## 工作原理

LLM API 转换服务器作为中间件，标准化不同 LLM 提供商（Anthropic、Gemini、Deepseek 等）之间的请求和响应。它使用模块化转换器系统来处理提供商特定的 API 格式。

### 核心组件

1. **转换器**：每个提供商（如 Anthropic、Gemini）都有一个专用的转换器类，实现：

   - `transformRequestIn`：将提供商的请求格式转换为统一格式。
   - `transformResponseIn`：将提供商的响应格式转换为统一格式。
   - `transformRequestOut`：将统一请求格式转换为提供商格式。
   - `transformResponseOut`：将统一响应格式转换回提供商格式。
   - `endPoint`：指定提供商的 API 端点（如 Anthropic 的 "/v1/messages"）。

2. **统一格式**：

   - 使用 `UnifiedChatRequest` 和 `UnifiedChatResponse` 类型标准化请求和响应。

3. **流式支持**：
   - 处理 Anthropic 等提供商的实时流式响应，将分块数据转换为标准化格式。

### 数据流

1. **请求**：

   - 传入的提供商特定请求被转换为统一格式。
   - 统一请求由服务器处理。

2. **响应**：
   - 服务器的统一响应被转换回提供商格式。
   - 流式响应通过分块数据转换处理。

### 转换器示例

- **Anthropic**：在 OpenAI 风格和 Anthropic 风格的消息格式之间转换。
- **Gemini**：调整工具定义和参数格式以兼容 Gemini。
- **Deepseek**：强制执行令牌限制并处理流中的推理内容。

## 运行此仓库

- **安装依赖：**
  ```sh
  npm install
  # 或 pnpm install
  ```
- **开发：**
  ```sh
  npm run dev
  # 使用 nodemon + tsx 进行 src/server.ts 的热重载
  ```
- **构建：**
  ```sh
  npm run build
  # 输出到 dist/cjs 和 dist/esm
  ```
- **测试：**
  ```sh
  npm test
  # 详细信息请参见 CLAUDE.md
  ```
- **路径别名：**
  - `@` 映射到 `src` 目录，使用 `import xxx from '@/xxx'`。
- **环境变量：**
  - 支持 `.env` 和 `config.json`，请参见 `src/services/config.ts`。

---

## 使用此仓库

[👉 贡献指南](./CONTRIBUTING.md)
