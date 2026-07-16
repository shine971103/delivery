import { useState, useEffect } from 'react';

export default function CustomerDashboard({ user, apiBaseUrl, onError, onSuccess }) {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'orders'
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // 1. 載入餐廳清單
  const fetchRestaurants = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/consumer/restaurants`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得餐廳清單失敗');
      setRestaurants(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 2. 載入選定餐廳的菜單
  const fetchMenu = async (restaurantId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/consumer/restaurants/${restaurantId}/menu`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得菜單失敗');
      setMenu(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 3. 載入消費者的訂單紀錄
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/consumer/orders`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得訂單紀錄失敗');
      setOrders(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 頁面初始化
  useEffect(() => {
    if (user) {
      fetchRestaurants();
      fetchOrders();
    }
  }, [user]);

  // 輪詢訂單進度 (每 5 秒一次)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // 點擊選擇餐廳
  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setMenu([]);
    // 若切換餐廳，自動清空購物車以防跨店點餐混亂
    setCart([]);
    fetchMenu(restaurant.id);
  };

  // 加入購物車
  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
    onSuccess(`已加入購物車: ${product.name}`);
  };

  // 更新購物車數量
  const updateCartQuantity = (productId, delta) => {
    const existing = cart.find(item => item.product_id === productId);
    if (!existing) return;
    
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item => item.product_id === productId ? { ...item, quantity: newQty } : item));
    }
  };

  // 計算購物車金額
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 39;
  const cartTotal = cartSubtotal > 0 ? cartSubtotal + deliveryFee : 0;

  // 送出結帳訂單
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || !deliveryAddress) return;
    setLoadingAction(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/consumer/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant.id,
          address: deliveryAddress,
          items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '結帳下單失敗');
      
      onSuccess('下單成功！已為您送至廚房接單大廳！');
      setCart([]);
      setDeliveryAddress('');
      setSelectedRestaurant(null);
      // 更新訂單列表並切換至追蹤頁
      setOrders([data, ...orders]);
      setActiveTab('orders');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 頂部切換按鈕 */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => { setActiveTab('browse'); setSelectedRestaurant(null); }}
          style={{
            background: activeTab === 'browse' ? 'var(--customer-color)' : 'transparent',
            color: activeTab === 'browse' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          🍔 瀏覽店家
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            background: activeTab === 'orders' ? 'var(--customer-color)' : 'transparent',
            color: activeTab === 'orders' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          📦 我的訂單 ({orders.filter(o => o.status !== 'delivered').length} 筆配送中)
        </button>
      </div>

      {/* 1. 瀏覽店家分頁 */}
      {activeTab === 'browse' && (
        <div>
          {!selectedRestaurant ? (
            // 餐廳列表
            <div>
              <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>合作美味餐廳</h3>
              {restaurants.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
                  🚲 目前暫無合作店家開張，敬請期待！
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {restaurants.map(rest => (
                    <div
                      key={rest.id}
                      className="card"
                      onClick={() => handleSelectRestaurant(rest)}
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.5rem'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                    >
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>🍳 {rest.name}</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-light)', minHeight: '40px' }}>
                          {rest.description || '無描述說明'}
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '0.8rem', fontSize: '0.8rem', color: '#666' }}>
                        📍 {rest.address}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // 餐廳菜單與購物車頁面
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              
              {/* 菜單區 (左側) */}
              <div style={{ flex: '2 1 500px' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => setSelectedRestaurant(null)}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-light)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      fontSize: '0.9rem'
                    }}
                  >
                    ⬅ 返回店家
                  </button>
                  <h3 style={{ margin: 0, fontWeight: 'bold' }}>{selectedRestaurant.name} - 菜單</h3>
                </div>

                {menu.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
                    🍽️ 店家正在準備食材，暫無餐點上架。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {menu.map(prod => (
                      <div key={prod.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.2rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                            <strong style={{ fontSize: '1.05rem' }}>{prod.name}</strong>
                            <strong style={{ color: 'var(--primary)' }}>${prod.price}</strong>
                          </div>
                          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-light)', minHeight: '36px' }}>
                            {prod.description || '無描述'}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(prod)}
                          style={{
                            background: 'var(--customer-color)',
                            width: '100%',
                            padding: '6px 0',
                            fontSize: '0.9rem'
                          }}
                        >
                          加入購物車
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 購物車區 (右側) */}
              <div style={{ flex: '1 1 300px', position: 'sticky', top: '1rem' }}>
                <div className="card">
                  <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🛒 購物車 ({cart.reduce((sum, item) => sum + item.quantity, 0)} 件)
                  </h4>
                  
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 0' }}>
                      購物車空空如也，點選左側餐點加入！
                    </div>
                  ) : (
                    <div>
                      {/* 商品明細 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '1rem' }}>
                        {cart.map(item => (
                          <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>${item.price} / 份</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => updateCartQuantity(item.product_id, -1)}
                                style={{ padding: '2px 8px', background: '#ccc', color: '#333' }}
                              >
                                -
                              </button>
                              <strong>{item.quantity}</strong>
                              <button
                                onClick={() => updateCartQuantity(item.product_id, 1)}
                                style={{ padding: '2px 8px', background: '#ccc', color: '#333' }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 金額計算 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                          <span>餐點小計</span>
                          <span>${cartSubtotal}</span>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 'bold' }}>
                          <span>固定外送費</span>
                          <span>+ ${deliveryFee}</span>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '800', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' }}>
                          <span>總計金額</span>
                          <span style={{ color: 'var(--primary)' }}>${cartTotal}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'right' }}>
                          💵 現金貨到付款 (COD)
                        </span>
                      </div>

                      {/* 結帳地址表單 */}
                      <form onSubmit={handleCheckout}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: '500' }}>外送地址</label>
                          <input
                            type="text"
                            required
                            placeholder="例如: 台北市大安區忠孝東路三段1號"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                          />
                        </div>
                        <button type="submit" disabled={loadingAction} style={{ width: '100%', background: 'var(--customer-color)' }}>
                          {loadingAction ? '下單送出中...' : '確認送出訂單'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 2. 我的訂單分頁 */}
      {activeTab === 'orders' && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>訂單歷史與狀態追蹤</h3>
          {orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
              📭 您目前還沒有任何訂單紀錄。
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="card" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{order.restaurant_name}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '10px' }}>
                      #{order.id} | {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{
                    background: order.status === 'pending' ? '#fff3e0' : order.status === 'preparing' ? '#fce4ec' : order.status === 'ready' ? '#e8f5e9' : order.status === 'delivering' ? '#e0f7fa' : '#eee',
                    color: order.status === 'pending' ? '#e65100' : order.status === 'preparing' ? '#c2185b' : order.status === 'ready' ? '#2e7d32' : order.status === 'delivering' ? '#006064' : '#666',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {order.status === 'pending' && '排隊等待接單'}
                    {order.status === 'preparing' && '廚房製作中'}
                    {order.status === 'ready' && '餐點完成/待取餐'}
                    {order.status === 'delivering' && '外送員配送中'}
                    {order.status === 'delivered' && '美味已送達'}
                  </span>
                </div>

                {/* 訂單進度條 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0', position: 'relative' }}>
                  {/* 背景連線 */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    left: '5%',
                    right: '5%',
                    height: '4px',
                    background: '#ddd',
                    zIndex: 0
                  }} />
                  {/* 進度連線 */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    left: '5%',
                    width: order.status === 'pending' ? '0%' : order.status === 'preparing' ? '25%' : order.status === 'ready' ? '50%' : order.status === 'delivering' ? '75%' : '90%',
                    height: '4px',
                    background: 'var(--customer-color)',
                    zIndex: 0,
                    transition: 'width 0.5s ease-in-out'
                  }} />

                  {/* 進度點 */}
                  {['pending', 'preparing', 'ready', 'delivering', 'delivered'].map((st, idx) => {
                    const statusLabels = { pending: '提交', preparing: '製作', ready: '完成', delivering: '配送', delivered: '送達' };
                    const orderStatusSequence = ['pending', 'preparing', 'ready', 'delivering', 'delivered'];
                    const currentIdx = orderStatusSequence.indexOf(order.status);
                    const isActive = idx <= currentIdx;

                    return (
                      <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isActive ? 'var(--customer-color)' : '#ddd',
                          color: isActive ? 'white' : '#666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          border: '2px solid white'
                        }}>
                          {idx + 1}
                        </div>
                        <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--text-dark)' : 'var(--text-light)' }}>
                          {statusLabels[st]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 訂單明細 */}
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>🍔 {item.name} <strong>x {item.quantity}</strong></span>
                        <span>${item.price_at_order * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>外送費: ${order.delivery_fee}</span>
                    <span style={{ color: 'var(--primary)', fontSize: '1rem' }}>總金額: ${order.total_amount}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                    📍 送餐地址: {order.address}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
