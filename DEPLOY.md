# LLMs 服务部署

## 快速构建推送

```bash
# 登录 Harbor
docker login harbor.blacklake.tech

# 构建镜像
docker build -t harbor.blacklake.tech/ai/llms:latest .

# 推送镜像
docker push harbor.blacklake.tech/ai/llms:latest

# 带版本号
docker build -t harbor.blacklake.tech/ai/llms:v1.0.0 .
docker push harbor.blacklake.tech/ai/llms:v1.0.0
```

## 独立运行（测试用）

```bash
# 拉取镜像
docker pull harbor.blacklake.tech/ai/llms:latest

# 运行容器
docker run -d \
  --name llms-test \
  -p 3000:3000 \
  -e OPENROUTER_API_KEY=sk-or-v1-xxxxx \
  -e PORT=3000 \
  -e HOST=0.0.0.0 \
  harbor.blacklake.tech/ai/llms:latest

# 查看日志
docker logs -f llms-test

# 测试服务
curl http://localhost:3000/health
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
| `HOST` | 127.0.0.1 | 监听地址 |
| `OPENROUTER_API_KEY` | - | OpenRouter API 密钥（必需） |

## 端口说明

- **3000**: LLM API 转发服务端口

