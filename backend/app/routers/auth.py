from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. 檢查 Role 限制
    if user_in.role not in ["customer", "merchant", "rider"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="角色必須是 'customer', 'merchant', 或 'rider'"
        )

    # 2. 檢查 Email 是否已存在
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此電子信箱已被註冊"
        )

    # 3. 建立使用者
    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. 如果是商家 (merchant)，自動幫他初始化一個預設的餐廳，方便後續直接新增商品
    if new_user.role == "merchant":
        default_restaurant = models.Restaurant(
            user_id=new_user.id,
            name=f"未命名餐廳 ({new_user.email})",
            address="未設定地址",
            description="尚無簡介"
        )
        db.add(default_restaurant)
        db.commit()

    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    # 1. 查詢使用者
    user = db.query(models.User).filter(models.User.email == user_in.email, models.User.deleted_at == None).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="電子信箱或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. 驗證密碼
    if not auth.verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="電子信箱或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. 產生 JWT Token
    access_token = auth.create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }
