#!/bin/bash

# Docker 阿里云镜像加速配置脚本
# 使用方法: bash setup-docker.sh

echo "开始配置Docker阿里云镜像加速..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查Docker服务状态
if ! systemctl is-active --quiet docker; then
    echo "警告: Docker 服务未运行"
fi

# 备份原有的 daemon.json
if [ -f /etc/docker/daemon.json ]; then
    echo "备份原有的 daemon.json..."
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# 复制新的配置文件
echo "复制阿里云镜像加速配置..."
sudo cp docker-daemon.json /etc/docker/daemon.json

# 重启Docker服务
echo "重启Docker服务..."
sudo systemctl restart docker

# 检查Docker服务状态
if systemctl is-active --quiet docker; then
    echo "✅ Docker服务重启成功"
else
    echo "❌ Docker服务重启失败，请手动检查配置"
    exit 1
fi

# 测试镜像拉取速度
echo "测试Docker镜像拉取速度..."
echo "拉取 hello-world 镜像..."
docker pull hello-world

if [ $? -eq 0 ]; then
    echo "✅ Docker镜像加速配置成功！"
else
    echo "❌ Docker镜像拉取测试失败"
fi

echo ""
echo "配置完成！现在可以使用以下命令构建项目："
echo "docker-compose up --build"
echo ""
echo "如果遇到问题，请检查 /etc/docker/daemon.json 文件内容"
