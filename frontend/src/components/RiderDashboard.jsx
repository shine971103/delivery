import { useState, useEffect } from 'react';

export default function RiderDashboard({ user, apiBaseUrl, onError, onSuccess }) {
  const [activeTab, setActiveTab] = useState('lobby'); // 'lobby' | 'delivering' | 'history'
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

  // 1. 載入搶單大廳可接訂單
  const fetchAvailableOrders = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/rider/orders`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得可接訂單失敗');
      setAvailableOrders(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 2. 載入自己接過的配送紀錄
  const fetchMyDeliveries = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/rider/my-orders`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '取得配送紀錄失敗');
      setMyDeliveries(data);
    } catch (err) {
      onError(err.message);
    }
  };

  // 頁面初始化
  useEffect(() => {
    if (user) {
      fetchAvailableOrders();
      fetchMyDeliveries();
    }
  }, [user]);

  // 背景輪詢新可用訂單與自己的訂單 (每 5 秒一次)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchAvailableOrders();
      fetchMyDeliveries();
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // 搶單處理 (處理 409 衝突)
  const handleAcceptOrder = async (orderId) => {
    setLoadingAction(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/rider/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();

      if (response.status === 409) {
        throw new Error(data.detail || '搶單失敗：此訂單已被其他外送員接走！');
      } else if (!response.ok) {
        throw new Error(data.detail || '接單程序出錯');
      }

      onSuccess('搶單成功！請立刻前往餐廳取餐。');
      // 更新大廳與自己的配送清單
      setAvailableOrders(availableOrders.filter(o => o.id !== orderId));
      fetchMyDeliveries();
      setActiveTab('delivering');
    } catch (err) {
      onError(err.message);
      // 搶單失敗時自動刷大廳
      fetchAvailableOrders();
    } finally {
      setLoadingAction(false);
    }
  };

  // 確認送達處理
  const handleDeliverOrder = async (orderId) => {
    setLoadingAction(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/rider/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '送達程序更新失敗');

      onSuccess('餐點已安全送達，收款完成！辛苦了。');
      fetchMyDeliveries();
      setActiveTab('history');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // 過濾配送中與已送達的歷史紀錄
  const activeDeliveries = myDeliveries.filter(o => o.status === 'delivering');
  const completedDeliveries = myDeliveries.filter(o => o.status === 'delivered');

  return (
    <div style={{ width: '100%' }}>
      {/* 頂部切換按鈕 */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('lobby')}
          style={{
            background: activeTab === 'lobby' ? 'var(--rider-color)' : 'transparent',
            color: activeTab === 'lobby' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          🛵 搶單大廳 ({availableOrders.length} 張新單等待取餐)
        </button>
        <button
          onClick={() => setActiveTab('delivering')}
          style={{
            background: activeTab === 'delivering' ? 'var(--rider-color)' : 'transparent',
            color: activeTab === 'delivering' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          📦 配送任務 ({activeDeliveries.length} 件配送中)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            background: activeTab === 'history' ? 'var(--rider-color)' : 'transparent',
            color: activeTab === 'history' ? 'white' : '#666',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            transform: 'none'
          }}
        >
          📊 配送歷史 ({completedDeliveries.length} 件已送達)
        </button>
      </div>

      {/* 1. 搶單大廳 */}
      {activeTab === 'lobby' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>待配送訂單大廳</h3>
          {availableOrders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
              🍀 目前暫無等待配送的訂單，您可以稍候輪詢。
            </div>
          ) : (
            availableOrders.map(order => (
              <div key={order.id} className="card" style={{ borderLeft: '6px solid var(--rider-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '1.1rem' }}>訂單編號 #{order.id}</strong>
                  <span style={{
                    background: '#e8f5e9',
                    color: 'var(--rider-color)',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    待接單取餐
                  </span>
                </div>

                {/* 地址資訊 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.8rem', background: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    🏬 <strong>起點 (商家取餐)：</strong>
                    <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>{order.restaurant_name}</span>
                    <p style={{ margin: '2px 0 0 20px', color: 'var(--text-light)' }}>{order.restaurant_address}</p>
                  </div>
                  <div>
                    📍 <strong>終點 (送至消費者)：</strong>
                    <span style={{ color: 'var(--text-dark)' }}>{order.address}</span>
                  </div>
                </div>

                {/* 商品細項 (讓外送員知道餐點份量大小) */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem', paddingLeft: '8px' }}>
                  餐點項目: {order.items.map(item => `${item.name} x ${item.quantity}`).join(', ')}
                </div>

                {/* 外送費與總計金額 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    🛵 <strong>外送費收入: ${order.delivery_fee}元</strong> | 💵 <strong>代收現金: ${order.total_amount}元</strong>
                  </div>
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={loadingAction}
                    style={{ background: 'var(--rider-color)', fontSize: '0.9rem', padding: '8px 16px' }}
                  >
                    搶此訂單
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. 配送任務 */}
      {activeTab === 'delivering' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>進行中配送任務</h3>
          {activeDeliveries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
              🚴 目前沒有正在配送的訂單，快去大廳搶單吧！
            </div>
          ) : (
            activeDeliveries.map(order => (
              <div key={order.id} className="card" style={{ borderLeft: '6px solid #ff9800', background: '#fffefb' }}>
                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', color: '#e65100' }}>
                  <span>配送中任務 #{order.id}</span>
                  <span style={{ fontSize: '0.85rem', color: '#ff9800', fontWeight: 'bold' }}>⚡ 盡速取餐配送中</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  <div style={{ borderBottom: '1px dashed #e0e0e0', paddingBottom: '0.8rem' }}>
                    <strong style={{ color: 'var(--rider-color)' }}>步驟 1. 前往商家取餐 🍳</strong>
                    <div style={{ marginTop: '5px', fontWeight: '600', color: 'var(--text-dark)' }}>{order.restaurant_name}</div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>📍 {order.restaurant_address}</div>
                  </div>
                  
                  <div style={{ borderBottom: '1px dashed #e0e0e0', paddingBottom: '0.8rem' }}>
                    <strong style={{ color: 'var(--primary)' }}>步驟 2. 送至目的地 📍</strong>
                    <div style={{ marginTop: '5px', color: 'var(--text-dark)' }}>📍 {order.address}</div>
                  </div>
                  
                  <div>
                    <strong>步驟 3. 貨到收款 💵</strong>
                    <div style={{ marginTop: '5px', color: '#c62828', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      請向消費者收取現金：${order.total_amount} 元
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ fontSize: '0.95rem' }}>
                    本單外送費收入：<strong style={{ color: 'var(--rider-color)', fontSize: '1.1rem' }}>${order.delivery_fee} 元</strong>
                  </div>
                  <button
                    onClick={() => handleDeliverOrder(order.id)}
                    disabled={loadingAction}
                    style={{ background: 'var(--rider-color)', padding: '10px 20px', fontSize: '0.95rem' }}
                  >
                    確認送達並收款
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. 配送歷史 */}
      {activeTab === 'history' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          
          {/* 外送員統計看板 */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--rider-color), #2e7d32)',
            color: 'white',
            textAlign: 'center',
            padding: '2rem 1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'white', opacity: 0.9 }}>外送夥伴配送統計</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.2rem' }}>
              <div>
                <span style={{ fontSize: '2rem', display: 'block', fontWeight: 'bold' }}>{completedDeliveries.length} 件</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>累計送達單數</span>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', height: '40px', alignSelf: 'center' }}></div>
              <div>
                <span style={{ fontSize: '2rem', display: 'block', fontWeight: 'bold' }}>${completedDeliveries.length * 39} 元</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>累計外送費收入 (每單 $39)</span>
              </div>
            </div>
          </div>

          <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>已送達歷史紀錄</h3>
          {completedDeliveries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
              📈 尚無已完成的歷史訂單。
            </div>
          ) : (
            completedDeliveries.map(order => (
              <div key={order.id} className="card" style={{ opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong>訂單 #{order.id} - 送達完工</strong>
                  <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.85rem' }}>✓ 送達已結案</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  店名: {order.restaurant_name} | 地址: {order.address}
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>已代收現金: ${order.total_amount}</span>
                  <strong style={{ color: 'var(--rider-color)' }}>外送費收入: +${order.delivery_fee}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
