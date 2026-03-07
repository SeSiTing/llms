#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TARGET="${1:-llms}"

print_step() {
    echo -e "${CYAN}[$1]${NC} $2"
}

print_command() {
    echo -e "${YELLOW}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

show_usage() {
    echo "用法: $0 [target]"
    echo ""
    echo "支持的 target:"
    echo "  llms     - 启动默认服务 (端口 3010) [默认]"
    echo "  minimax  - 启动 minimax 服务 (端口 3009)"
    echo "  zhipu    - 启动 zhipu 服务 (端口 3008)"
    echo "  moonshot - 启动 moonshot 服务 (端口 3007)"
    echo "  ali      - 启动 ali 服务 (端口 3006)"
    echo "  all      - 启动所有服务"
    echo ""
    echo "示例:"
    echo "  $0             # 启动默认 llms"
    echo "  $0 all         # 启动所有服务"
    echo "  $0 minimax     # 启动 minimax"
}

# 根据容器名返回端口
get_port() {
    case "$1" in
        llms)     echo "3010" ;;
        minimax)  echo "3009" ;;
        zhipu)    echo "3008" ;;
        moonshot) echo "3007" ;;
        ali)      echo "3006" ;;
    esac
}

# 根据容器名返回 profile（llms 没有 profile）
get_profile() {
    case "$1" in
        minimax)  echo "minimax" ;;
        zhipu)    echo "zhipu" ;;
        moonshot) echo "moonshot" ;;
        ali)      echo "ali" ;;
        *)        echo "" ;;
    esac
}

# 根据容器名返回完整 docker 名称
get_container_name() {
    case "$1" in
        llms) echo "llms" ;;
        *)    echo "llms-$1" ;;
    esac
}

validate_target() {
    case "$TARGET" in
        llms|minimax|zhipu|moonshot|ali|all) ;;
        *)
            print_error "未知 target: $TARGET"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

get_containers() {
    if [ "$TARGET" = "all" ]; then
        echo "llms minimax zhipu moonshot ali"
    else
        echo "$TARGET"
    fi
}

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}   LLMS Docker 启动脚本${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

print_info "目标: $TARGET"
echo ""

validate_target

CONTAINERS=$(get_containers)
step=0

# Check env vars
print_step $((++step)) "检查环境变量"
missing_vars=()
for var in OPENROUTER_API_KEY OPENAI_API_KEY MINIMAX_API_KEY ZHIPU_API_KEY MOONSHOT_API_KEY ALI_API_KEY; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "缺少以下环境变量: ${missing_vars[*]}"
    exit 1
fi
print_success "环境变量检查通过"
echo ""

# Pull image
print_step $((++step)) "拉取最新镜像 sesiting/llms:latest"
print_command "docker pull sesiting/llms:latest"
docker pull sesiting/llms:latest
if [ $? -eq 0 ]; then
    print_success "镜像拉取完成"
else
    print_error "镜像拉取失败"
    exit 1
fi
echo ""

# Process each container
for name in $CONTAINERS; do
    port=$(get_port "$name")
    profile=$(get_profile "$name")
    full_name=$(get_container_name "$name")

    print_step $((++step)) "删除旧容器: $full_name"
    print_command "docker rm -f $full_name"
    docker rm -f "$full_name" 2>/dev/null || true
    print_success "已删除容器: $full_name"
    echo ""

    profile_arg=""
    if [ -n "$profile" ]; then
        profile_arg="-e LLMS_CONFIG_PROFILE=$profile"
    fi

    print_step $((++step)) "启动容器: $full_name (端口 $port)"
    print_command "docker run -d --name $full_name -p ${port}:3000 --restart unless-stopped \\
  -e OPENROUTER_API_KEY -e OPENAI_API_KEY -e MINIMAX_API_KEY -e ZHIPU_API_KEY -e MOONSHOT_API_KEY -e ALI_API_KEY \\
  ${profile_arg:+$profile_arg \\}
  sesiting/llms:latest"

    docker run -d --name "$full_name" -p "${port}:3000" --restart unless-stopped \
        -e OPENROUTER_API_KEY -e OPENAI_API_KEY -e MINIMAX_API_KEY -e ZHIPU_API_KEY -e MOONSHOT_API_KEY -e ALI_API_KEY \
        $profile_arg \
        sesiting/llms:latest

    if [ $? -eq 0 ]; then
        print_success "$full_name 已启动 (端口 $port)"
    else
        print_error "$full_name 启动失败"
    fi
    echo ""
done

# Show status
print_step $((++step)) "容器状态"
echo ""
docker ps --filter "name=llms" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   启动完成!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "服务地址:"
for name in $CONTAINERS; do
    port=$(get_port "$name")
    full_name=$(get_container_name "$name")
    printf "  ${CYAN}%-16s${NC} http://localhost:%s\n" "$full_name:" "$port"
done
echo ""
echo -e "查看日志: ${YELLOW}docker logs -f <container-name>${NC}"
echo ""
