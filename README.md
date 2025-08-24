# 面试分析系统

一个现代化的面试数据管理和分析平台，采用前后端分离架构开发。

## 项目架构

### 后端 (Backend)
- **框架**: FastAPI (Python)
- **数据库**: SQLite (可扩展到 PostgreSQL/MySQL)
- **ORM**: SQLAlchemy
- **认证**: JWT Token
- **API文档**: 自动生成 (Swagger UI)

### 前端 (Frontend)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI库**: Ant Design 5.x
- **路由**: React Router v6
- **HTTP客户端**: Axios

## 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 后端启动

1. 进入后端目录
```bash
cd backend
```

2. 创建虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows
```

3. 安装依赖
```bash
pip install -r requirements.txt
```

4. 启动服务器
```bash
python main.py
# 或
uvicorn main:app --reload
```

后端服务将在 `http://localhost:8000` 启动

### 前端启动

1. 进入前端目录
```bash
cd frontend
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 启动开发服务器
```bash
npm run dev
# 或
yarn dev
```

前端服务将在 `http://localhost:5173` 启动

## 项目结构

```
interview-analysis/
├── backend/                 # 后端代码
│   ├── main.py             # 主应用入口
│   ├── config.py           # 配置文件
│   ├── models/             # 数据库模型
│   │   ├── __init__.py
│   │   ├── base.py         # 基础配置
│   │   └── ...             # 具体模型
│   ├── routers/            # API路由
│   │   ├── __init__.py
│   │   ├── interviews.py   # 面试相关API
│   │   └── ...             # 其他API
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── main.tsx        # React入口
│   │   ├── App.tsx         # 主应用组件
│   │   ├── pages/          # 页面组件
│   │   │   ├── Home.tsx
│   │   │   ├── Interviews.tsx
│   │   │   ├── Analysis.tsx
│   │   │   └── Settings.tsx
│   │   └── ...             # 其他组件
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## 功能特性

### 面试管理
- ✅ 面试记录的增删改查
- ✅ 候选人信息管理
- ✅ 面试官管理
- ✅ 面试状态跟踪

### 数据分析
- 📊 面试通过率统计
- 📊 各部门招聘数据分析
- 📊 职位招聘数据分析
- 📊 面试评分分析

### 系统管理
- ⚙️ 系统设置
- 🔐 用户权限管理 (待开发)
- 📝 操作日志 (待开发)

## API 文档

启动后端服务后，访问以下地址查看 API 文档：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 开发指南

### 后端开发
1. 在 `backend/routers/` 目录下创建新的路由模块
2. 在 `backend/models/` 目录下定义数据模型
3. 在主 `main.py` 中注册新的路由

### 前端开发
1. 在 `frontend/src/pages/` 目录下创建新的页面组件
2. 在 `App.tsx` 中添加新的路由配置
3. 使用 Ant Design 组件库保持 UI 一致性

## 部署

### 开发环境
直接使用上述的启动方式即可。

### 生产环境
1. 后端：使用 uvicorn 或 gunicorn
2. 前端：构建静态文件
```bash
cd frontend
npm run build
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱: your-email@example.com
- 项目地址: [GitHub Repository](https://github.com/your-username/interview-analysis)

---

**注意**: 这是一个示例项目，部分功能可能需要根据实际需求进行调整和完善。
