from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/api/v1/merchant",
    tags=["Merchant Portal"]
)

# 驗證目前登入使用者必須為商家角色
def get_current_merchant(current_user: models.User = Depends(auth.get_current_user)) -> models.User:
    if current_user.role != "merchant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="權限不足，必須是商家角色"
        )
    return current_user

# 取得商家的餐廳 profile
def get_merchant_restaurant(db: Session, user_id: int) -> models.Restaurant:
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.user_id == user_id, models.Restaurant.deleted_at == None).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該商家的餐廳資訊"
        )
    return restaurant

# --- 1. 店家基本資料 API ---
@router.get("/profile", response_model=schemas.RestaurantResponse)
def get_profile(current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    return get_merchant_restaurant(db, current_user.id)

@router.put("/profile", response_model=schemas.RestaurantResponse)
def update_profile(restaurant_in: schemas.RestaurantCreate, current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    restaurant.name = restaurant_in.name
    restaurant.address = restaurant_in.address
    restaurant.description = restaurant_in.description
    db.commit()
    db.refresh(restaurant)
    return restaurant

# --- 2. 商品/菜單管理 API ---
@router.get("/products", response_model=List[schemas.ProductResponse])
def list_products(current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    return db.query(models.Product).filter(
        models.Product.restaurant_id == restaurant.id,
        models.Product.deleted_at == None
    ).all()

@router.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: schemas.ProductCreate, current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    new_product = models.Product(
        restaurant_id=restaurant.id,
        name=product_in.name,
        price=product_in.price,
        description=product_in.description,
        is_available=product_in.is_available
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/products/{id}", response_model=schemas.ProductResponse)
def update_product(id: int, product_in: schemas.ProductCreate, current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    product = db.query(models.Product).filter(
        models.Product.id == id,
        models.Product.restaurant_id == restaurant.id,
        models.Product.deleted_at == None
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在或不屬於此店家"
        )
        
    product.name = product_in.name
    product.price = product_in.price
    product.description = product_in.description
    product.is_available = product_in.is_available
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(id: int, current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    product = db.query(models.Product).filter(
        models.Product.id == id,
        models.Product.restaurant_id == restaurant.id,
        models.Product.deleted_at == None
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在或不屬於此店家"
        )
        
    # 執行軟刪除
    import datetime
    product.deleted_at = datetime.datetime.utcnow()
    db.commit()
    return None

# --- 3. 訂單接收與狀態流轉 API ---
@router.get("/orders")
def list_orders(current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    # 查詢與該餐廳相關的所有訂單，並載入明細與商品名稱
    orders = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(
        models.Order.restaurant_id == restaurant.id
    ).order_by(models.Order.created_at.desc()).all()
    
    # 格式化輸出
    result = []
    for o in orders:
        items_detail = []
        for item in o.items:
            items_detail.append({
                "product_id": item.product_id,
                "name": item.product.name if item.product else "未知商品",
                "quantity": item.quantity,
                "price_at_order": item.price_at_order
            })
            
        result.append({
            "id": o.id,
            "address": o.address,
            "delivery_fee": o.delivery_fee,
            "total_amount": o.total_amount,
            "status": o.status,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "items": items_detail
        })
    return result

@router.post("/orders/{id}/prepare")
def accept_order(id: int, current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    order = db.query(models.Order).filter(
        models.Order.id == id,
        models.Order.restaurant_id == restaurant.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到此訂單"
        )
        
    if order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"訂單狀態為 {order.status}，無法進行接單"
        )
        
    order.status = "preparing"
    db.commit()
    return {"id": order.id, "status": order.status}

@router.post("/orders/{id}/ready")
def ready_order(id: int, current_user: models.User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    restaurant = get_merchant_restaurant(db, current_user.id)
    order = db.query(models.Order).filter(
        models.Order.id == id,
        models.Order.restaurant_id == restaurant.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到此訂單"
        )
        
    if order.status != "preparing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"訂單狀態為 {order.status}，無法標記製作完成"
        )
        
    order.status = "ready"
    db.commit()
    return {"id": order.id, "status": order.status}
