import React, { useState, useMemo, useRef } from 'react';
import PageComponent from '../PageComponent';
import ChatView from '../Chat/Chat';
import './Dashboard.css';
import LogoutConfirmation from './LogoutConfirmation';
import ThemeToggle from '../common/ThemeToggle';


// иконки
import { ReactComponent as ExitIcon } from '../../icons/exit-icon.svg';

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

const TILE_WIDTH = 200;
const TILE_HEIGHT = 80;

function Dashboard({ onLogout, activePage, onPageChange, userRole, userLogin }) {
  const [hoveredTile, setHoveredTile] = useState(null);
  const [activeChat, setActiveChat] = useState({ isOpen: false, request: null });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const logoutButtonRef = useRef(null);

  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  const menuContainerStyle = useMemo(() => {
    if (activePage) {
      return { width: `${TILE_WIDTH}px`, height: `${menuItems.length * TILE_HEIGHT}px` };
    }
    else {
      const rowCount = Math.ceil(menuItems.length / 2);
      return { width: `${TILE_WIDTH * 2}px`, height: `${rowCount * TILE_HEIGHT}px` };
    }
  }, [activePage, menuItems.length]);

  const handleTileClick = (tileId) => {
    if (tileId === 'logout') {
      if (logoutButtonRef.current) {
        const rect = logoutButtonRef.current.getBoundingClientRect();
        setModalPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
        setIsConfirmModalOpen(true);
      }
      return;
    }

    onPageChange((current) => (current === tileId ? null : tileId));
    setHoveredTile(tileId);
  };
  
  const handleConfirmLogout = () => {
    onLogout();
  };
  
  const handleOpenChat = (request) => {
    setActiveChat({ isOpen: true, request: request });
  };

  const handleCloseChat = () => {
    setActiveChat(prev => ({ ...prev, isOpen: false }));
    setTimeout(() => setActiveChat({ isOpen: false, request: null }), 600);
  };
  
  const gliderTargetId = hoveredTile || activePage;

  return (
    <>
      <div className="dashboard-viewport">
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
        </div>
      </div>
      
      <LogoutConfirmation
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmLogout}
        position={modalPosition}
      />
    </>
  );
}

export default Dashboard;