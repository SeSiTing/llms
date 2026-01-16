# LLMs 服务部署

## 镜像仓库

项目镜像托管在两个仓库，均支持多平台（arm64 + amd64）：
- **Docker Hub**: `sesiting/llms:latest`（推荐，公开访问）
- **Harbor**: `harbor.blacklake.tech/ai/llms:latest`（私有仓库）

## 版本号规范

采用语义化版本 `MAJOR.MINOR.PATCH`（不带 v 前缀）：
- **格式**: `1.0.0`（主版本.次版本.修订号）
- **示例**: `1.0.0`、`1.1.0`、`1.0.1`
- **标签策略**: 精确版本 + `latest`（两层标签，简单清晰）

## 构建推送流程

### 版本管理说明

**版本号唯一来源**：`Dockerfile` 中的 `ARG VERSION` 字段

```dockerfile
# Dockerfile
ARG VERSION=1.0.2
```

**环境变量设置**（自动读取版本号）：

```bash
# 从 Dockerfile 自动读取版本号并设置到 $VERSION，并打印输出
export VERSION=$(grep -E '^ARG VERSION=' Dockerfile | sed 's/ARG VERSION=//' | tr -d ' ')
echo "当前版本: $VERSION"
```

> **注意**：不要手动设置 `export VERSION=1.0.2`，应该始终从 Dockerfile 自动读取，确保版本一致性。更新版本时，只需修改 Dockerfile 中的 `ARG VERSION` 值。

### 方式一：Docker Hub（传统方式）

适合本地测试后再推送。

```bash
# 1. 登录
docker login

# 2. 本地构建（同时打两个标签，${VERSION} 需先执行上方"版本管理说明"中的命令）
docker build -t sesiting/llms:${VERSION} -t sesiting/llms:latest .

# 3. 本地测试
docker run -d --name llms -p 3009:3000 --restart unless-stopped --env-file .env sesiting/llms:latest

# 4. 确认无误后推送
docker push sesiting/llms:${VERSION} && docker push sesiting/llms:latest
```

### 方式二：Harbor（Linux 版本）

推送到内网私有仓库，用于 Linux 服务器部署。

```bash
# 首次配置 buildx（一次性）
docker buildx create --use --name multi-builder

# 登录
docker login harbor.blacklake.tech

# 构建 Linux 平台镜像（同时打两个标签，${VERSION} 需先执行上方"版本管理说明"中的命令）
docker buildx build --platform linux/amd64 -t harbor.blacklake.tech/ai/llms:${VERSION} -t harbor.blacklake.tech/ai/llms:latest --load .

# 推送
docker push harbor.blacklake.tech/ai/llms:${VERSION} && docker push harbor.blacklake.tech/ai/llms:latest
```

### 拉取镜像

```bash
# 从 Docker Hub 拉取
docker pull sesiting/llms:latest
docker pull sesiting/llms:${VERSION}

# 从 Harbor 拉取
docker pull harbor.blacklake.tech/ai/llms:latest
docker pull harbor.blacklake.tech/ai/llms:${VERSION}
```

> **注意**：使用 `${VERSION}` 前需要先执行版本号读取命令，或直接指定版本号（如 `sesiting/llms:1.0.2`）

## 独立运行

### 环境配置

**本地开发**：在 `~/.zshrc` 配置环境变量

```bash
# 添加到 ~/.zshrc
export OPENROUTER_API_KEY=your-key
export OPENAI_API_KEY=your-key

# 使配置生效
source ~/.zshrc
```

**生产部署**：使用 .env 文件

```bash
# 创建 .env 文件
echo "OPENROUTER_API_KEY=your-key" > .env
echo "OPENAI_API_KEY=your-key" >> .env
echo "OPENROUTER_BASE_URL=https://openrouter-proxy.blacklake.cn/api/v1/chat/completions" >> .env


# 或多行配置
echo -e "OPENROUTER_API_KEY=your-key\nOPENAI_API_KEY=your-key\nPORT=3000\nHOST=0.0.0.0" > .env
```

### 配置选择

服务支持通过环境变量 `LLMS_CONFIG_PROFILE` 选择不同的配置文件：

- **默认值**: `default`（如果未设置，使用此默认值）
- **可用配置**:
  - `default` - 通用配置，同时包含 OpenAI 和 OpenRouter 两个 provider，支持多种模型（GPT、Claude、Gemini、Grok 等）

配置文件位于 `configs/config-${profile}.json`。模型可通过系统界面动态选择。

### 启动服务

**本地测试**（使用 zshrc 环境变量）：

```bash
# 拉取镜像
docker pull sesiting/llms:latest

# 使用 zshrc 环境变量启动
docker run -d --name llms -p 3009:3000 --restart unless-stopped -e OPENROUTER_API_KEY -e OPENAI_API_KEY sesiting/llms:latest

# 或使用 Harbor 镜像
docker run -d --name llms -p 3009:3000 --restart unless-stopped -e OPENROUTER_API_KEY -e OPENAI_API_KEY harbor.blacklake.tech/ai/llms:latest

# 使用指定版本
docker run -d --name llms -p 3009:3000 --restart unless-stopped -e OPENROUTER_API_KEY -e OPENAI_API_KEY sesiting/llms:1.0.2
```

