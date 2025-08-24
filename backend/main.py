from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import interviews
from config import settings

app = FastAPI(title=settings.app_name, version=settings.version)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(interviews.router, prefix="/api", tags=["interviews"])

@app.get("/")
async def root():
    return {"message": f"{settings.app_name}", "version": settings.version}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
