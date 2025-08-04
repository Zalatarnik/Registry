import React, { useState, useEffect } from 'react';
import { NotificationProvider, useNotification } from './notification/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';
import LoginPage from './components/LoginPage/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import localLogo from './images/logo.png';


function AppContent() {
  const [user, setUser] = useState(null);
  const [isHidingLogin, setIsHidingLogin] = useState(false);
  const [activePage, setActivePage] = useState('profile');
  const { addNotification } = useNotification();

  //  Эффект проверки авторизации при запуске (кука будет отправлена автоматически)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/profile/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) return;

        const data = await response.json();
        setUser({ login: data.login, role: data.role });
      } catch (error) {
        console.warn('Пользователь не авторизован');
      }
    };

    checkAuth();
  }, []);

  //  Обработка нажатия ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (user && event.key === 'Escape') setActivePage(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  //  Вход в систему
const handleLoginSuccess = async (login, password) => {
  try {
    const response = await fetch('http://localhost:8000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ login, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Ошибка входа');
    }
    const data = await response.json();
    const user = { login: data.login, role: data.role };

    addNotification(`Добро пожаловать! Вы вошли как ${user.role === 'student' ? 'студент' : 'куратор'}.`);

    setIsHidingLogin(true);
    setTimeout(() => {
      setUser(user);
      setActivePage('profile');
      setIsHidingLogin(false);
    }, 400);
  } catch (error) {
    console.error('Ошибка входа:', error);
    addNotification(error.message, 'error');
  }
};

  // Выход
const handleLogout = async () => {
  try {
    await fetch('http://localhost:8000/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    console.warn('logout fail:', e);
  } finally {
    // чистим локальный стейт
    setUser(null);
    setActivePage(null);
  }
};

  const isLogoHidden = user && activePage;

  return (
    <div className="App">
      <div className={`background-triangle ${user ? 'is-visible' : ''} ${user && !activePage ? 'is-enlarged' : ''}`}></div>
      <div className={`background-shape-right ${user && !activePage ? 'is-visible' : ''}`}></div>
      <img src={localLogo} alt="Логотип" className={`app-logo ${isLogoHidden ? 'is-hidden' : ''} ${user && !activePage ? 'is-enlarged' : ''}`} />

      {!user ? (
        <div className={`login-page-container ${isHidingLogin ? 'is-hiding' : ''}`}>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <Dashboard
          userLogin={user.login}
          userRole={user.role}
          onLogout={handleLogout}
          activePage={activePage}
          onPageChange={setActivePage}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}