import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNotification } from '../../notification/NotificationContext';
import './ReviewRequestsPage.css';
import ClockwiseLoader from '../../components/common/Loader';
import ChatView from '../../components/Chat/Chat';

// иконки
import { ReactComponent as ChatIcon } from '../../icons/chat-icon.svg';
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as ApproveIcon } from '../../icons/accept-icon.svg';
import { ReactComponent as RejectIcon } from '../../icons/reject-icon.svg';
import { ReactComponent as ExportIcon } from '../../icons/upload-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ КНОПКИ

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;

// функция для анимирования радиусов углов элемента
function animateRadii(btn) {
  // получаем состояние анимации элемента
  const state = btn._animationState;
  if (!state) return;

  let isAnimationNeeded = false;
  // перебираем все углы (tl, tr, br, bl)
  for (const corner in state.current) {
    // вычисляем разницу между целевым и текущим значением радиуса
    const diff = state.target[corner] - state.current[corner];
    
    // если разница существенна, продолжаем анимацию
    if (Math.abs(diff) > 0.01) {
      isAnimationNeeded = true;
      // плавно приближаем текущее значение к целевому
      state.current[corner] += diff * EASING_FACTOR;
    } else {
      // если разница мала, присваиваем целевое значение
      state.current[corner] = state.target[corner];
    }
  }

  // применяем вычисленные радиусы к стилю элемента
  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;

  // если анимация все еще нужна, запрашиваем следующий кадр
  if (isAnimationNeeded) {
    requestAnimationFrame(() => animateRadii(btn));
  } else {
    // иначе, помечаем, что анимация завершена
    state.isAnimating = false;
  }
}

// обработчик движения мыши для создания эффектов
const handleMouseMoveForEffect = (e) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // передаем координаты мыши в css переменные для градиентного эффекта
  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);
  
  // если это интерактивная кнопка, запускаем анимацию радиусов
  if (el.classList.contains('interactive-button')) {
    // инициализируем состояние анимации, если его нет
    if (!el._animationState) {
      el._animationState = {
        isAnimating: false,
        current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
        target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      };
    }
    const state = el._animationState;
    const { width, height } = rect;
    const maxRadius = 25;
    const diagonal = Math.sqrt(width**2 + height**2);
    
    // функция для расчета радиуса в зависимости от удаленности курсора от угла
    const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
    
    // вычисляем целевые радиусы для каждого угла
    state.target.tl = calculateRadius(0, 0);
    state.target.tr = calculateRadius(width, 0);
    state.target.br = calculateRadius(width, height);
    state.target.bl = calculateRadius(0, height);
    
    // запускаем анимацию, если она не активна
    if (!state.isAnimating) {
      state.isAnimating = true;
      requestAnimationFrame(() => animateRadii(el));
    }
  }
};

// обработчик увода мыши с кнопки
const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
  // проверяем, является ли элемент интерактивной кнопкой
  if(btn.classList.contains('interactive-button')) {
    const state = btn._animationState;
    if (!state) return;
    
    // сбрасываем целевые радиусы к значениям по умолчанию
    state.target.tl = DEFAULT_RADIUS;
    state.target.tr = DEFAULT_RADIUS;
    state.target.br = DEFAULT_RADIUS;
    state.target.bl = DEFAULT_RADIUS;
    
    // запускаем анимацию возврата в исходное состояние
    if (!state.isAnimating) {
      state.isAnimating = true;
      requestAnimationFrame(() => animateRadii(btn));
    }
  }
};

