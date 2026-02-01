# 透传模式 (Passthrough Mode) 识别指南

## 什么是透传模式?

透传模式是一种特殊的请求处理模式,跳过所有请求/响应格式转换,将请求原样转发给目标 API,仅添加必要的认证头。

**适用场景**: 已经兼容 Anthropic API 格式的服务(如智谱 GLM、MiniMax)

## 🔍 快速识别透传模式

### 1. **启动时识别** (最明显)

服务启动时会在提供商配置中标注透传模式:

```
[INFO] 🔧 提供商配置
[INFO] 📋 zhipu-glm (passthrough) [🔄 透传模式]
[INFO] 📍 Base URL: https://open.bigmodel.cn/api/anthropic/v1/messages
[INFO] 🔑 API Key: ✅ ...xxxxx
[INFO] 🤖 模型数量: 1
[INFO] 模型列表: glm-4.7
[INFO] ⚡ 透传模式: 请求将原样转发,仅添加认证头
```

**识别标志**:
- ✅ `(passthrough)` - provider type
- ✅ `[🔄 透传模式]` - 模式标签
- ✅ `⚡ 透传模式: 请求将原样转发,仅添加认证头` - 详细说明

### 2. **请求处理时识别**

每次处理请求时会打印透传模式标识:

```
[INFO] [ROUTE] 📥 RECEIVED - 接收请求
[INFO] 🔄 [PASSTHROUGH MODE] 透传模式已启用 - 跳过所有格式转换
[INFO] 🔐 [PASSTHROUGH MODE] 仅执行认证处理 - 请求体原样透传
[INFO] [ROUTE] 🚀 EXECUTING (PASSTHROUGH) - 透传模式执行请求
[INFO] [ROUTE] ✅ COMPLETED - 请求完成
```

**识别标志**:
- ✅ `🔄 [PASSTHROUGH MODE]` - 透传模式启用
- ✅ `🔐 [PASSTHROUGH MODE]` - 认证处理
- ✅ `🚀 EXECUTING (PASSTHROUGH)` - 透传模式执行
- ✅ `mode: 'PASSTHROUGH'` - JSON 字段标识

### 3. **配置文件识别**

查看 `configs/config-glm.json`:

```json
{
  "id": "zhipu-glm",
  "type": "passthrough",           // ← 透传类型
  "transformer": {
    "use": ["passthrough"]         // ← 使用 passthrough transformer
  }
}
```

## 📊 日志对比

### 透传模式日志 (Passthrough Mode)

```
[INFO] 🔧 提供商配置
[INFO] 📋 zhipu-glm (passthrough) [🔄 透传模式]
[INFO] ⚡ 透传模式: 请求将原样转发,仅添加认证头
[INFO] [ROUTE] 📥 RECEIVED - 接收请求
[INFO] 🔄 [PASSTHROUGH MODE] 透传模式已启用 - 跳过所有格式转换
[INFO] 🔐 [PASSTHROUGH MODE] 仅执行认证处理 - 请求体原样透传
[INFO] [ROUTE] 🚀 EXECUTING (PASSTHROUGH) - 透传模式执行请求
[INFO] [ROUTE] ✅ COMPLETED - 请求完成
```

**特点**:
- ✅ 3 个 `[PASSTHROUGH MODE]` 标识
- ✅ 没有任何 transformer 转换日志
- ✅ 简洁、快速

### 普通模式日志 (Transform Mode)

```
[INFO] 🔧 提供商配置
[INFO] 📋 openrouter (openai)
[INFO] [ROUTE] 📥 RECEIVED - 接收请求
[DEBUG] transforming request format...
[DEBUG] executing provider transformers...
[DEBUG] executing model transformers...
[INFO] [ROUTE] 🚀 EXECUTING - 执行请求
[DEBUG] transforming response format...
[INFO] [ROUTE] ✅ COMPLETED - 请求完成
```

**特点**:
- ❌ 没有 `[PASSTHROUGH MODE]` 标识
- ✅ 大量 transformer 转换日志
- ✅ 较为复杂

## 🎯 关键字搜索

使用以下关键字快速在日志中搜索透传模式:

```bash
# 查看所有透传模式日志
grep "PASSTHROUGH" logs.txt

# 查看透传模式的 provider 配置
grep "透传模式" logs.txt

# 查看模式标识
grep "mode:" logs.txt | grep "PASSTHROUGH"
```

## ✅ 验证清单

如何确认透传模式正常工作:

- [ ] 启动日志显示 `[🔄 透传模式]`
- [ ] 启动日志显示 `⚡ 透传模式: 请求将原样转发`
- [ ] 请求日志显示 `🔄 [PASSTHROUGH MODE] 透传模式已启用`
- [ ] 请求日志显示 `🔐 [PASSTHROUGH MODE] 仅执行认证处理`
- [ ] 请求日志显示 `🚀 EXECUTING (PASSTHROUGH)`
- [ ] 没有看到任何 transformer 内部的转换日志
- [ ] 请求成功返回,无 422 错误

## 🔧 配置透传模式

### 步骤 1: 创建/使用 Passthrough Transformer

已提供: `src/transformer/passthrough.transformer.ts`

### 步骤 2: 配置 Provider

在配置文件中设置:

```json
{
  "id": "your-provider",
  "type": "passthrough",
  "transformer": {
    "use": ["passthrough"]
  }
}
```

### 步骤 3: 重启服务

```bash
npm run dev
# 或
docker restart llms
```

### 步骤 4: 验证日志

查看启动日志,确认看到 `[🔄 透传模式]` 标识。

## 📝 注意事项

1. **透传模式仅适用于已兼容 Anthropic API 的服务**
   - 智谱 GLM ✅
   - MiniMax ✅
   - 其他自定义 Anthropic 兼容服务 ✅

2. **透传模式跳过所有转换**
   - 不执行 `transformRequestOut`
   - 不执行 `transformRequestIn`
   - 不执行 `transformResponseOut`
   - 不执行 `transformResponseIn`
   - 仅执行 `auth` (认证)

3. **性能优势**
   - 跳过转换步骤,减少延迟
   - 减少内存使用
   - 减少日志输出
   - 更接近直接调用 API 的性能

## 🚀 故障排查

### 问题: 启动时没有看到 `[🔄 透传模式]` 标识

**原因**: 配置未正确设置

**解决**:
1. 检查配置文件中 `type` 是否为 `"passthrough"`
2. 检查 `transformer.use` 是否包含 `"passthrough"`
3. 重新构建: `npm run build`
4. 重启服务

### 问题: 请求时看到 transformer 转换日志

**原因**: bypass 模式未生效

**解决**:
1. 确认配置中 `transformer.use` 数组只有一个元素: `["passthrough"]`
2. 确认没有模型级别的 transformer 配置
3. 查看日志是否有 `🔄 [PASSTHROUGH MODE]` 标识
4. 如果没有,检查 `shouldBypassTransformers` 函数逻辑

### 问题: 仍然收到 422 错误

**原因**: 
1. 透传模式未生效
2. 请求格式本身有问题
3. API Key 不正确

**解决**:
1. 确认透传模式标识存在
2. 检查原始请求格式是否符合 Anthropic 标准
3. 验证 API Key 是否正确
4. 查看完整错误信息

## 📚 相关文档

- [DEPLOY.md](./DEPLOY.md) - 部署指南
- [README_zh.md](./README_zh.md) - 项目说明
- [config-glm.json](./configs/config-glm.json) - GLM 配置示例
