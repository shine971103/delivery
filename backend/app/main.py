from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, merchant, consumer, rider
from .config import settings

# 自動建立資料表 (本地開發/生產環境啟動時自動初始化)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="外送系統 API",
    description="外送系統 MVP 後端服務",
    version="1.0.0"
)

# 配置 CORS 跨域資源共用
# 允許本地開發與 Render 正式部署前端連線
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生產環境可更限縮，MVP階段允許所有來源以利快速測試
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊 API 路由
app.include_router(auth.router)
app.include_router(merchant.router)
app.include_router(consumer.router)
app.include_router(rider.router)

@app.get("/")
def read_root():
    return {
        "message": "外送系統 API 正常運作中",
        "version": "1.0.0",
        "env": settings.APP_ENV
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
