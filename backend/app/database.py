from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# 處理 SQLite 的執行緒限制
engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

# 建立 SQLAlchemy Engine
engine = create_engine(settings.DATABASE_URL, **engine_args)

# 建立 Session 類別
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 建立基底模型類別
Base = declarative_base()

# 取得資料庫 Session 的 Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
