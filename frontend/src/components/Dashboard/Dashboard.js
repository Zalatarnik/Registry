import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PageComponent from '../PageComponent';
import ChatView from '../Chat/Chat';
import './Dashboard.css';
import ThemeToggle from '../common/ThemeToggle';
import LogoutConfirmation from './LogoutConfirmation';
import ThemeToggle from '../common/ThemeToggle';

import LogoutConfirmation from './LogoutConfirmation';
import Notifications from './Notifications';
import Support from './Support';
import Settings from './Settings';

// Иконки
import { ReactComponent as ExitIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as NotificationIcon } from '../../icons/notification-icon.svg';
import { ReactComponent as SupportIcon } from '../../icons/support-icon.svg';
import { ReactComponent as SettingsIcon } from '../../icons/settings-icon.svg';

const HeaderButtons = ({ userLogin }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [modalPosition, setModalPosition] = useState(null);
  const buttonRefs = useRef({});
  const buttonsContainerRef = useRef(null);

  const buttons = [
    { id: 'notifications', label: 'Уведомления', icon: NotificationIcon },
    { id: 'support', label: 'Поддержка', icon: SupportIcon },
    { id: 'settings', label: 'Настройки', icon: SettingsIcon }
  ];

  // Обработчик клика по кнопке в шапке
  const handleButtonClick = (buttonId, ref) => {
    const newActiveModalId = activeModal === buttonId ? null : buttonId;
    setActiveModal(newActiveModalId);
    setHoveredButton(newActiveModalId); 
    if (newActiveModalId && ref) {
      setModalPosition(ref.getBoundingClientRect());
    }
  };
  // Обработчик для закрытия модального окна
  const handleCloseModal = () => { setActiveModal(null); setHoveredButton(null); };

  return (
    <>
      <div
        ref={buttonsContainerRef} 
        className={`header-buttons-container ${activeModal ? 'is-active' : ''}`} 
        onMouseLeave={() => setHoveredButton(activeModal)}
      >
        {buttons.map(button => {
          const IconComponent = button.icon;
          const isSelected = activeModal === button.id;
          const isHoverActive = hoveredButton === button.id; 
          return (
            <button 
              key={button.id} 
              ref={el => buttonRefs.current[button.id] = el} 
              className={`header-button ${isSelected ? 'selected' : ''} ${isHoverActive ? 'hover-active' : ''}`} 
              onMouseEnter={() => setHoveredButton(button.id)}
              onClick={() => handleButtonClick(button.id, buttonRefs.current[button.id])}
            >
              <IconComponent className="header-icon" /><span className="header-label">{button.label}</span>
            </button>
          );
        })}
      </div>
      <Notifications isOpen={activeModal === 'notifications'} onClose={handleCloseModal} position={modalPosition} userLogin={userLogin} triggerRef={buttonsContainerRef} />
      <Support isOpen={activeModal === 'support'} onClose={handleCloseModal} position={modalPosition} triggerRef={buttonsContainerRef} />
      <Settings isOpen={activeModal === 'settings'} onClose={handleCloseModal} position={modalPosition} triggerRef={buttonsContainerRef} />
    </>
  );
};

// Полный список всех пунктов меню с их ролями
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
// Константы для размеров плиток меню
const TILE_WIDTH = 200; 
const TILE_HEIGHT = 80;

