import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PageComponent from '../PageComponent';
import ChatView from '../Chat/Chat';
import './Dashboard.css';
import LogoutConfirmation from './LogoutConfirmation';

import Notifications from './Notifications';
import Support from './Support';
import Settings from './Settings';
import { useTranslation } from '../common/useTranslation';


// Иконки
import { ReactComponent as ExitIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as NotificationIcon } from '../../icons/notification-icon.svg';
import { ReactComponent as SupportIcon } from '../../icons/support-icon.svg';
import { ReactComponent as SettingsIcon } from '../../icons/settings-icon.svg';




const HeaderButtons = ({ userLogin, t }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [modalPosition, setModalPosition] = useState(null);
  const buttonRefs = useRef({});
  const buttonsContainerRef = useRef(null);

  const buttons = [
    { id: 'notifications', i18n: 'modal.notifications', icon: NotificationIcon },
    { id: 'support',       i18n: 'modal.support',       icon: SupportIcon },
    { id: 'settings',      i18n: 'modal.settings',      icon: SettingsIcon }
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
              <IconComponent className="header-icon" /><span className="header-label">{t(button.i18n)}</span>
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

const allMenuItems = [
  { id: 'profile',          i18n: 'menu.profile',        roles: ['student','curator'] },
  { id: 'my-requests',      i18n: 'menu.myRequests',     roles: ['student'] },
  { id: 'new-request',      i18n: 'menu.newRequest',     roles: ['student'] },
  { id: 'events',           i18n: 'menu.events',         roles: ['student','curator'] },
  { id: 'review-requests',  i18n: 'menu.reviewRequests', roles: ['curator'] },
  { id: 'create-event',     i18n: 'menu.createEvent',    roles: ['curator'] },
  { id: 'all-users',        i18n: 'menu.allUsers',       roles: ['curator'] },
  { id: 'logout',           i18n: 'menu.logout',         icon: ExitIcon, roles: ['student','curator'] },
];

// Адаптивный размер плиток (подстраиваем под ширину/высоту экрана и тач)
const useAdaptiveTileSize = () => {
  const [size, setSize] = useState({ w: 200, h: 80 });

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      let TW = 200, TH = 80;

      // чуть компактнее на планшетах/узких десктопах
      if (w < 1200) { TW = 190; TH = 72; }
      if (w < 992)  { TW = 180; TH = 68; }

      // тач-устройства и/или очень низкие экраны (ландшафт телефона)
      if (isCoarse || h < 520) { TW = 168; TH = 60; }
      if (w < 760) { TW = 160; TH = 56; } // узкие окна/малые планшеты

      setSize({ w: TW, h: TH });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, []);
  return size;
};

// Основной компонент панели управления
function Dashboard({ onLogout, activePage, onPageChange, userRole, userLogin }) {
  const { t } = useTranslation();
  const tileSize = useAdaptiveTileSize();
  const [hoveredTile, setHoveredTile] = useState(null);
  const [activeChat, setActiveChat] = useState({ isOpen: false, request: null });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const logoutButtonRef = useRef(null);

  const menuItems = useMemo(() => allMenuItems.filter(item => item.roles.includes(userRole)), [userRole]);

  const menuContainerStyle = useMemo(() => {
    const TW = tileSize.w, TH = tileSize.h;
    if (activePage) {
      return {
        width: `${TW}px`,
        height: `${menuItems.length * TH}px`,
        // прокидываем переменные в CSS
        ['--tile-w']: `${TW}px`,
        ['--tile-h']: `${TH}px`,
      };
    }
    const rowCount = Math.ceil(menuItems.length / 2);
    return {
      height: `${rowCount * TH}px`,
      ['--tile-w']: `${TW}px`,
      ['--tile-h']: `${TH}px`,
    };
  }, [activePage, menuItems.length, tileSize]);

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
      <HeaderButtons userLogin={userLogin} t={t} />
      {activePage ?
        <div class="mobile-burger-menu-button" onClick={() => {let prevActivePage = activePage; (() => {onPageChange(activePage ? null : prevActivePage)})();}}>
          <span class="burger-line"></span>
          </div>
      : ''}

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
                      const TW = tileSize.w, TH = tileSize.h;
                      if (!activePage) {
                        const row = Math.floor(idx / 2);
                        const col = idx % 2;
                        return `translate(${col * TW}px, ${row * TH}px)`;
                      }
                      return `translateY(${idx * TH}px)`;
                  })(),
                  ['--tile-w']: `${tileSize.w}px`,
                  ['--tile-h']: `${tileSize.h}px`,                  
                }}
              />

              {menuItems.map((item, index) => {
                const isSelected    = item.id === activePage;
                const isHighlighted = item.id === (hoveredTile || activePage);
                const IconComponent = item.icon;
                const TW = tileSize.w, TH = tileSize.h;
                const transformStyle = !activePage
                  ? `translate(${(index % 2) * TW}px, ${Math.floor(index / 2) * TH}px)`
                  : `translate(0px, ${index * TH}px)`;

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
                    <span>{t(item.i18n)}</span>
                  </button>
                );
              })}
            </div>

            <div className="menu-footer">
             
            </div>

            <div className="content-area" style={{ height: !activePage ? menuContainerStyle.height : undefined }}>
              {activePage && (
                <PageComponent
                  pageId={activePage}
                  userRole={userRole}
                  userLogin={userLogin}
                  onOpenChat={handleOpenChat}
                  key={activePage}
                />
              )}
            </div>
          </div>
        </div>

        <div className="chat-view-panel">
          {activeChat.request && (
            <ChatView userLogin={userLogin} request={activeChat.request} onClose={handleCloseChat} />
          )}
        </div>
      </div>

      <LogoutConfirmation
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmLogout}
        position={modalPosition}
      />
    </div>
  );
}

export default Dashboard;