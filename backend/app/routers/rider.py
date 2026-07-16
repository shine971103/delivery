from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/api/v1/rider",
    tags=["Rider Portal"]
)

# 驗證目前登入使用者必須為外送員角色
def get_current_rider(current_user: models.User = Depends(auth.get_current_user)) -> models.User:
    if current_user.role != "rider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="權限不足，必須是外送員角色"
        )
    return current_user

# --- 1. 可接單大廳 API ---
@router.get("/orders")
def list_available_orders(current_user: models.User = Depends(get_current_rider), db: Session = Depends(get_db)):
    # 僅查詢狀態為 'ready' (餐點已做完) 且尚無外送員接單 (rider_id is None) 的訂單
    orders = db.query(models.Order).options(
        joinedload(models.Order.restaurant),
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(
        models.Order.status == "ready",
        models.Order.rider_id == None
    ).order_by(models.Order.created_at.desc()).all()

    result = []
    for o in orders:
        items_detail = []
        for item in o.items:
            items_detail.append({
                "name": item.product.name if item.product else "未知商品",
                "quantity": item.quantity
            })
            
        result.append({
            "id": o.id,
            "restaurant_name": o.restaurant.name if o.restaurant else "未知店家",
            "restaurant_address": o.restaurant.address if o.restaurant else "未知地址",
            "address": o.address,
            "delivery_fee": o.delivery_fee,
            "total_amount": o.total_amount,
            "status": o.status,
            "created_at": o.created_at,
            "items": items_detail
        })
    return result

# --- 2. 搶單接單 API (交易鎖併發衝突處理) ---
@router.post("/orders/{id}/accept")
def accept_order(id: int, current_user: models.User = Depends(get_current_rider), db: Session = Depends(get_db)):
    try:
        # 使用 with_for_update() 開啟資料庫排他性寫鎖 (Transaction Lock)
        # 這能確保當多個外送員同時點擊同一張單時，只有第一個進入交易的人能讀取並更新
        order = db.query(models.Order).filter(
            models.Order.id == id
        ).with_for_update().first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="找不到此訂單"
            )

        # 檢查是否已被搶走，或者狀態不是 ready
        if order.rider_id is not None or order.status != "ready":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="搶單失敗：此訂單已被其他外送夥伴搶先接走！"
            )

        # 成功接單，更新外送員與狀態
        order.rider_id = current_user.id
        order.status = "delivering"
        db.commit()
        db.refresh(order)
        
        return {"id": order.id, "status": order.status, "message": "搶單成功！請盡速前往商家取餐。"}
        
    except HTTPException as he:
        # 直接向外拋出 HTTP 異常
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"搶單程序出錯: {str(e)}"
        )

# --- 3. 配送完成/結案 API ---
@router.post("/orders/{id}/deliver")
def deliver_order(id: int, current_user: models.User = Depends(get_current_rider), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == id,
        models.Order.rider_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到此配送訂單，或您非此訂單的配送員"
        )

    if order.status != "delivering":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"訂單狀態為 {order.status}，無法標記送達"
        )

    # 配送成功，狀態設為 delivered
    order.status = "delivered"
    db.commit()
    return {"id": order.id, "status": order.status, "message": "送達收款完成，辛苦了！"}

# --- 4. 外送員承接的訂單清單 (配送中與歷史) ---
@router.get("/my-orders")
def list_rider_orders(current_user: models.User = Depends(get_current_rider), db: Session = Depends(get_db)):
    orders = db.query(models.Order).options(
        joinedload(models.Order.restaurant),
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(
        models.Order.rider_id == current_user.id
    ).order_by(models.Order.updated_at.desc()).all()

    result = []
    for o in orders:
        items_detail = []
        for item in o.items:
            items_detail.append({
                "name": item.product.name if item.product else "未知商品",
                "quantity": item.quantity
            })

        result.append({
            "id": o.id,
            "restaurant_name": o.restaurant.name if o.restaurant else "未知店家",
            "restaurant_address": o.restaurant.address if o.restaurant else "未知地址",
            "address": o.address,
            "delivery_fee": o.delivery_fee,
            "total_amount": o.total_amount,
            "status": o.status,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "items": items_detail
        })
    return result
