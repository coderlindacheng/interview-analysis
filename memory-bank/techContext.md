# σ₃: Technical Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-19*
*Π: INITIALIZING | Ω: START*

## 🛠️ Technology Stack
- 🖥️ **Frontend**: React 18.2.0, TypeScript 5.2.2, Vite 5.0.0
- 🎨 **UI Framework**: Ant Design 5.12.8 + Ant Design Icons 5.2.6
- 🔗 **HTTP Client**: Axios 1.6.2
- 🧭 **Routing**: React Router DOM 6.20.1
- ⚙️ **Backend**: Python 3.13, FastAPI 0.104.1, SQLAlchemy 2.0.23
- 📄 **Data Validation**: Pydantic 2.5.0, Pydantic Settings 2.1.0
- 🔐 **Authentication**: Python-JOSE 3.3.0, Passlib 1.7.4
- 🗄️ **Database**: SQLite (默认), 支持PostgreSQL
- 🐳 **Container**: Docker + Docker Compose
- 📦 **Package Management**: npm (前端), pip (后端)

## 🌐 Environment Setup
- **开发环境**: Python venv, Node.js, Vite dev server
- **生产环境**: Docker容器, 端口映射 (Frontend:5173, Backend:8000)
- **构建工具**: Vite (前端), Docker多阶段构建
- **代理配置**: Vite proxy /api → FastAPI backend

## 📚 Dependencies Analysis
### Frontend Dependencies
- **核心框架**: React 18.2.0 + React DOM 18.2.0
- **UI组件库**: Ant Design 5.12.8 (现代化UI组件)
- **图标系统**: @ant-design/icons 5.2.6
- **HTTP请求**: Axios 1.6.2 (Promise-based HTTP client)
- **路由管理**: react-router-dom 6.20.1

### Frontend DevDependencies
- **TypeScript**: 5.2.2 (类型安全)
- **构建工具**: Vite 5.0.0 + @vitejs/plugin-react 4.1.1
- **代码质量**: ESLint 8.53.0 + TypeScript ESLint插件
- **类型定义**: @types/react, @types/react-dom

### Backend Dependencies
- **Web框架**: FastAPI 0.104.1 (现代异步Python API框架)
- **ASGI服务器**: Uvicorn 0.24.0 (高性能ASGI服务器)
- **ORM**: SQLAlchemy 2.0.23 (Python SQL工具包)
- **数据迁移**: Alembic 1.12.1
- **配置管理**: Python-decouple 3.8
- **HTTP客户端**: HTTPX 0.25.2 (异步HTTP客户端)
- **文件上传**: Python-multipart 0.0.6

## 🔧 Development Tools
- VS Code / Cursor
- Git版本控制
- Docker Desktop
- 浏览器开发者工具

## 📂 Project Structure
```
interview-analysis/
├── frontend/          # React前端应用
├── backend/           # FastAPI后端服务
├── memory-bank/       # RIPER框架内存系统
└── docker-compose.yml # 容器编排
```
