import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import PageComponent from '../PageComponent';
import ChatView from '../Chat/Chat';
import './Dashboard.css';

// иконки
import { ReactComponent as ExitIcon } from '../../icons/exit-icon.svg';

// АНИМАЦИЯ КНОПОК

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 2;

// функция для анимирования радиусов углов элемента
function animateRadii(btn) {
  const state = btn._animationState;
  if (!state) return;
  let isAnimationNeeded = false;
  for (const corner in state.current) {
    const diff = state.target[corner] - state.current[corner];
    if (Math.abs(diff) > 0.01) {
      isAnimationNeeded = true;
      state.current[corner] += diff * EASING_FACTOR;
    } else {
      state.current[corner] = state.target[corner];
    }
  }
  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;
  if (isAnimationNeeded) {
    requestAnimationFrame(() => animateRadii(btn));
  } else {
    state.isAnimating = false;
  }
}

// универсальный обработчик движения мыши для создания эффектов
const handleButtonMove = (e) => {
  const btn = e.currentTarget;
  if (!btn._animationState) {
    btn._animationState = {
      isAnimating: false,
      current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
    };
  }
  const state = btn._animationState;
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const { width, height } = rect;
  const maxRadius = 25;
  const diagonal = Math.sqrt(width**2 + height**2);
  const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
  state.target.tl = calculateRadius(0, 0);
  state.target.tr = calculateRadius(width, 0);
  state.target.br = calculateRadius(width, height);
  state.target.bl = calculateRadius(0, height);
  if (!state.isAnimating) {
    state.isAnimating = true;
    requestAnimationFrame(() => animateRadii(btn));
  }
  btn.style.setProperty('--mouse-x', `${x}px`);
  btn.style.setProperty('--mouse-y', `${y}px`);
};

// обработчик увода мыши с кнопки
const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
  const state = btn._animationState;
  if (!state) return;
  state.target.tl = DEFAULT_RADIUS;
  state.target.tr = DEFAULT_RADIUS;
  state.target.br = DEFAULT_RADIUS;
  state.target.bl = DEFAULT_RADIUS;
  if (!state.isAnimating) {
    state.isAnimating = true;
    requestAnimationFrame(() => animateRadii(btn));
  }
};


