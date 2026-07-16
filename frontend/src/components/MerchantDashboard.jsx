import { useState, useEffect } from 'react';

export default function MerchantDashboard({ user, apiBaseUrl, onError, onSuccess }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'products' | 'profile'
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // 店家修改表單
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // 新增商品表單
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // 1. 載入店家基本資料
  const fetchProfile = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/profile`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得店家資料失敗');
      
      setRestaurant(data);
      setEditName(data.name);
      setEditAddress(data.address);
      setEditDescription(data.description || '');
    } catch (err) {
      onError(err.message);
    }
  };

  // 2. 載入商品列表
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/products`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得商品列表失敗');
      setProducts(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 3. 載入店家訂單
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/orders`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得訂單失敗');
      setOrders(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 頁面加載初始化
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchProducts();
      fetchOrders();
    }
  }, [user]);

  // 輪詢新訂單 (每 5 秒一次)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // 更新店家資訊
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          description: editDescription
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '更新店家資料失敗');
      
      setRestaurant(data);
      setIsEditingProfile(false);
      onSuccess('店家資料更新成功！');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // 新增商品
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;
    setLoadingAction(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: newProductName,
          price: parseInt(newProductPrice),
          description: newProductDesc,
          is_available: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '新增商品失敗');
      
      setProducts([data, ...products]);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductDesc('');
      onSuccess('商品新增上架成功！');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // 切換商品供應狀態 (上下架)
  const handleToggleProduct = async (product) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          description: product.description,
          is_available: !product.is_available
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '切換商品狀態失敗');
      
      setProducts(products.map(p => p.id === product.id ? data : p));
      onSuccess(`商品 ${product.name} 已${data.is_available ? '上架' : '下架'}！`);
    } catch (err) {
      onError(err.message);
    }
  };

  // 刪除商品 (軟刪除)
  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`確定要下架並刪除商品「${name}」嗎？`)) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '刪除商品失敗');
      }
      setProducts(products.filter(p => p.id !== id));
      onSuccess(`商品 ${name} 已成功刪除。`);
    } catch (err) {
      onError(err.message);
    }
  };

  // 訂單操作 (接單/餐點完成)
  const handleOrderAction = async (orderId, action) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/merchant/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '操作失敗');
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: data.status } : o));
      onSuccess(action === 'prepare' ? '已接受訂單，開始製作！' : '餐點製作完成，等待外送員取餐！');
    } catch (err) {
      onError(err.message);
    }
  };

  if (!restaurant) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>讀取店家資料中...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      {/* 餐廳資訊頭部 */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🍳 {restaurant.name}
          </h2>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-light)', fontSize: '0.95rem' }}>
            📍 <strong>地址：</strong>{restaurant.address}
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            📝 <strong>簡介：</strong>{restaurant.description}
          </p>
        </div>
        <button 
          onClick={() => setIsEditingProfile(!isEditingProfile)} 
          style={{ background: 'var(--merchant-color)', padding: '6px 12px', fontSize: '0.9rem' }}
        >
          {isEditingProfile ? '取消修改' : '修改資料'}
        </button>

        {isEditingProfile && (
          <form onSubmit={handleUpdateProfile} style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--merchant-color)' }}>編輯店家基本資料</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: '500' }}>餐廳名稱</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: '500' }}>取餐地址</label>
                <input type="text" required value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: '500' }}>簡介說明</label>
                <textarea rows="2" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loadingAction} style={{ background: 'var(--merchant-color)' }}>
              {loadingAction ? '儲存中...' : '儲存修改'}
            </button>
          </form>
        )}
      </div>

      {/* 功能分頁切換按鈕 */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            background: activeTab === 'orders' ? 'var(--merchant-color)' : 'transparent',
            color: activeTab === 'orders' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          訂單管理 ({orders.filter(o => o.status !== 'delivered').length} 筆未完成)
        </button>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            background: activeTab === 'products' ? 'var(--merchant-color)' : 'transparent',
            color: activeTab === 'products' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          商品管理 ({products.length} 項)
        </button>
      </div>

      {/* 分頁內容：訂單管理 */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
              📭 目前尚無任何訂單。
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="card" style={{ borderLeft: `6px solid ${order.status === 'pending' ? '#ff9800' : order.status === 'preparing' ? 'var(--merchant-color)' : '#4caf50'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>訂單編號 #{order.id}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '10px' }}>
                      下單時間: {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <span style={{
                    background: order.status === 'pending' ? '#fff3e0' : order.status === 'preparing' ? '#fce4ec' : order.status === 'ready' ? '#e8f5e9' : '#e0f7fa',
                    color: order.status === 'pending' ? '#e65100' : order.status === 'preparing' ? '#c2185b' : order.status === 'ready' ? '#2e7d32' : '#006064',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}>
                    {order.status === 'pending' && '等待接單'}
                    {order.status === 'preparing' && '餐點製作中'}
                    {order.status === 'ready' && '待取餐 (已完成)'}
                    {order.status === 'delivering' && '外送配送中'}
                    {order.status === 'delivered' && '已送達結案'}
                  </span>
                </div>

                <div style={{ padding: '0.5rem 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    📍 <strong>送餐目的地：</strong>{order.address}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', margin: '0.8rem 0' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span>🍔 {item.name} <strong>x {item.quantity}</strong></span>
                        <span style={{ color: 'var(--text-light)' }}>${item.price_at_order * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    外送費: ${order.delivery_fee} | <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>總計: ${order.total_amount}</strong> (貨到付款)
                  </div>
                  
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleOrderAction(order.id, 'prepare')} 
                      style={{ background: '#ff9800', fontSize: '0.9rem' }}
                    >
                      接受訂單 (開始製作)
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button 
                      onClick={() => handleOrderAction(order.id, 'ready')} 
                      style={{ background: 'var(--merchant-color)', fontSize: '0.9rem' }}
                    >
                      餐點製作完成 (通知取餐)
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 分頁內容：商品管理 */}
      {activeTab === 'products' && (
        <div>
          {/* 新增商品卡片 */}
          <div className="card">
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--merchant-color)' }}>🍳 新增上架餐點</h4>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div style={{ flex: '2 1 200px' }}>
                <input 
                  type="text" 
                  required 
                  placeholder="商品名稱 (如: 招牌排骨飯)" 
                  value={newProductName} 
                  onChange={(e) => setNewProductName(e.target.value)} 
                />
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <input 
                  type="number" 
                  required 
                  min="0"
                  placeholder="價格 ($)" 
                  value={newProductPrice} 
                  onChange={(e) => setNewProductPrice(e.target.value)} 
                />
              </div>
              <div style={{ flex: '3 1 300px' }}>
                <input 
                  type="text" 
                  placeholder="商品簡介 (如: 國產豬排、古法秘製)" 
                  value={newProductDesc} 
                  onChange={(e) => setNewProductDesc(e.target.value)} 
                />
              </div>
              <button type="submit" disabled={loadingAction} style={{ background: 'var(--merchant-color)', flex: '1 1 100px' }}>
                上架商品
              </button>
            </form>
          </div>

          {/* 商品清單 */}
          {products.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
              🍽️ 菜單空空如也，快新增您的第一份美味餐點吧！
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {products.map(product => (
                <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', opacity: product.is_available ? 1 : 0.6 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.15rem' }}>{product.name}</strong>
                      <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>${product.price}</strong>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-light)', minHeight: '40px' }}>
                      {product.description || '無描述說明'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '0.8rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: product.is_available ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
                      {product.is_available ? '🟢 供應中' : '🔴 已下架'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleToggleProduct(product)} 
                        style={{
                          background: product.is_available ? '#7f8c8d' : '#2e7d32',
                          padding: '4px 8px',
                          fontSize: '0.8rem'
                        }}
                      >
                        {product.is_available ? '下架' : '上架'}
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id, product.name)} 
                        style={{ background: '#c62828', padding: '4px 8px', fontSize: '0.8rem' }}
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
