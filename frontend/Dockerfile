# 使用官方 Node.js 基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 配置 npm 使用阿里云镜像（兼容 npm 10）
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖（项目未提供 package-lock.json，使用 npm install）
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 5173

# 启动命令
CMD ["npm", "run", "preview"]
