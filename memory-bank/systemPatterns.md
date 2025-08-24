# σ₂: System Patterns
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-19*
*Π: INITIALIZING | Ω: START*

## 🏛️ Architecture Overview
**现代化全栈应用** - 前后端分离 + 容器化部署架构

```
┌─────────────────┐    HTTP/API    ┌─────────────────┐    ORM     ┌──────────┐
│   Frontend      │ ─────────────> │    Backend      │ ─────────> │ Database │
│ React+TypeScript│               │ FastAPI+Python  │           │ SQLite   │
│     (5173)      │ <───────────── │     (8000)      │           │          │
└─────────────────┘               └─────────────────┘           └──────────┘
        │                                   │                          │
        │                                   │                          │
   ┌────▼────┐                         ┌────▼────┐                ┌────▼────┐
   │  Vite   │                         │Uvicorn  │                │SQLAlchemy│
   │DevServer│                         │ ASGI    │                │   ORM   │
   └─────────┘                         └─────────┘                └─────────┘
```

## 🧱 Core Components Analysis

### 🖥️ Frontend Layer (`/frontend/`)
- **入口文件**: `App.tsx` - 主应用布局 + 路由配置
- **UI系统**: Ant Design布局系统 (Sider + Header + Content)
- **页面组件**: `/pages/` 目录结构化
  - `VoiceAnalysis.tsx` - 核心功能：实时语音分析
  - `Analysis.tsx` - 数据分析和可视化
  - `Settings.tsx` - 系统配置管理
- **路由策略**: React Router v6，声明式路由
- **状态管理**: React Hooks (useState, useEffect, useRef)
- **构建配置**: `vite.config.ts` 包含代理和热重载配置

### ⚙️ Backend Layer (`/backend/`)
- **API框架**: FastAPI - 现代异步Python API
- **路由模块**: `/routers/interviews.py` - RESTful API设计
- **数据层**: `/models/base.py` - SQLAlchemy ORM配置
- **配置系统**: `config.py` - Pydantic Settings
- **主应用**: `main.py` - CORS配置 + 路由注册

### 🐳 Infrastructure Layer
- **容器编排**: `docker-compose.yml` - 多服务协调
- **网络配置**: `interview-network` 桥接网络
- **持久化**: Volume映射支持热重载开发
- **环境隔离**: 开发/生产环境分离

## 🔧 Design Decisions & Patterns

### 🎯 Architecture Patterns
- **MVC模式**: Frontend组件(View) + Backend路由(Controller) + 模型(Model)
- **API优先**: OpenAPI/Swagger自动文档生成
- **组件化设计**: React组件 + FastAPI路由模块化
- **配置外部化**: 环境变量 + Pydantic Settings

### 🛡️ Security & Quality
- **类型安全**: TypeScript静态类型检查
- **数据验证**: Pydantic模型验证
- **CORS配置**: 跨域请求安全控制
- **代码质量**: ESLint + TypeScript规则

### 🚀 Performance Considerations  
- **异步处理**: FastAPI异步支持
- **构建优化**: Vite快速构建和HMR
- **数据库连接**: SQLAlchemy连接池
- **开发体验**: 热重载 + 自动代理配置

## 🔗 Integration Points
- **API通信**: axios → FastAPI REST endpoints (/api前缀)
- **数据格式**: JSON序列化 (Pydantic↔TypeScript接口)
- **开发代理**: Vite proxy配置自动转发API请求
- **容器网络**: Docker bridge网络实现服务发现
- **状态同步**: 前端状态管理 ↔ 后端数据持久化