// окно подтверждения
const ConfirmationModal = ({ isOpen, onClose, onConfirm, children }) => {
  // если окно не открыто, ничего не рендерим
  if (!isOpen) return null;

  // обработчик клика по оверлею для закрытия окна
  const handleOverlayClick = (e) => {
    if (e.target.id === 'modal-overlay') onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" id="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content confirmation-modal">
        <div className="modal-header">
          <h2>Подтверждение выхода</h2>
        </div>
        <div className="modal-body">
          <p>{children}</p>
        </div>
        <div className="modal-footer">
          <button className="profile-secondary-btn" onClick={onClose} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
            <span>Отмена</span>
          </button>
          <button className="profile-submit-btn" onClick={onConfirm} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};



// список всех возможных пунктов меню и ролей
const allMenuItems = [
    { id: 'profile', label: 'ПРОФИЛЬ', roles: ['student', 'curator'] },
    { id: 'my-requests', label: 'МОИ ЗАЯВКИ', roles: ['student'] },
    { id: 'new-request', label: 'ПОДАТЬ ЗАЯВКУ', roles: ['student'] },
    { id: 'events', label: 'МЕРОПРИЯТИЯ', roles: ['student', 'curator'] },
    { id: 'review-requests', label: 'ЗАЯВКИ', roles: ['curator'] },
    { id: 'create-event', label: 'СОЗДАТЬ МЕРОПРИЯТИЕ', roles: ['curator'] },
    { id: 'all-users', label: 'ПОЛЬЗОВАТЕЛИ', roles: ['curator'] },
    { id: 'logout', label: 'ВЫЙТИ', icon: ExitIcon, roles: ['student', 'curator'] },
];

// константы для расчета размеров плиток меню
const TILE_WIDTH = 200;
const TILE_HEIGHT = 80;


function Dashboard({ onLogout, activePage, onPageChange, userRole, userLogin }) {
  // состояние для отслеживания наведенной плитки (для эффекта глайдера)
  const [hoveredTile, setHoveredTile] = useState(null);
  // состояние для всплывающего окна подтверждения выхода
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  // состояние для управления чатом
  const [activeChat, setActiveChat] = useState({ isOpen: false, request: null });

  // фильтруем список меню на основе роли пользователя
  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  // вычисляем динамический размер контейнера меню для анимации
  const menuContainerStyle = useMemo(() => {
    // если страница выбрана, меню становится боковой панелью
    if (activePage) {
      return { width: `${TILE_WIDTH}px`, height: `${menuItems.length * TILE_HEIGHT}px` };
    }
    // иначе, меню отображается сеткой
    else {
      const rowCount = Math.ceil(menuItems.length / 2);
      return { width: `${TILE_WIDTH * 2}px`, height: `${rowCount * TILE_HEIGHT}px` };
    }
  }, [activePage, menuItems.length]);

  // обработчик клика по плитке меню
  const handleTileClick = (tileId) => {
    // кнопка "выйти" обрабатывается отдельно
    if (tileId === 'logout') {
      setIsConfirmModalOpen(true);
      return;
    }
    // переключаем активную страницу
    onPageChange((current) => (current === tileId ? null : tileId));
    setHoveredTile(tileId);
  };
  
  // обработчик подтверждения выхода из системы
  const handleConfirmLogout = () => {
    setIsConfirmModalOpen(false);
    onLogout();
  };
  
  // функция для открытия чата
  const handleOpenChat = (request) => {
    setActiveChat({ isOpen: true, request: request });
  };

  // функция для закрытия чата
  const handleCloseChat = () => {
    setActiveChat(prev => ({ ...prev, isOpen: false }));
    // очищаем данные о заявке после завершения анимации
    setTimeout(() => setActiveChat({ isOpen: false, request: null }), 600);
  };
  
  // определяем id элемента для подсветки глайдером
  const gliderTargetId = hoveredTile || activePage;

  return (
    <>
      <div className="dashboard-viewport">
        <div className={`dashboard-slider ${activeChat.isOpen ? 'is-chat-active' : ''}`}>
          
          {/* ПАНЕЛЬ 1: Основной интерфейс (меню + страница) */}
          <div className="main-view-panel">
            <div className={`dashboard-container ${activePage ? 'page-view' : 'menu-view'}`}>
              <div className="menu-container" style={menuContainerStyle} onMouseLeave={() => setHoveredTile(null)}>
                
                <div className="menu-glider" style={{
                  opacity: gliderTargetId ? 1 : 0,
                  transform: (() => {
                    const index = menuItems.findIndex((item) => item.id === gliderTargetId);
                    if (index === -1) return 'scale(0)';
                    // в режиме меню позиционируем по строкам и столбцам
                    if (!activePage) {
                      const row = Math.floor(index / 2);
                      const col = index % 2;
                      return `translate(${col * TILE_WIDTH}px, ${row * TILE_HEIGHT}px)`;
                    } 
                    // в режиме страницы позиционируем только по строкам
                    else {
                      return `translateY(${index * TILE_HEIGHT}px)`;
                    }
                  })(),
                }} />

                {/* рендерим плитки меню */}
                {menuItems.map((item, index) => {
                  const isSelected = item.id === activePage;
                  const isHighlighted = item.id === gliderTargetId;
                  const IconComponent = item.icon;
                  let transformStyle;
                  // вычисляем позицию каждой плитки
                  if (!activePage) {
                    const row = Math.floor(index / 2);
                    const col = index % 2;
                    transformStyle = `translate(${col * TILE_WIDTH}px, ${row * TILE_HEIGHT}px)`;
                  } else {
                    transformStyle = `translate(0px, ${index * TILE_HEIGHT}px)`;
                  }
                  return (
                    <button key={item.id} onClick={() => handleTileClick(item.id)} onMouseEnter={() => setHoveredTile(item.id)} className={`tile-button ${isSelected ? 'selected' : ''} ${isHighlighted ? 'hover-active' : ''}`} style={{ transform: transformStyle }}>
                      {IconComponent && <IconComponent className="tile-icon" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="content-area" style={{ height: !activePage ? menuContainerStyle.height : undefined }}>
                {activePage && <PageComponent pageId={activePage} userRole={userRole} userLogin={userLogin} onOpenChat={handleOpenChat} key={activePage} />}
              </div>
            </div>
          </div>

          {/* Чат */}
          <div className="chat-view-panel">
            {activeChat.request && (
              <ChatView
                userLogin={userLogin}
                request={activeChat.request}
                onClose={handleCloseChat}
              />
            )}
          </div>

        </div>
      </div>
      
      {/* всплывающее окно подтверждения, рендерится отдельно */}
      <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmLogout}>
        Вы уверены, что хотите выйти из своей учетной записи?
      </ConfirmationModal>
    </>
  );
}

export default Dashboard;