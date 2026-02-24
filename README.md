# LLMs

> A universal LLM API transformation server, initially developed for the [claude-code-router](https://github.com/musistudio/claude-code-router).

## Supported Providers

- **Anthropic Claude** (Official API)
- **OpenAI** (GPT series)
- **Google Gemini** (Official + Vertex AI)
- **智谱 GLM** (glm-5) ⭐ 新增
- **MiniMax** (M2.5, M2.5-highspeed) ⭐ 新增
- **Deepseek**
- **Groq**
- **OpenRouter** (Aggregation service)
- **Cerebras**
- **Vercel AI**

## How it works

The LLM API transformation server acts as a middleware to standardize requests and responses between different LLM providers (Anthropic, Gemini, Deepseek, etc.). It uses a modular transformer system to handle provider-specific API formats.

### Key Components

1. **Transformers**: Each provider (e.g., Anthropic, Gemini) has a dedicated transformer class that implements:

   - `transformRequestIn`: Converts the provider's request format to a unified format.
   - `transformResponseIn`: Converts the provider's response format to a unified format.
   - `transformRequestOut`: Converts the unified request format to the provider's format.
   - `transformResponseOut`: Converts the unified response format back to the provider's format.
   - `endPoint`: Specifies the API endpoint for the provider (e.g., "/v1/messages" for Anthropic).

2. **Unified Formats**:

   - Requests and responses are standardized using `UnifiedChatRequest` and `UnifiedChatResponse` types.

3. **Streaming Support**:
   - Handles real-time streaming responses for providers like Anthropic, converting chunked data into a standardized format.

### Data Flow

1. **Request**:

   - Incoming provider-specific requests are transformed into the unified format.
   - The unified request is processed by the server.

2. **Response**:
   - The server's unified response is transformed back into the provider's format.
   - Streaming responses are handled with chunked data conversion.

### Example Transformers

- **Anthropic**: Converts between OpenAI-style and Anthropic-style message formats.
- **Gemini**: Adjusts tool definitions and parameter formats for Gemini compatibility.
- **Deepseek**: Enforces token limits and handles reasoning content in streams.

## Quick Start

### Installation

```sh
npm install
# or pnpm install
```

### Configuration

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```

2. Add your API keys:
   ```env
   ZHIPU_API_KEY=your_zhipu_api_key_here
   MINIMAX_API_KEY=your_minimax_api_key_here
   ```

### Running the Server

**Option 1: Default Configuration (OpenRouter Claude)**
```sh
npm start
# Server runs on http://localhost:3000
```

**Option 2: Use MiniMax as Default**
```sh
LLMS_CONFIG_PROFILE=minimax PORT=3001 npm start
# All haiku/sonnet/opus requests will be routed to MiniMax
```

**Option 3: Use Zhipu as Default**
```sh
LLMS_CONFIG_PROFILE=zhipu PORT=3002 npm start
# All haiku/sonnet/opus requests will be routed to GLM-4.7
```

**Option 4: Run Multiple Services Simultaneously**
```sh
# Terminal 1: MiniMax service
LLMS_CONFIG_PROFILE=minimax PORT=3001 npm start

# Terminal 2: Zhipu service
LLMS_CONFIG_PROFILE=zhipu PORT=3002 npm start

# Terminal 3: Default Claude service
npm start
```

### Model Routing

When using `config-minimax.json` or `config-zhipu.json`, Claude model names are automatically mapped:

**MiniMax Mapping:**
- `claude-haiku` / `haiku` → `MiniMax-M2.5`
- `claude-sonnet` / `sonnet` → `MiniMax-M2.5`
- `claude-opus` / `opus` → `MiniMax-M2.5`

**Zhipu Mapping:**
- `claude-haiku` / `haiku` → `glm-5`
- `claude-sonnet` / `sonnet` → `glm-5`
- `claude-opus` / `opus` → `glm-5`

### API Usage Example

```typescript
// Client code (e.g., Claude Code)
const response = await fetch('http://localhost:3001/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4.5',  // Will be routed to MiniMax-M2.5
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    max_tokens: 1024
  })
});
```

## Development

- **Development mode:**
  ```sh
  npm run dev
  # Uses nodemon + tsx for hot-reloading src/server.ts
  ```

- **Build:**
  ```sh
  npm run build
  # Outputs to dist/cjs and dist/esm
  ```

- **Test:**
  ```sh
  npm test
  # See CLAUDE.md for details
  ```

- **Path alias:**
  - `@` is mapped to the `src` directory, use `import xxx from '@/xxx'`.

## Configuration Files

- `configs/config-default.json` - Default configuration (OpenRouter Claude)
- `configs/config-minimax.json` - MiniMax as default provider
- `configs/config-zhipu.json` - Zhipu as default provider
- `.env` - Environment variables (API keys, etc.)

## Pricing Reference

- **GLM-5**: Input $2.00/M tokens, Output $8.00/M tokens
- **MiniMax-M2.5**: Input $2.10/M tokens, Output $8.40/M tokens

## API Key Registration

- **GLM**: https://www.bigmodel.cn/claude-code (China) or https://z.ai/subscribe (International)
- **MiniMax**: https://platform.minimaxi.com/subscribe/coding-plan (China) or https://platform.minimax.io/subscribe/coding-plan (International)

---

## Working with this repo

[👉 Contributing Guide](./CONTRIBUTING.md)
