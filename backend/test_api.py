import unittest
from fastapi.testclient import TestClient
import os

# 設定環境變數為測試 SQLite
os.environ["DATABASE_URL"] = "sqlite:///./test_delivery.db"

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models

class TestDeliverySystemE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 建立測試資料庫與資料表
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # 清理測試資料表
        try:
            Base.metadata.drop_all(bind=engine)
            # 在 Windows 上，由於 SQLite 連線可能尚未完全釋放，我們以 try-except 忽略刪除失敗
            if os.path.exists("test_delivery.db"):
                os.remove("test_delivery.db")
        except Exception:
            pass

    def test_e2e_flow(self):
        # --- 1. 註冊帳號 ---
        # 註冊消費者
        res = self.client.post("/api/v1/auth/register", json={
            "email": "customer@test.com",
            "password": "password123",
            "role": "customer"
        })
        self.assertEqual(res.status_code, 201)

        # 註冊商家
        res = self.client.post("/api/v1/auth/register", json={
            "email": "merchant@test.com",
            "password": "password123",
            "role": "merchant"
        })
        self.assertEqual(res.status_code, 201)

        # 註冊外送員 1 & 2
        res = self.client.post("/api/v1/auth/register", json={
            "email": "rider1@test.com",
            "password": "password123",
            "role": "rider"
        })
        self.assertEqual(res.status_code, 201)
        
        res = self.client.post("/api/v1/auth/register", json={
            "email": "rider2@test.com",
            "password": "password123",
            "role": "rider"
        })
        self.assertEqual(res.status_code, 201)

        # --- 2. 登入取得 JWT Tokens ---
        # 消費者登入
        res = self.client.post("/api/v1/auth/login", json={"email": "customer@test.com", "password": "password123"})
        self.assertEqual(res.status_code, 200)
        customer_token = res.json()["access_token"]
        customer_headers = {"Authorization": f"Bearer {customer_token}"}

        # 商家登入
        res = self.client.post("/api/v1/auth/login", json={"email": "merchant@test.com", "password": "password123"})
        self.assertEqual(res.status_code, 200)
        merchant_token = res.json()["access_token"]
        merchant_headers = {"Authorization": f"Bearer {merchant_token}"}

        # 外送員 1 登入
        res = self.client.post("/api/v1/auth/login", json={"email": "rider1@test.com", "password": "password123"})
        self.assertEqual(res.status_code, 200)
        rider1_token = res.json()["access_token"]
        rider1_headers = {"Authorization": f"Bearer {rider1_token}"}

        # 外送員 2 登入
        res = self.client.post("/api/v1/auth/login", json={"email": "rider2@test.com", "password": "password123"})
        self.assertEqual(res.status_code, 200)
        rider2_token = res.json()["access_token"]
        rider2_headers = {"Authorization": f"Bearer {rider2_token}"}

        # --- 3. 商家管理與上架商品 ---
        # 商家讀取 Profile (確認註冊時有自動初始化餐廳)
        res = self.client.get("/api/v1/merchant/profile", headers=merchant_headers)
        self.assertEqual(res.status_code, 200)
        restaurant_id = res.json()["id"]

        # 商家修改餐廳資料
        res = self.client.put("/api/v1/merchant/profile", headers=merchant_headers, json={
            "name": "美味牛肉麵館",
            "address": "台北市信義區忠孝東路五段100號",
            "description": "三十年老字號，純骨熬製濃郁湯頭"
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "美味牛肉麵館")

        # 商家新增商品 "經典牛肉麵" ($150)
        res = self.client.post("/api/v1/merchant/products", headers=merchant_headers, json={
            "name": "經典牛肉麵",
            "price": 150,
            "description": "嚴選牛腱肉與Q彈麵條"
        })
        self.assertEqual(res.status_code, 201)
        product_id = res.json()["id"]

        # --- 4. 消費者瀏覽與點餐結帳 ---
        # 消費者瀏覽餐廳列表
        res = self.client.get("/api/v1/consumer/restaurants", headers=customer_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(r["name"] == "美味牛肉麵館" for r in res.json()))

        # 消費者瀏覽該餐廳菜單
        res = self.client.get(f"/api/v1/consumer/restaurants/{restaurant_id}/menu", headers=customer_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(p["name"] == "經典牛肉麵" for p in res.json()))

        # 消費者下單結帳 (點購 2 碗牛肉麵，應加計 39 元外送費，總計 339 元)
        res = self.client.post("/api/v1/consumer/orders", headers=customer_headers, json={
            "restaurant_id": restaurant_id,
            "address": "台北市大安區新生南路二段1號",
            "items": [
                {"product_id": product_id, "quantity": 2}
            ]
        })
        self.assertEqual(res.status_code, 201)
        order_id = res.json()["id"]
        self.assertEqual(res.json()["delivery_fee"], 39)
        self.assertEqual(res.json()["total_amount"], 339)
        self.assertEqual(res.json()["status"], "pending")

        # --- 5. 商家接單與製作完成 ---
        # 商家接單 (pending -> preparing)
        res = self.client.post(f"/api/v1/merchant/orders/{order_id}/prepare", headers=merchant_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "preparing")

        # 商家完成製作 (preparing -> ready)
        res = self.client.post(f"/api/v1/merchant/orders/{order_id}/ready", headers=merchant_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ready")

        # --- 6. 外送員大廳搶單與併發衝突驗證 (409 Conflict) ---
        # 外送員大廳查看可用訂單
        res = self.client.get("/api/v1/rider/orders", headers=rider1_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(o["id"] == order_id for o in res.json()))

        # 外送員 1 點擊接單成功 (status -> delivering)
        res = self.client.post(f"/api/v1/rider/orders/{order_id}/accept", headers=rider1_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "delivering")

        # 外送員 2 點擊接單，此時應該回傳 409 Conflict (搶單失敗)
        res = self.client.post(f"/api/v1/rider/orders/{order_id}/accept", headers=rider2_headers)
        self.assertEqual(res.status_code, 409)
        self.assertIn("已被其他外送夥伴搶先接走", res.json()["detail"])

        # --- 7. 外送員送達與結案 ---
        # 外送員 1 確認送達 (delivering -> delivered)
        res = self.client.post(f"/api/v1/rider/orders/{order_id}/deliver", headers=rider1_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "delivered")

        # 驗證消費者端查看訂單狀態已為 delivered
        res = self.client.get(f"/api/v1/consumer/orders/{order_id}", headers=customer_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "delivered")
        
        print("\n\n★ [E2E 測試成功] 註冊、登入、上架商品、加計外送費下單、商家接單製作、併發搶單防禦鎖 (409) 與取餐送達流程全部驗證通過！ ★\n")

if __name__ == "__main__":
    unittest.main()
