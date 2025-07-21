import React from 'react';

// импорт всех компонентов страниц, которые могут быть отображены
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import MyRequestsPage from '../pages/MyRequestsPage/MyRequestsPage';
import NewRequestPage from '../pages/NewRequestPage/NewRequestPage';
import EventsPage from '../pages/EventsPage/EventsPage';
import AllUsersPage from '../pages/AllUsersPage/AllUsersPage';
import CreateEventPage from '../pages/CreateEventPage/CreateEventPage';
import ReviewRequestsPage from '../pages/ReviewRequestsPage/ReviewRequestsPage';

// права доступа к страницам в зависимости от роли пользователя
const pageAccess = {
  'profile': ['student', 'curator'],
  'my-requests': ['student'],
  'new-request': ['student'],
  'events': ['student', 'curator'],
  'all-users': ['curator'],
  'create-event': ['curator'],
  'review-requests': ['curator'],
};


function PageComponent({ pageId, userRole, userLogin, onOpenChat }) {
  // проверяем, имеет ли текущий пользователь доступ к запрашиваемой странице
  const hasAccess = pageAccess[pageId] && pageAccess[pageId].includes(userRole);

  // если доступа нет, отображаем сообщение об ошибке
  if (!hasAccess) {
    return <div style={{padding: '40px'}}><h1>Доступ запрещен</h1></div>;
  }
  return (
    <> 
      {(() => {
        // в зависимости от id страницы, возвращаем соответствующий компонент
        switch (pageId) {
          case 'profile':
            return <ProfilePage userRole={userRole} userLogin={userLogin} />;
          
          case 'my-requests':
            return <MyRequestsPage userLogin={userLogin} onOpenChat={onOpenChat} />;
          
          case 'new-request':
            return <NewRequestPage userLogin={userLogin}/>;
          
          case 'events':
            return <EventsPage userRole={userRole} userLogin={userLogin} />;
            
          case 'all-users':
            return <AllUsersPage userRole={userRole} userLogin={userLogin} />;
          
          case 'create-event':
            return <CreateEventPage userLogin={userLogin} />;
          
          case 'review-requests':
            return <ReviewRequestsPage userLogin={userLogin} onOpenChat={onOpenChat} />;
          
          // если id страницы не совпал ни с одним из кейсов, показываем ошибку
          default:
            return <div style={{padding: '40px'}}><h1>Страница не найдена</h1></div>;
        }
      })()}
    </>
  );
}

export default PageComponent;