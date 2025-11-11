FROM node:20-slim

# 构建参数
ARG VERSION=1.0.2

# 镜像元数据
LABEL org.opencontainers.image.title="LLMs" \
      org.opencontainers.image.description="A universal LLM API transformation server" \
      org.opencontainers.image.version="${VERSION}"

WORKDIR /app/llms

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "start"]