// Основной компонент панели управления
function Dashboard({ onLogout, activePage, onPageChange, userRole, userLogin }) {
  const [hoveredTile, setHoveredTile] = useState(null);
  const [activeChat, setActiveChat] = useState({ isOpen: false, request: null });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const logoutButtonRef = useRef(null);

  const menuItems = useMemo(() => allMenuItems.filter(item => item.roles.includes(userRole)), [userRole]);

  const menuContainerStyle = useMemo(() => {
      // Если открыта какая-либо страница, меню отображается в одну колонку
      if (activePage) return { width: `${TILE_WIDTH}px`, height: `${menuItems.length * TILE_HEIGHT}px` };
      // Иначе, меню отображается в две колонки
      const rowCount = Math.ceil(menuItems.length / 2);
      return { width: `${TILE_WIDTH * 2}px`, height: `${rowCount * TILE_HEIGHT}px` };
  }, [activePage, menuItems.length]);

  // Обработчик клика по плитке меню
  const handleTileClick = (tileId) => {
      if (tileId === 'logout') {
          if (logoutButtonRef.current) {
              const rect = logoutButtonRef.current.getBoundingClientRect();
              // Устанавливаем позицию модального окна рядом с кнопкой
              setModalPosition({ top: rect.top, left: rect.right + rect.width});
              setIsConfirmModalOpen(true); // Открываем модальное окно подтверждения
          }
          return;
      }
      onPageChange((current) => (current === tileId ? null : tileId));
      setHoveredTile(tileId);
  };

  const handleConfirmLogout = () => onLogout();
  const handleOpenChat = (request) => setActiveChat({ isOpen: true, request });
  const handleCloseChat = () => {
      setActiveChat(prev => ({ ...prev, isOpen: false }));
      setTimeout(() => setActiveChat({ isOpen: false, request: null }), 600);
  };

  const gliderTargetId = hoveredTile || activePage;

  return (
    <div className="dashboard-viewport">
        <HeaderButtons userLogin={userLogin} />
        <div className={`dashboard-slider ${activeChat.isOpen ? 'is-chat-active' : ''}`}>
          <div className="main-view-panel">
            <div className={`dashboard-container ${activePage ? 'page-view' : 'menu-view'}`}>
              <div className="menu-container" style={menuContainerStyle} onMouseLeave={() => setHoveredTile(null)}>
                
              <div
                className="menu-glider"
                style={{
                  opacity: gliderTargetId ? 1 : 0,
                  transform: (() => {
                    const idx = menuItems.findIndex(i => i.id === gliderTargetId);
                    if (idx === -1) return 'scale(0)';
                    if (!activePage) {
                      const row = Math.floor(idx / 2);
                      const col = idx % 2;
                      return `translate(${col * TILE_WIDTH}px, ${row * TILE_HEIGHT}px)`;
                    }
                    return `translateY(${idx * TILE_HEIGHT}px)`;
                  })(),
                }}
              />

                {menuItems.map((item, index) => {

                  const isSelected    = item.id === activePage;
                  const isHighlighted = item.id === (hoveredTile || activePage);
                  const IconComponent = item.icon;

                  const transformStyle = !activePage
                    ? `translate(${(index % 2) * TILE_WIDTH}px, ${Math.floor(index / 2) * TILE_HEIGHT}px)`
                    : `translate(0px, ${index * TILE_HEIGHT}px)`;

                  return (
                    <button
                      key={item.id}
                      ref={item.id === 'logout' ? logoutButtonRef : null}
                      onClick={() => handleTileClick(item.id)}
                      onMouseEnter={() => setHoveredTile(item.id)}
                      className={`tile-button ${isSelected ? 'selected' : ''} ${isHighlighted ? 'hover-active' : ''}`}
                      style={{ transform: transformStyle }}
                    >
                      {IconComponent && <IconComponent className="tile-icon" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

                <div className="menu-footer">
                  <ThemeToggle />
                </div>
              
              <div className="content-area" style={{ height: !activePage ? menuContainerStyle.height : undefined }}>
                {activePage && <PageComponent pageId={activePage} userRole={userRole} userLogin={userLogin} onOpenChat={handleOpenChat} key={activePage} />}
              </div>
            </div>
          </div>
          
          <div className="chat-view-panel">
            {activeChat.request && (
              <ChatView userLogin={userLogin} request={activeChat.request} onClose={handleCloseChat}/>
            )}
          </div>
            <div className="main-view-panel">
                <div className={`dashboard-container ${activePage ? 'page-view' : 'menu-view'}`}>
                    <div className="menu-container" style={menuContainerStyle} onMouseLeave={() => setHoveredTile(null)}>
                        <div className="menu-glider" style={{
                            opacity: gliderTargetId ? 1 : 0,
                            transform: (() => {
                                const index = menuItems.findIndex((item) => item.id === gliderTargetId);
                                if (index === -1) return 'scale(0)';
                                const col = activePage ? 0 : index % 2;
                                const row = activePage ? index : Math.floor(index / 2);
                                return `translate(${col * TILE_WIDTH}px, ${row * TILE_HEIGHT}px)`;
                            })(),
                        }} />
                        {menuItems.map((item, index) => {
                            const isSelected = item.id === activePage;
                            const isHighlighted = item.id === gliderTargetId;
                            const IconComponent = item.icon;
                            const col = activePage ? 0 : index % 2;
                            const row = activePage ? index : Math.floor(index / 2);
                            const transformStyle = `translate(${col * TILE_WIDTH}px, ${row * TILE_HEIGHT}px)`;
                            return (
                                <button
                                    key={item.id}
                                    ref={item.id === 'logout' ? logoutButtonRef : null}
                                    onClick={() => handleTileClick(item.id)}
                                    onMouseEnter={() => setHoveredTile(item.id)}
                                    className={`tile-button ${isSelected ? 'selected' : ''} ${isHighlighted ? 'hover-active' : ''}`}
                                    style={{ transform: transformStyle }}>
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
            <div className="chat-view-panel">
                {activeChat.request && <ChatView userLogin={userLogin} request={activeChat.request} onClose={handleCloseChat}/>}
            </div>
        </div>
        <LogoutConfirmation isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmLogout} position={modalPosition} />
    </div>
  );
}

export default Dashboard;