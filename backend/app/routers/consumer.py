from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field
from typing import List
from ..database import get_db
from .. import models, schemas, auth
from ..config import settings

router = APIRouter(
    prefix="/api/v1/consumer",
    tags=["Consumer Portal"]
)

# 驗證目前登入使用者必須為消費者角色
def get_current_customer(current_user: models.User = Depends(auth.get_current_user)) -> models.User:
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="權限不足，必須是消費者角色"
        )
    return current_user

# 點餐輸入 Pydantic Schema
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="數量必須大於 0")

class OrderCreate(BaseModel):
    restaurant_id: int
    address: str = Field(..., min_length=2, description="請輸入完整的外送地址")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="購物車不能為空")

# --- 1. 店家與菜單瀏覽 API ---
@router.get("/restaurants", response_model=List[schemas.RestaurantResponse])
def list_restaurants(current_user: models.User = Depends(get_current_customer), db: Session = Depends(get_db)):
    # 取得所有未被軟刪除的餐廳
    return db.query(models.Restaurant).filter(models.Restaurant.deleted_at == None).all()

@router.get("/restaurants/{id}/menu", response_model=List[schemas.ProductResponse])
def get_restaurant_menu(id: int, current_user: models.User = Depends(get_current_customer), db: Session = Depends(get_db)):
    # 確認餐廳存在
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.id == id, models.Restaurant.deleted_at == None).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到此餐廳"
        )
    # 取得該餐廳所有供應中且未軟刪除的商品
    return db.query(models.Product).filter(
        models.Product.restaurant_id == id,
        models.Product.is_available == True,
        models.Product.deleted_at == None
    ).all()

# --- 2. 提交點餐 API ---
@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(order_in: OrderCreate, current_user: models.User = Depends(get_current_customer), db: Session = Depends(get_db)):
    # 1. 驗證餐廳是否存在
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.id == order_in.restaurant_id, models.Restaurant.deleted_at == None).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="點餐失敗：指定的餐廳不存在"
        )

    # 2. 取得所有選購商品
    product_ids = [item.product_id for item in order_in.items]
    db_products = db.query(models.Product).filter(
        models.Product.id.in_(product_ids),
        models.Product.restaurant_id == order_in.restaurant_id,
        models.Product.is_available == True,
        models.Product.deleted_at == None
    ).all()

    # 比對商品數量是否正確
    if len(db_products) != len(set(product_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="點餐失敗：部分商品已下架、不存在或不屬於此店家"
        )

    # 將商品轉為 dict 方便快速查詢價格
    product_map = {p.id: p for p in db_products}

    # 3. 計算金額並建立訂單項目
    subtotal = 0
    order_items_to_add = []
    
    # 建立主訂單實體 (預設 delivery_fee 39元)
    new_order = models.Order(
        customer_id=current_user.id,
        restaurant_id=order_in.restaurant_id,
        address=order_in.address,
        delivery_fee=settings.DELIVERY_FEE,
        status="pending",
        total_amount=0 # 先填 0 稍後加總
    )
    
    # 需要先 add 取得 order id 或者是利用 SQLAlchemy 關係直接關聯
    db.add(new_order)
    db.flush() # 取得 new_order.id

    for item in order_in.items:
        prod = product_map[item.product_id]
        item_price = prod.price
        subtotal += item_price * item.quantity
        
        new_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_order=item_price
        )
        order_items_to_add.append(new_item)

    # 4. 更新總金額 (商品小計 + 39 元外送費)
    new_order.total_amount = subtotal + settings.DELIVERY_FEE
    
    db.add_all(order_items_to_add)
    db.commit()
    db.refresh(new_order)

    # 載入詳細商品資訊回傳
    return {
        "id": new_order.id,
        "restaurant_name": restaurant.name,
        "address": new_order.address,
        "delivery_fee": new_order.delivery_fee,
        "total_amount": new_order.total_amount,
        "status": new_order.status,
        "created_at": new_order.created_at,
        "items": [
            {
                "product_id": item.product_id,
                "name": product_map[item.product_id].name,
                "quantity": item.quantity,
                "price_at_order": item.price_at_order
            }
            for item in order_items_to_add
        ]
    }

# --- 3. 歷史訂單與進度追蹤 API ---
@router.get("/orders")
def list_orders(current_user: models.User = Depends(get_current_customer), db: Session = Depends(get_db)):
    # 查詢該消費者的所有訂單，並加載關聯的餐廳與商品明細
    orders = db.query(models.Order).options(
        joinedload(models.Order.restaurant),
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(
        models.Order.customer_id == current_user.id
    ).order_by(models.Order.created_at.desc()).all()

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
            "restaurant_name": o.restaurant.name if o.restaurant else "未知店家",
            "address": o.address,
            "delivery_fee": o.delivery_fee,
            "total_amount": o.total_amount,
            "status": o.status,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "items": items_detail
        })
    return result

@router.get("/orders/{id}")
def get_order_detail(id: int, current_user: models.User = Depends(get_current_customer), db: Session = Depends(get_db)):
    order = db.query(models.Order).options(
        joinedload(models.Order.restaurant),
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(
        models.Order.id == id,
        models.Order.customer_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到此訂單"
        )

    items_detail = []
    for item in order.items:
        items_detail.append({
            "product_id": item.product_id,
            "name": item.product.name if item.product else "未知商品",
            "quantity": item.quantity,
            "price_at_order": item.price_at_order
        })

    return {
        "id": order.id,
        "restaurant_name": order.restaurant.name if order.restaurant else "未知店家",
        "address": order.address,
        "delivery_fee": order.delivery_fee,
        "total_amount": order.total_amount,
        "status": order.status,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": items_detail
    }