**生产部署**（使用 .env 文件）：

```bash
# 拉取镜像
docker pull harbor.blacklake.tech/ai/llms:latest

# 默认配置（default，包含 OpenAI 和 OpenRouter）
docker run -d --name llms -p 3009:3000 --restart unless-stopped --env-file .env harbor.blacklake.tech/ai/llms:latest

# Debug 模式启动（查看详细日志）
docker run -d --name llms -p 3009:3000 --restart unless-stopped --env-file .env -e LOG_LEVEL=debug harbor.blacklake.tech/ai/llms:latest
```

**说明**：
- 本地测试：`-e OPENROUTER_API_KEY -e OPENAI_API_KEY` 继承 zshrc 中的环境变量
- 生产部署：`--env-file .env` 从文件加载环境变量
- `-e LLMS_CONFIG_PROFILE=xxx` 可选，切换配置（默认 default）
- `-e LOG_LEVEL=debug` 可选，设置日志级别（`debug`、`info`、`warn`、`error`）
- `-e NODE_ENV=development` 可选，启用美化日志输出（仅开发环境）
- 模型选择可通过系统界面动态切换

### 查看状态

```bash
# 查看日志
docker logs -f llms

# 查看请求执行和完成日志（推荐）
docker logs -f llms 2>&1 | grep -E '\[ROUTE\]'

# 只看请求输入
docker logs -f llms 2>&1 | grep '"type":"request body"'

# 只看实际发送到 API 的请求（包含目标模型和 URL）
docker logs -f llms 2>&1 | grep '"msg":"final request"'

# 测试服务
curl http://localhost:3009/health

# 查看容器信息
docker ps | grep llms

# 诊断命令（排查启动失败问题）
# 查看完整日志（包括启动错误，注意替换容器名）
docker logs llms 2>&1

# 查看最近 100 行日志
docker logs --tail 100 llms

# 查看错误日志
docker logs llms 2>&1 | grep -i error

# 查看容器退出状态（如果容器已停止）
docker ps -a | grep llms

# 查看容器退出代码
docker inspect llms --format='{{.State.ExitCode}}'
```

## 本地开发构建

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动
npm start

# 或使用 nodemon 开发
npm run dev

# Debug 模式启动（查看详细日志）
# 方式 1：临时设置环境变量
LOG_LEVEL=debug npm run dev

# 方式 2：开发模式 + Debug（美化输出）
NODE_ENV=development LOG_LEVEL=debug npm run dev

# 方式 3：使用环境变量文件
export LOG_LEVEL=debug
export NODE_ENV=development  # 可选，启用美化输出
npm run dev

# 方式 4：Debug 模式启动并过滤关键日志（推荐开发调试）
# 过滤 [ROUTE]、请求体、最终请求信息
LOG_LEVEL=debug npm run dev 2>&1 | grep -E '\[ROUTE\]|"msg":"final request"|"type":"request body"'

# 方式 5：开发模式 + Debug + 过滤关键日志（美化输出）
# 过滤 [ROUTE]、请求体、最终请求信息
NODE_ENV=development LOG_LEVEL=debug npm run dev 2>&1 | grep -E '\[ROUTE\]|"msg":"final request"|"type":"request body"'
```

### 本地开发日志查看

```bash
# 查看所有日志（如果使用方式 4 或 5 启动，则已自动过滤）
# 如果直接启动，可以使用以下命令过滤：

# 查看关键日志（推荐）：[ROUTE]、请求体、最终请求信息
npm run dev 2>&1 | grep -E '\[ROUTE\]|"msg":"final request"|"type":"request body"'

# Debug 模式 + 过滤关键日志
LOG_LEVEL=debug npm run dev 2>&1 | grep -E '\[ROUTE\]|"msg":"final request"|"type":"request body"'

# 单独查看各类日志（可选）
# 查看请求执行和完成日志
npm run dev 2>&1 | grep -E '\[ROUTE\]'

# 只看请求输入
npm run dev 2>&1 | grep '"type":"request body"'

# 只看实际发送到 API 的请求（包含目标模型和 URL）
npm run dev 2>&1 | grep '"msg":"final request"'
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `OPENROUTER_API_KEY` | - | OpenRouter API 密钥（必需） |
| `OPENAI_API_KEY` | - | OpenAI API 密钥（可选，default 配置需要） |
| `LLMS_CONFIG_PROFILE` | `default` | 配置文件选择器（默认 `default`，包含 OpenAI 和 OpenRouter） |
| `LOG_LEVEL` | `info` | 日志级别（`debug`、`info`、`warn`、`error`） |
| `NODE_ENV` | - | 运行环境（`development` 时启用 pino-pretty 美化输出） |

## 端口说明

- **容器内端口**: 3000（默认，可通过 PORT 环境变量修改）
- **对外端口**: 通过 Docker 端口映射自定义（如 `-p 3009:3000`）
