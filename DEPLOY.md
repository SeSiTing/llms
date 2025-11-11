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

# 2. 从 Dockerfile 读取版本号
export VERSION=$(grep -E '^ARG VERSION=' Dockerfile | sed 's/ARG VERSION=//' | tr -d ' ')
echo "当前版本: $VERSION"

# 3. 本地构建（同时打两个标签）
docker build -t sesiting/llms:${VERSION} -t sesiting/llms:latest .

# 4. 本地测试
docker run -d --name llms -p 3009:3000 --restart unless-stopped --env-file .env sesiting/llms:latest

# 5. 确认无误后推送
docker push sesiting/llms:${VERSION}
docker push sesiting/llms:latest
```

### 方式二：Harbor（Linux 版本）

推送到内网私有仓库，用于 Linux 服务器部署。

```bash
# 首次配置 buildx（一次性）
docker buildx create --use --name multi-builder

# 登录
docker login harbor.blacklake.tech

# 从 Dockerfile 读取版本号
export VERSION=$(grep -E '^ARG VERSION=' Dockerfile | sed 's/ARG VERSION=//' | tr -d ' ')
echo "当前版本: $VERSION"

# 构建 Linux 平台镜像（同时打两个标签）
docker buildx build \
  --platform linux/amd64 \
  -t harbor.blacklake.tech/ai/llms:${VERSION} \
  -t harbor.blacklake.tech/ai/llms:latest \
  --load \
  .

# 推送
docker push harbor.blacklake.tech/ai/llms:${VERSION}
docker push harbor.blacklake.tech/ai/llms:latest
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

使用 .env 文件管理环境变量（推荐）：

```bash
# 快速创建 .env 文件
echo "OPENROUTER_API_KEY=your-key" > .env

# 或使用 cat（多行配置）
cat > .env << EOF
OPENROUTER_API_KEY=your-key
PORT=3000
HOST=0.0.0.0
EOF

# 设置文件权限（可选）
chmod 600 .env
```

### 启动服务

```bash
# 拉取镜像（自动选择匹配的架构）
docker pull sesiting/llms:latest

# 使用 .env 文件启动（使用 latest 标签）
docker run -d --name llms-$(date +%Y%m%d) -p 3009:3000 --restart unless-stopped --env-file .env sesiting/llms:latest

# 或使用 Harbor 镜像
docker run -d --name llms-$(date +%Y%m%d) -p 3009:3000 --restart unless-stopped --env-file .env harbor.blacklake.tech/ai/llms:latest

# 使用指定版本（推荐生产环境）
docker run -d --name llms-$(date +%Y%m%d) -p 3009:3000 --restart unless-stopped --env-file .env sesiting/llms:1.0.2
```

### 查看状态

```bash
# 查看日志
docker logs -f llms

# 测试服务
curl http://localhost:3009/health

# 查看容器信息
docker ps | grep llms
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
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `OPENROUTER_API_KEY` | - | OpenRouter API 密钥（必需） |

## 端口说明

- **容器内端口**: 3000（默认，可通过 PORT 环境变量修改）
- **对外端口**: 通过 Docker 端口映射自定义（如 `-p 3009:3000`）
