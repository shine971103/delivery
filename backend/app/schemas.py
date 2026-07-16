from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

# --- 會員相關 Schema ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="密碼至少 6 位元")
    role: str = Field(..., description="必須是 'customer', 'merchant', 'rider'")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- 商家與商品管理 Schema (後面任務會用到，先宣告基礎版) ---
class ProductBase(BaseModel):
    name: str
    price: int
    description: Optional[str] = None
    is_available: Optional[bool] = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    restaurant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RestaurantBase(BaseModel):
    name: str
    address: str
    description: Optional[str] = None

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantResponse(RestaurantBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
