# LLMs 服务部署

## 镜像仓库

项目镜像托管在两个仓库，均支持多平台（arm64 + amd64）：
- **Docker Hub**: `sesiting/llms:latest`（推荐，公开访问）
- **Harbor**: `harbor.blacklake.tech/ai/llms:latest`（私有仓库）

## 构建推送流程

### 方式一：Docker Hub（传统方式）

适合本地测试后再推送。

```bash
# 1. 登录
docker login

# 2. 本地构建
docker build -t sesiting/llms:latest .

# 3. 本地测试
docker run -d --name llms -p 3009:3000 --env-file .env sesiting/llms:latest

# 4. 确认无误后推送
docker push sesiting/llms:latest
```

### 方式二：Harbor（Linux 版本）

推送到内网私有仓库，用于 Linux 服务器部署。

```bash
# 首次配置 buildx（一次性）
docker buildx create --use --name multi-builder

# 登录
docker login harbor.blacklake.tech

# 构建 Linux 平台镜像
docker buildx build \
  --platform linux/amd64 \
  -t harbor.blacklake.tech/ai/llms:latest \
  --load \
  .

# 推送
docker push harbor.blacklake.tech/ai/llms:latest
```

### 拉取镜像

```bash
# 从 Docker Hub 拉取
docker pull sesiting/llms:latest

# 从 Harbor 拉取
docker pull harbor.blacklake.tech/ai/llms:latest
```

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

# 使用 .env 文件启动
docker run -d \
  --name llms \
  -p 3009:3000 \
  --env-file .env \
  sesiting/llms:latest

# 或使用 Harbor 镜像
docker run -d \
  --name llms \
  -p 3009:3000 \
  --env-file .env \
  harbor.blacklake.tech/ai/llms:latest
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
