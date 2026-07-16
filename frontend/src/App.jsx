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

      const data = await response.json();

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

      const data = await response.json();

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
        padding: '1rem 0',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => user && setCurrentPage('dashboard')}>
          <span style={{ fontSize: '2rem' }}>🧡</span>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontWeight: '800' }}>專送達</h2>
          <span style={{
            fontSize: '0.8rem',
            background: 'var(--primary-bg)',
            color: 'var(--primary)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 'bold'
          }}>MVP</span>
        </div>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{user.email}</span>
            <span style={{
              background: user.role === 'customer' ? 'var(--customer-color)' : user.role === 'merchant' ? 'var(--merchant-color)' : 'var(--rider-color)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {user.role === 'customer' ? '消費者' : user.role === 'merchant' ? '商家' : '外送員'}
            </span>
            <button onClick={handleLogout} style={{
              background: 'transparent',
              color: 'var(--text-light)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              fontSize: '0.9rem'
            }} onMouseOver={(e) => { e.target.style.color = 'var(--primary)'; e.target.style.borderColor = 'var(--primary)'; }}
               onMouseOut={(e) => { e.target.style.color = 'var(--text-light)'; e.target.style.borderColor = 'var(--border-color)'; }}>
              登出
            </button>
          </div>
        )}
      </header>

      {/* 主內容區 */}
      <main style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        {/* 1. 登入畫面 */}
        {currentPage === 'login' && (
          <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 'bold' }}>登入帳號</h3>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>電子信箱</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>密碼</label>
                <input
                  type="password"
                  required
                  placeholder="請輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.8rem' }}>
                {loading ? '登入中...' : '登入'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
              還沒有帳號？ <a href="#register" onClick={(e) => { e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); setCurrentPage('register'); }}>立即註冊</a>
            </div>
          </div>
        )}

        {/* 2. 註冊畫面 */}
        {currentPage === 'register' && (
          <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 'bold' }}>註冊新帳號</h3>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>選擇角色</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0',
                      background: role === 'customer' ? 'var(--customer-color)' : '#eee',
                      color: role === 'customer' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '8px'
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
                      background: role === 'merchant' ? 'var(--merchant-color)' : '#eee',
                      color: role === 'merchant' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '8px'
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
                      background: role === 'rider' ? 'var(--rider-color)' : '#eee',
                      color: role === 'rider' ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    外送員
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>電子信箱</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>密碼 (至少 6 位元)</label>
                <input
                  type="password"
                  required
                  placeholder="請設定密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.8rem' }}>
                {loading ? '註冊中...' : '註冊'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
              已經有帳號？ <a href="#login" onClick={(e) => { e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); setCurrentPage('login'); }}>立即登入</a>
            </div>
          </div>
        )}
      </main>

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
