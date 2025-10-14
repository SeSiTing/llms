# LLMs 服务部署

## 镜像仓库

项目镜像托管在两个仓库：
- **Docker Hub**: `sesiting/llms:latest`（推荐，公开访问）
- **Harbor**: `harbor.blacklake.tech/ai/llms:latest`（私有仓库）

## 快速构建推送

### Docker Hub
```bash
# 登录 Docker Hub
docker login

# 构建并推送
docker build -t sesiting/llms:latest .
docker push sesiting/llms:latest

# 带版本号
docker build -t sesiting/llms:v1.0.0 .
docker push sesiting/llms:v1.0.0
```

### Harbor（私有仓库）
```bash
# 登录 Harbor
docker login harbor.blacklake.tech

# 构建并推送
docker build -t harbor.blacklake.tech/ai/llms:latest .
docker push harbor.blacklake.tech/ai/llms:latest

# 带版本号
docker build -t harbor.blacklake.tech/ai/llms:v1.0.0 .
docker push harbor.blacklake.tech/ai/llms:v1.0.0

# 如果已构建好镜像，重新打标签后推送
docker tag sesiting/llms:latest harbor.blacklake.tech/ai/llms:latest
docker push harbor.blacklake.tech/ai/llms:latest
```

## 独立运行

### 使用 Docker Hub 镜像（推荐）
```bash
# 拉取镜像
docker pull sesiting/llms:latest

# 方式1: 使用 .env 文件
docker run -d \
  --name llms \
  -p 3009:3000 \
  --env-file .env \
  sesiting/llms:latest

# 方式2: 使用环境变量（需先 export OPENROUTER_API_KEY）
docker run -d \
  --name llms \
  -p 3009:3000 \
  -e OPENROUTER_API_KEY \
  sesiting/llms:latest
```

### 使用 Harbor 镜像
```bash
# 拉取镜像
docker pull harbor.blacklake.tech/ai/llms:latest

# 运行
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

