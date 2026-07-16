import os
from dotenv import load_dotenv

# 讀取專案根目錄的 .env 檔案
# 本地開發時，.env 位於 backend/ 或者是專案根目錄。我們向上搜尋以載入 .env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    # 也可以嘗試載入當前目錄下的 .env
    load_dotenv()

class Settings:
    APP_ENV: str = os.getenv("APP_ENV", "local")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # 資料庫連線字串
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./delivery.db")
    
    # 安全憑證設定
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_sign_key_for_local_development_only")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # 業務設定
    DELIVERY_FEE: int = int(os.getenv("DELIVERY_FEE", "39"))

settings = Settings()
