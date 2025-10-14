# 测试验证指南

## 🚀 快速开始

### 1. 启动服务
```bash
npm run dev
```

### 2. 健康检查

**curl:**
```bash
curl http://localhost:3000/health
```

**httpie:**
```bash
http GET http://localhost:3000/health
```

## 📡 基础测试

### 简单对话测试

**curl:**
```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter,anthropic/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 100
  }'
```

**httpie:**
```bash
http POST http://localhost:3000/v1/messages \
  model="openrouter,anthropic/claude-sonnet-4.5" \
  messages:='[{"role":"user","content":"你好"}]' \
  max_tokens:=100
```

### 流式响应测试

**curl:**
```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter,anthropic/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "介绍一下 AI"}],
    "max_tokens": 200,
    "stream": true
  }'
```

**httpie:**
```bash
http POST http://localhost:3000/v1/messages \
  model="openrouter,anthropic/claude-sonnet-4.5" \
  messages:='[{"role":"user","content":"介绍一下 AI"}]' \
  max_tokens:=200 \
  stream:=true
```

### 查看可用模型

**curl:**
```bash
curl http://localhost:3000/v1/models
```

**httpie:**
```bash
http GET http://localhost:3000/v1/models
```

## 🐳 Docker 测试

### 启动容器
```bash
docker run -d \
  --name llms-server \
  -p 3000:3000 \
  -e OPENROUTER_API_KEY=your_api_key \
  sesiting/llms:latest
```

### 查看日志
```bash
docker logs -f llms-server
```

### 停止容器
```bash
docker stop llms-server && docker rm llms-server
```

## 🔧 常见问题

### 端口被占用
```bash
# 检查端口
lsof -i :3000

# 使用其他端口
PORT=3009 npm run dev
```

### 查看详细错误

**curl:**
```bash
curl -v -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"openrouter,anthropic/claude-sonnet-4.5","messages":[{"role":"user","content":"test"}],"max_tokens":10}'
```

**httpie:**
```bash
http -v POST http://localhost:3000/v1/messages \
  model="openrouter,anthropic/claude-sonnet-4.5" \
  messages:='[{"role":"user","content":"test"}]' \
  max_tokens:=10
```

