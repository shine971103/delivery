from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'customer', 'merchant', 'rider'
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # 關聯關係
    restaurants = relationship("Restaurant", back_populates="owner")
    customer_orders = relationship("Order", foreign_keys="Order.customer_id", back_populates="customer")
    rider_orders = relationship("Order", foreign_keys="Order.rider_id", back_populates="rider")

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # 關聯關係
    owner = relationship("User", back_populates="restaurants")
    products = relationship("Product", back_populates="restaurant")
    orders = relationship("Order", back_populates="restaurant")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # 關聯關係
    restaurant = relationship("Restaurant", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    rider_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    address = Column(String, nullable=False)
    delivery_fee = Column(Integer, default=39, nullable=False)
    total_amount = Column(Integer, nullable=False)  # 商品小計 + 外送費
    status = Column(String, default="pending", nullable=False)  # 'pending', 'preparing', 'ready', 'delivering', 'delivered'
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # 關聯關係
    customer = relationship("User", foreign_keys=[customer_id], back_populates="customer_orders")
    rider = relationship("User", foreign_keys=[rider_id], back_populates="rider_orders")
    restaurant = relationship("Restaurant", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_order = Column(Integer, nullable=False)  # 鎖定訂購當下之單價

    # 關聯關係
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
