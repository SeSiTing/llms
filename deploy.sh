#!/bin/bash

# LLMs 发布脚本
# 用法: ./deploy.sh [prod|local|all]
#   prod (默认): 发布到 Harbor (harbor.blacklake.tech/ai/llms)
#   local: 发布到 Docker Hub (sesiting/llms)
#   all: 同时发布到 Harbor 和 Docker Hub

set -e  # 任何命令失败立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 打印进度信息
print_step() {
    echo -e "\n${GREEN}===> $1${NC}\n"
}

# 打印命令
print_cmd() {
    echo -e "${BLUE}$ $1${NC}"
}

# 部署到指定环境
deploy_to_env() {
    local TARGET_ENV=$1

    if [ "$TARGET_ENV" = "prod" ]; then
        IMAGE_PREFIX="harbor.blacklake.tech/ai/llms"
        BUILD_TYPE="buildx"
        print_step "📦 目标仓库: Harbor (内网生产环境)"
    elif [ "$TARGET_ENV" = "local" ]; then
        IMAGE_PREFIX="sesiting/llms"
        BUILD_TYPE="build"
        print_step "📦 目标仓库: Docker Hub (开发环境)"
    fi

    # 构建镜像
    print_step "2️⃣ 构建镜像 [$TARGET_ENV]"
    if [ "$BUILD_TYPE" = "buildx" ]; then
        # Harbor: 使用 buildx 构建 Linux 平台镜像
        print_cmd "DOCKER_BUILDKIT=1 docker buildx build --build-arg VERSION=${VERSION} --platform linux/amd64 -t ${IMAGE_PREFIX}:${VERSION} -t ${IMAGE_PREFIX}:latest --load ."
        DOCKER_BUILDKIT=1 docker buildx build \
            --build-arg VERSION=${VERSION} \
            --platform linux/amd64 \
            -t ${IMAGE_PREFIX}:${VERSION} \
            -t ${IMAGE_PREFIX}:latest \
            --load .
    else
        # Docker Hub: 使用普通 build（本地平台）
        print_cmd "DOCKER_BUILDKIT=1 docker build --build-arg VERSION=${VERSION} -t ${IMAGE_PREFIX}:${VERSION} -t ${IMAGE_PREFIX}:latest ."
        DOCKER_BUILDKIT=1 docker build \
            --build-arg VERSION=${VERSION} \
            -t ${IMAGE_PREFIX}:${VERSION} \
            -t ${IMAGE_PREFIX}:latest .
    fi

    # 推送镜像
    print_step "3️⃣ 推送镜像 [$TARGET_ENV]"

    # 推送 latest 标签
    CMD="docker push ${IMAGE_PREFIX}:latest"
    print_cmd "$CMD"
    docker push ${IMAGE_PREFIX}:latest &

    # 推送版本标签
    CMD="docker push ${IMAGE_PREFIX}:${VERSION}"
    print_cmd "$CMD"
    docker push ${IMAGE_PREFIX}:${VERSION} &

    # 等待所有推送完成
    wait

    # 完成
    echo -e "${GREEN}✓ $TARGET_ENV 环境发布完成${NC}"
    echo "  - ${IMAGE_PREFIX}:latest"
    echo "  - ${IMAGE_PREFIX}:${VERSION}"
}

# 获取环境参数（默认 prod）
ENV=${1:-prod}

print_step "🚀 LLMs 发布脚本"
echo "环境: $ENV"

# 1️⃣ 读取版本号
print_step "1️⃣ 读取版本号"
VERSION=$(grep -E '^ARG VERSION=' Dockerfile | sed 's/ARG VERSION=//' | tr -d ' ')
echo -e "${YELLOW}当前版本: $VERSION${NC}"

# 根据参数执行发布
if [ "$ENV" = "all" ]; then
    echo -e "${MAGENTA}将同时发布到 prod 和 local 环境${NC}"
    echo ""

    # 先发布到 prod
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}开始发布: PROD 环境${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    deploy_to_env "prod"

    echo ""
    # 再发布到 local
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}开始发布: LOCAL 环境${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    deploy_to_env "local"

    # 总结
    print_step "✅ 全部发布完成"
    echo "Harbor (prod):"
    echo "  - harbor.blacklake.tech/ai/llms:latest"
    echo "  - harbor.blacklake.tech/ai/llms:${VERSION}"
    echo ""
    echo "Docker Hub (local):"
    echo "  - sesiting/llms:latest"
    echo "  - sesiting/llms:${VERSION}"

elif [ "$ENV" = "prod" ] || [ "$ENV" = "local" ]; then
    deploy_to_env "$ENV"
    print_step "✅ 发布完成"
else
    echo "错误: 未知环境 '$ENV'，请使用 'prod'、'local' 或 'all'"
    exit 1
fi