// скачивание файла по url
const downloadFile = (fileUrl, fileName) => {
    // формируем полный url к файлу
    const fullUrl = `${API_BASE_URL}${fileUrl}`;
    // создаем временную ссылку
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// стили для статусов заявок
const statusStyleMap = {
    'Все': 'btn-style-neutral',
    'Одобрено': 'btn-style-approved',
    'Отклонено': 'btn-style-rejected',
    'На рассмотрении': 'btn-style-pending'
};

const RequestReviewCard = memo(({ request, isActive, isExpanded, onCardClick, onMouseEnter, onApprove, onReject, onDownload, onOpenChat, innerRef, onSelect, isSelected }) => {
    const cardClassName = ['request-card', isActive && 'is-active', isExpanded && 'is-expanded', isSelected && 'is-selected-card'].filter(Boolean).join(' ');
    
    const handleActionClick = (e, callback, ...args) => {
        e.stopPropagation();
        if (typeof callback === 'function') {
            callback(...args);
        }
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
        if (typeof onSelect === 'function') {
            onSelect();
        }
    };

    // фио студента
    const studentFullName = `${request.owner.lastName} ${request.owner.firstName} ${request.owner.middleName || ''}`.trim();

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={onCardClick}>
                <div className="card-header">
                    <div className="selection-checkbox-wrapper" onClick={handleCheckboxClick}>
                        <input 
                            type="checkbox" 
                            className="selection-checkbox"
                            checked={isSelected}
                            readOnly
                        />
                    </div>
                    <div className="header-content">
                        <h3>{request.event_name}</h3>
                        <div className="card-date">От: {studentFullName} | Подана: {new Date(request.event_date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        <div className="card-actions">
                            <button className="interactive-button is-icon btn-style-neutral" title="Скачать файлы" onClick={(e) => handleActionClick(e, onDownload, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><DownloadIcon /></span></button>
                            {/* показываем кнопки действий только для заявок "на рассмотрении" */}
                            {request.status === 'На рассмотрении' && (
                                <>
                                    <button className="interactive-button is-icon btn-style-approve" title="Одобрить" onClick={(e) => handleActionClick(e, onApprove, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ApproveIcon /></span></button>
                                    <button className="interactive-button is-icon btn-style-rejected" title="Отклонить" onClick={(e) => handleActionClick(e, onReject, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><RejectIcon /></span></button>
                                </>
                            )}
                        </div>
                        <button className="interactive-button is-icon btn-style-chat" title="Открыть чат" onClick={(e) => handleActionClick(e, onOpenChat, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ChatIcon /></span></button>
                        <button className={`interactive-button is-status-button ${statusStyleMap[request.status]}`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{request.status}</span></button>
                    </div>
                </div>
            </div>
            {/* детальная информация, видимая при раскрытии карточки */}
            <div className="card-details-wrapper">
                <div className="card-body">
                    <div className="detail-item"><span className="detail-label">Руководитель:</span> {request.leader}</div>
                    <div className="detail-item"><span className="detail-label">Организатор:</span> {request.organizer}</div>
                    <div className="detail-item"><span className="detail-label">Место:</span> {request.location}</div>
                    <div className="detail-item"><span className="detail-label">Статус мероприятия:</span> {request.event_status_level}</div>
                </div>
            </div>
        </div>
    );
});

// основной компонент страницы просмотра заявок
export default function ReviewRequestsPage({ userLogin }) {
    // состояние для хранения списка всех заявок
    const [requests, setRequests] = useState([]);
    // состояние для индикации загрузки данных
    const [isLoading, setIsLoading] = useState(true);
    // хук для отображения уведомлений
    const { addNotification } = useNotification();
    // состояние для id карточки, на которую наведен курсор
    const [hoveredCardId, setHoveredCardId] = useState(null);
    // состояние для id раскрытой карточки
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    // состояние для поискового запроса
    const [searchTerm, setSearchTerm] = useState('');
    // состояние для активного фильтра по статусу
    const [activeFilter, setActiveFilter] = useState('Все');
    const inputRef = useRef(null);
    // состояние для отслеживания активного чата
    const [activeChatRequest, setActiveChatRequest] = useState(null);
    // состояние для хранения id выбранных заявок
    const [selectedRequests, setSelectedRequests] = useState([]);

    // эффект для загрузки заявок при монтировании компонента
    useEffect(() => {
        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:8000/api/requests`);
                if (!response.ok) throw new Error('Не удалось загрузить заявки');
                const data = await response.json();
                setRequests(data);
            } catch (error) {
                addNotification(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequests();
    }, [addNotification]);

    const filteredRequests = useMemo(() => {
        return requests
            .filter(request => (activeFilter === 'Все' ? true : request.status === activeFilter))
            .filter(request =>
                request.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${request.owner.lastName} ${request.owner.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [requests, searchTerm, activeFilter]);

    const gliderTargetId = expandedCardId ? null : hoveredCardId;
    // определяет активную карточку
    const activeCardId = expandedCardId ? expandedCardId : gliderTargetId;

    useEffect(() => {
        const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`,
                opacity: 1
            });
        } else {
            // плавно скрываем фон, если курсор не на карточке
            setGliderStyle(prevStyle => ({ ...prevStyle, opacity: 0 }));
        }
    }, [gliderTargetId, filteredRequests]); // перезапускаем при смене цели или списка

    // обработчик клика по карточке для раскрытия/сворачивания
    const handleCardClick = (clickedId) => setExpandedCardId(prevId => (prevId === clickedId ? null : clickedId));

    // обработчик для выбора/снятия выбора с заявки
    const handleSelectRequest = (requestId) => {
        setSelectedRequests(prevSelected => {
            // если заявка уже выбрана, убираем ее из массива
            if (prevSelected.includes(requestId)) {
                return prevSelected.filter(id => id !== requestId);
            }
            // иначе, добавляем ее ID в массив
            else {
                return [...prevSelected, requestId];
            }
        });
    };

    // обработчик скачивания всех файлов для заявки
    const handleDownloadAll = (request) => {
        if (!request.files || request.files.length === 0) {
            addNotification('У этой заявки нет приложенных файлов.', 'info');
            return;
        }
        addNotification(`Начинается скачивание ${request.files.length} файлов...`, 'success');
        // скачиваем файлы с небольшой задержкой, чтобы избежать блокировки браузером
        request.files.forEach((file, index) => {
            setTimeout(() => { downloadFile(file.url, file.name); }, index * 300);
        });
    };

    // одобрение/отклонение (общая)
    const handleAction = async (id, action) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/requests/${id}/${action}`, { method: 'PUT' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Действие не удалось');
            }
            const result = await response.json();
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: result.status } : r));
            addNotification(`Заявка успешно ${action === 'approve' ? 'одобрена' : 'отклонена'}.`, 'success');
        } catch (error) {
            addNotification(error.message, 'error');
        }
    };
    
    // конкретные обработчики для одобрения и отклонения
    const handleApprove = (id) => handleAction(id, 'approve');
    const handleReject = (id) => handleAction(id, 'reject');

    // обработчики для открытия и закрытия чата
    const handleOpenChat = (request) => setActiveChatRequest({ id: request.id, eventName: request.event_name });
    const handleCloseChat = () => setActiveChatRequest(null);
    
    // кнопка выгрузки, пока что стоит заглушка
    const handleExport = () => {
        alert('Функция выгрузки всех заявок находится в разработке.');
    };

    // обработчик для кнопки "Выгрузить выбранные"
    const handleExportSelected = () => {
        if (selectedRequests.length === 0) {
            addNotification("Сначала выберите заявки для выгрузки.", "info");
            return;
        }
        alert(`Выбраны заявки с ID: ${selectedRequests.join(', ')}. \nФункция выгрузки в разработке.`);
    };

    return (
        <>
            {/* рендерим чат, если он активен */}
            {activeChatRequest && (<ChatView userLogin={userLogin} request={activeChatRequest} onClose={handleCloseChat} />)}
            
            <div className="review-requests-container">
                <h1>Все заявки</h1>
                
                {!isLoading && (
                    <div className="filter-container">
                        <div className="search-bar-wrapper">
                            <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                <span><SearchIcon /><input ref={inputRef} type="text" placeholder="Поиск по названию или студенту..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                            </div>
                        </div>
                        <div className="filter-buttons">
                            {/* рендерим кнопки фильтров по статусам */}
                            {Object.keys(statusStyleMap).map(status => (
                                <button key={status} className={`interactive-button ${activeFilter === status ? 'is-active-filter' : ''} ${statusStyleMap[status]}`} onClick={() => setActiveFilter(status)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                    <span>{status}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="page-content">
                    {isLoading ? (
                        // показываем загрузчик во время получения данных
                        <div className="page-loader-container"><ClockwiseLoader /></div>
                    ) : (
                        <div className="requests-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                            <div className="list-glider" style={gliderStyle}></div>
                            
                            {filteredRequests.length > 0 ? (
                                // рендерим список отфильтрованных заявок
                                filteredRequests.map((request, index) => (
                                    <React.Fragment key={request.id}>
                                        <RequestReviewCard
                                            innerRef={node => node ? cardElements.current.set(request.id, node) : cardElements.current.delete(request.id)}
                                            request={request}
                                            isActive={activeCardId === request.id}
                                            isExpanded={expandedCardId === request.id}
                                            onCardClick={() => handleCardClick(request.id)}
                                            onMouseEnter={() => { if(!expandedCardId) setHoveredCardId(request.id); }}
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                            onDownload={handleDownloadAll}
                                            onOpenChat={handleOpenChat}
                                            onSelect={() => handleSelectRequest(request.id)}
                                            isSelected={selectedRequests.includes(request.id)}
                                        />
                                        {/* добавляем разделитель между карточками */}
                                        {index < filteredRequests.length - 1 && <div className="request-divider" />}
                                    </React.Fragment>
                                ))
                            ) : (
                                // сообщение, если заявок не найдено
                                <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>Заявки с выбранными фильтрами не найдены.</div>
                            )}
                        </div>
                    )}
                </div>

                {!isLoading && (
                    <div className="export-button-container">
                        <button 
                            className="interactive-button btn-style-neutral" 
                            onClick={handleExportSelected} 
                            onMouseMove={handleMouseMoveForEffect} 
                            onMouseLeave={handleButtonLeave}
                            disabled={selectedRequests.length === 0}
                        >
                            <span>Выгрузить выбранные ({selectedRequests.length})</span>
                        </button>
                        
                        <button className="interactive-button btn-style-export" onClick={handleExport} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                            <span><ExportIcon/> Выгрузить все</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}