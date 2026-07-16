import { useState, useEffect } from 'react'
import './App.css'
import MerchantDashboard from './components/MerchantDashboard'
import CustomerDashboard from './components/CustomerDashboard'
import RiderDashboard from './components/RiderDashboard'

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '');

function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [user, setUser] = useState(null);
  
  // 表單欄位
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // 'customer' | 'merchant' | 'rider'
  
  // 錯誤與成功訊息提示
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 網頁初始化載入 Token
  useEffect(() => {
    const savedUserToken = localStorage.getItem('userToken');
    const savedUserRole = localStorage.getItem('userRole');
    const savedUserEmail = localStorage.getItem('userEmail');
    if (savedUserToken && savedUserRole && savedUserEmail) {
      setUser({
        token: savedUserToken,
        role: savedUserRole,
        email: savedUserEmail
      });
      setCurrentPage('dashboard');
    }
  }, []);

  // 登入處理
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        throw new Error(`伺服器回應格式錯誤 (${response.status})。後端目前連線中，請稍候重試！`);
      }

      if (!response.ok) {
        throw new Error(data.detail || '登入失敗，請檢查您的帳號密碼');
      }

      // 儲存至本地
      localStorage.setItem('userToken', data.access_token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userEmail', data.email);

      setUser({
        token: data.access_token,
        role: data.role,
        email: data.email
      });

      setSuccessMsg('登入成功！導向大廳中...');
      setPassword('');
      
      setTimeout(() => {
        setCurrentPage('dashboard');
        setSuccessMsg('');
      }, 1000);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 註冊處理
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, role })
      });

      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        throw new Error(`伺服器回應格式錯誤 (${response.status})。後端目前連線中，請稍候重試！`);
      }

      if (!response.ok) {
        throw new Error(data.detail || '註冊失敗，請檢查資料欄位');
      }

      setSuccessMsg('註冊成功！請直接登入。');
      setPassword('');
      
      setTimeout(() => {
        setCurrentPage('login');
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 登出處理
  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    setUser(null);
    setCurrentPage('login');
  };

  return (
    <div className="app-container">
      {/* 導覽列 */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.2rem 1.5rem',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }} onClick={() => user && setCurrentPage('dashboard')}>
          <span style={{ fontSize: '2rem' }}>🧡</span>
          <h2 style={{ margin: 0, background: 'linear-gradient(135deg, #ff5722 0%, #ff8a00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900' }}>專送達</h2>
          <span style={{
            fontSize: '0.75rem',
            background: 'var(--primary-bg)',
            color: 'var(--primary)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.05em'
          }}>MVP</span>
        </div>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem', fontWeight: '500' }}>{user.email}</span>
            <span style={{
              background: user.role === 'customer' ? 'var(--customer-gradient)' : user.role === 'merchant' ? 'var(--merchant-gradient)' : 'var(--rider-gradient)',
              color: 'white',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}>
              {user.role === 'customer' ? '消費者' : user.role === 'merchant' ? '商家' : '外送員'}
            </span>
            <button onClick={handleLogout} style={{
              background: 'transparent',
              color: 'var(--text-medium)',
              border: '1px solid var(--border-color)',
              padding: '6px 14px',
              fontSize: '0.85rem',
              boxShadow: 'none'
            }} onMouseOver={(e) => { e.target.style.color = 'var(--primary)'; e.target.style.borderColor = 'var(--primary)'; }}
               onMouseOut={(e) => { e.target.style.color = 'var(--text-medium)'; e.target.style.borderColor = 'var(--border-color)'; }}>
              登出
            </button>
          </div>
        )}
      </header>

      {/* 訊息提示區 */}
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {errorMsg && <div className="alert alert-danger">⚠️ {errorMsg}</div>}
        {successMsg && <div className="alert alert-success">✨ {successMsg}</div>}
      </div>

      {/* 登入註冊主畫面 (Split-Screen 設計) */}
      {(currentPage === 'login' || currentPage === 'register') && (
        <div style={{
          display: 'flex',
          maxWidth: '900px',
          margin: '1.5rem auto',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}>
          {/* 左側：品牌形象區 */}
          <div style={{
            flex: '1 1 400px',
            background: 'linear-gradient(135deg, #ff5722 0%, #ff8a00 100%)',
            padding: '3rem',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* 裝飾背景圈 */}
            <div style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              top: '-50px',
              right: '-50px',
              zIndex: 0
            }} />
            <div style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%',
              bottom: '-20px',
              left: '-20px',
              zIndex: 0
            }} />

            <div style={{ zIndex: 1 }}>
              <span style={{ fontSize: '3rem' }}>🛵</span>
              <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '800' }}>
                美味專送，<br/>即刻到達！
              </h1>
              <p style={{ opacity: 0.9, fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                「專送達」是您的全方位外送協作平台。無論您是飢腸轆轆的饕客、尋求曝光的美味餐廳，還是奔馳於大街小巷的外送夥伴，我們都在此將大家緊密相連。
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '50%' }}>🛍️</span>
                  <strong>消費者：線上瀏覽，加計 39 元外送費輕鬆點餐！</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '50%' }}>🍳</span>
                  <strong>合作商家：自由管理菜單商品，即時一鍵接單製作！</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '50%' }}>🛵</span>
                  <strong>外送員：訂單大廳公平搶單，內置獨家防重複鎖！</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：表單卡片區 */}
          <div style={{
            flex: '1 1 400px',
            padding: '3rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {/* 1. 登入畫面 */}
            {currentPage === 'login' && (
              <div>
                <h3 style={{ marginBottom: '0.5rem', fontWeight: '800', fontSize: '1.6rem' }}>歡迎回來</h3>
                <p style={{ color: 'var(--text-light)', marginBottom: '2rem', fontSize: '0.95rem' }}>請輸入您的帳號密碼登入</p>
                
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">電子信箱</label>
                    <input
                      type="email"
                      required
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label">密碼</label>
                    <input
                      type="password"
                      required
                      placeholder="請輸入您的密碼"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem' }}>
                    {loading ? '登入中...' : '登入'}
                  </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'var(--text-medium)' }}>
                  還沒有帳號嗎？ <a href="#register" onClick={(e) => { e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); setCurrentPage('register'); }}>立即註冊</a>
                </div>
              </div>
            )}

            {/* 2. 註冊畫面 */}
            {currentPage === 'register' && (
              <div>
                <h3 style={{ marginBottom: '0.5rem', fontWeight: '800', fontSize: '1.6rem' }}>建立新帳號</h3>
                <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>選擇角色並註冊以加入專送達平台</p>
                
                <form onSubmit={handleRegister}>
                  <div className="form-group">
                    <label className="form-label">選擇您的角色身份</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setRole('customer')}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0',
                          background: role === 'customer' ? 'var(--customer-gradient)' : '#e2e8f0',
                          color: role === 'customer' ? 'white' : 'var(--text-medium)',
                          border: 'none',
                          borderRadius: '10px',
                          boxShadow: role === 'customer' ? '0 2px 6px rgba(255,87,34,0.3)' : 'none',
                          transform: 'none'
                        }}
                      >
                        消費者
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('merchant')}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0',
                          background: role === 'merchant' ? 'var(--merchant-gradient)' : '#e2e8f0',
                          color: role === 'merchant' ? 'white' : 'var(--text-medium)',
                          border: 'none',
                          borderRadius: '10px',
                          boxShadow: role === 'merchant' ? '0 2px 6px rgba(233,30,99,0.3)' : 'none',
                          transform: 'none'
                        }}
                      >
                        合作商家
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('rider')}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0',
                          background: role === 'rider' ? 'var(--rider-gradient)' : '#e2e8f0',
                          color: role === 'rider' ? 'white' : 'var(--text-medium)',
                          border: 'none',
                          borderRadius: '10px',
                          boxShadow: role === 'rider' ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                          transform: 'none'
                        }}
                      >
                        外送員
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">電子信箱</label>
                    <input
                      type="email"
                      required
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label">設定密碼 (至少 6 位元)</label>
                    <input
                      type="password"
                      required
                      placeholder="請輸入密碼"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem' }}>
                    {loading ? '註冊中...' : '註冊'}
                  </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'var(--text-medium)' }}>
                  已經有帳號？ <a href="#login" onClick={(e) => { e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); setCurrentPage('login'); }}>立即登入</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. 登入後之首頁 / 大廳 */}
      {currentPage === 'dashboard' && user && (
        <>
          {user.role === 'merchant' ? (
            <MerchantDashboard 
              user={user} 
              apiBaseUrl={API_BASE_URL} 
              onError={setErrorMsg} 
              onSuccess={(msg) => {
                setSuccessMsg(msg);
                setTimeout(() => setSuccessMsg(''), 3000);
              }} 
            />
          ) : user.role === 'customer' ? (
            <CustomerDashboard 
              user={user} 
              apiBaseUrl={API_BASE_URL} 
              onError={setErrorMsg} 
              onSuccess={(msg) => {
                setSuccessMsg(msg);
                setTimeout(() => setSuccessMsg(''), 3000);
              }} 
            />
          ) : (
            <RiderDashboard 
              user={user} 
              apiBaseUrl={API_BASE_URL} 
              onError={setErrorMsg} 
              onSuccess={(msg) => {
                setSuccessMsg(msg);
                setTimeout(() => setSuccessMsg(''), 3000);
              }} 
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
