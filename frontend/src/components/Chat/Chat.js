import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../notification/NotificationContext';
import { useTranslation } from '../common/useTranslation';
import './Chat.css';

// иконки
import { ReactComponent as ExitIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as SendIcon } from '../../icons/send-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

const handleMouseMove = (e) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);
};

const ChatView = ({ userLogin, request, onClose }) => {
    const { t } = useTranslation();
    // состояние для хранения массива сообщений
    const [messages, setMessages] = useState([]);
    // состояние для текста в поле ввода нового сообщения
    const [newMessage, setNewMessage] = useState('');
    // состояние для индикации начальной загрузки сообщений
    const [isLoading, setIsLoading] = useState(false);
    // состояние для плавной анимации закрытия чата
    const [isClosing, setIsClosing] = useState(false);
    // хук для отображения уведомлений
    const { addNotificationOnce } = useNotification();
    const messagesEndRef = useRef(null);
    const modalRef = useRef(null);
    const dragInfo = useRef({});

    const [allUsers, setAllUsers] = useState(new Map());
    const [hoveredCurator, setHoveredCurator] = useState(null);
    const [selectedCuratorLogin, setSelectedCuratorLogin] = useState(null);
    const curatorTabsRef = useRef(null);

    const [modalPosition, setModalPosition] = useState({
        top: '-1000px',
        left: '-1000px',
        transform: 'none'
    });

    // эффект для блокировки прокрутки основного контента, пока чат открыт
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        // возвращаем прокрутку при размонтировании компонента
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    useEffect(() => {
        if (modalRef.current) {
            const modalNode = modalRef.current;
            const { width, height } = modalNode.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;
            const initialTop = (innerHeight - height) / 2;
            const initialLeft = (innerWidth - width) / 2;
            setModalPosition({
                top: `${Math.max(0, initialTop)}px`,
                left: `${Math.max(0, initialLeft)}px`,
                transform: 'none'
            });
        }
    }, []);

    // эффект для загрузки всех пользователей для получения их ролей и аватаров
    useEffect(() => {
        const fetchAllUsers = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/all`, { credentials: 'include' });
                if (!response.ok) throw new Error(t('chat.error.loadUsers'));
                const usersData = await response.json();
                const usersMap = new Map(usersData.map(user => [user.login, user]));
                setAllUsers(usersMap);
            } catch (error) {
                console.error("Ошибка при загрузке пользователей:", error);
            }
        };
        fetchAllUsers();
    }, []);

    useEffect(() => {
        const element = curatorTabsRef.current;
        if (element) {
            const onWheel = (e) => {
                if (e.deltaY === 0) return;
                e.preventDefault();
                element.scrollTo({
                    left: element.scrollLeft + e.deltaY,
                    behavior: 'smooth'
                });
            };
            element.addEventListener('wheel', onWheel);
            return () => element.removeEventListener('wheel', onWheel);
        }
    }, []);

    // функция для плавной прокрутки вниз
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleDragMove = useCallback((e) => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
        e.preventDefault();
    
        const modalNode = modalRef.current;
        const { height, width } = modalNode.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;
    
        let newTop = e.clientY - dragInfo.current.offsetY;
        let newLeft = e.clientX - dragInfo.current.offsetX;
    
        newTop = Math.max(0, Math.min(newTop, innerHeight - height));
        newLeft = Math.max(0, Math.min(newLeft, innerWidth - width));
    
        modalNode.style.top = `${newTop}px`;
        modalNode.style.left = `${newLeft}px`;
        modalNode.style.transform = 'none';
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
    
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    
        const modalNode = modalRef.current;
        modalNode.style.transition = 'top 0.3s ease-out, left 0.3s ease-out';
    
        const rect = modalNode.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const snapThreshold = 60;
        const edgeGap = 20;
    
        let finalTop = rect.top;
        let finalLeft = rect.left;
    
        if (rect.top < snapThreshold && rect.top > -snapThreshold) {
            finalTop = edgeGap;
        } else if (vh - rect.bottom < snapThreshold && vh - rect.bottom > -snapThreshold) {
            finalTop = vh - rect.height - edgeGap;
        }
    
        if (rect.left < snapThreshold && rect.left > -snapThreshold) {
            finalLeft = edgeGap;
        } else if (vw - rect.right < snapThreshold && vw - rect.right > -snapThreshold) {
            finalLeft = vw - rect.width - edgeGap;
        }
        
        setModalPosition({
            top: `${finalTop}px`,
            left: `${finalLeft}px`,
            transform: 'none'
        });
        
        dragInfo.current.isDragging = false;
    }, [handleDragMove]);

    const handleDragStart = (e) => {
        if (e.button !== 0 || !modalRef.current) return;
        
        e.preventDefault();
        const modalNode = modalRef.current;
        modalNode.style.transition = 'none';
    
        const rect = modalNode.getBoundingClientRect();
        dragInfo.current = {
            isDragging: true,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
        
        document.body.style.cursor = 'grabbing';
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

    // эффект для загрузки и периодического обновления сообщений
    useEffect(() => {
        if (!request?.id) return; // выходим, если нет id заявки

        const fetchMessages = async () => {
            try {
                const response = await fetch(
                `${API_BASE_URL}/api/requests/${request.id}/chat`,
                { credentials: 'include' } 
                );
                if (!response.ok) throw new Error(t('chat.error.load'));
                const data = await response.json();
                
                // обновляем состояние только если пришли новые данные
                setMessages(prevMessages => {
                    const prevIds = new Set(prevMessages.map(m => m.id));
                    const hasNewData = data.length !== prevMessages.length || !data.every(m => prevIds.has(m.id));
                    if (hasNewData) {
                        // помечаем новые сообщения для анимации
                        return data.map(msg => ({ ...msg, isNew: !prevIds.has(msg.id) }));
                    }
                    return prevMessages; // возвращаем старый массив, если нет изменений
                });
            } catch (error) {
                // показываем ошибку только при первой загрузке
                if (messages.length === 0) {
                    addNotificationOnce(error.message, 'error');
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        // запускаем загрузку
        setIsLoading(true);
        fetchMessages();
        
        // устанавливаем интервал для опроса новых сообщений каждые 5 секунд
        const intervalId = setInterval(fetchMessages, 5000);
        
        // очищаем интервал
        return () => clearInterval(intervalId);
    }, [request, addNotificationOnce]); // зависимости эффекта

    // эффект для прокрутки вниз при получении новых сообщений
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const currentUser = useMemo(() => allUsers.get(userLogin), [allUsers, userLogin]);

    // Определяем студента, связанного с заявкой
    const studentParticipant = useMemo(() => {
        if (!allUsers.size || !request?.User?.login) return null;
        return request.User || null;
    }, [allUsers, request]);

    // Определяем кураторов, которые отправили сообщения по этой заявке
    const curators = useMemo(() => {
        if (currentUser?.role === 'curator' || !messages || allUsers.size === 0) return [];
        const senderLogins = new Set(messages.map(msg => msg.sender.login));
        const uniqueCurators = [];
        for (const login of senderLogins) {
            const user = allUsers.get(login);
            if (user && user.role === 'curator') {
                uniqueCurators.push(user);
            }
        }
        return uniqueCurators;
    }, [messages, allUsers, currentUser]);

    // Автоматический выбор первого куратора, если он есть
    useEffect(() => {
        if (curators.length > 0 && !selectedCuratorLogin) {
            setSelectedCuratorLogin(curators[0].login);
        } else if (curators.length === 0) {
            setSelectedCuratorLogin(null);
        }
    }, [curators, selectedCuratorLogin]);

    const handleCuratorSelect = (curatorLogin) => {
        setSelectedCuratorLogin(curatorLogin);
    };

    // Фильтруем сообщения в зависимости от выбранного куратора
    const filteredMessages = useMemo(() => {
        if (currentUser?.role === 'curator' && studentParticipant) {
            // Для куратора показываем сообщения между ним и студентом
            return messages.filter(msg => 
                (msg.sender.login === userLogin && msg.recipient?.login === studentParticipant.login) ||
                (msg.sender.login === studentParticipant.login && (msg.recipient?.login === userLogin || !msg.recipient))
            );
         } else if (currentUser?.role === 'student' && selectedCuratorLogin) {
            // Для студента показываем сообщения с выбранным куратором
            return messages.filter(msg => 
                (msg.sender.login === userLogin && msg.recipient?.login === selectedCuratorLogin) ||
                (msg.sender.login === selectedCuratorLogin && (msg.recipient?.login === userLogin || !msg.recipient))
            );
        }
        return [];
    }, [messages, selectedCuratorLogin, userLogin, currentUser, studentParticipant]);

    const selectedCurator = useMemo(() => {
        if (!selectedCuratorLogin) return null;
        return curators.find(c => c.login === selectedCuratorLogin);
    }, [selectedCuratorLogin, curators]);

    const getSenderName = useCallback((sender) => {
        const fullUser = allUsers.get(sender.login);
        if (fullUser) {
            return `${fullUser.firstName} ${fullUser.lastName}`;
        }
        return `${sender.first_name || ''} ${sender.last_name || ''}`.trim();
    }, [allUsers]);

    // обработчик для плавного закрытия чата
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    };

    // обработчик отправки нового сообщения
    const handleSendMessage = async (e) => {
        e.preventDefault(); // предотвращаем перезагрузку страницы
        if (!newMessage.trim()) return; // не отправляем пустое сообщение

        const bodyPayload = {
            text: newMessage,
            sender_login: userLogin,
        };

        if (currentUser?.role === 'student' && !selectedCuratorLogin) {
            addNotificationOnce(t('chat.error.chooseCurator'), 'error');
            return;
        }
        if (currentUser?.role === 'curator' && !studentParticipant) {
            addNotificationOnce(t('chat.error.chooseStudent'), 'error');
            return;
        }

        if (currentUser?.role === 'student') {
            bodyPayload.recipient_login = selectedCuratorLogin;
        } else if (currentUser?.role === 'curator') {
            bodyPayload.recipient_login = studentParticipant.login;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/requests/${request.id}/chat`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyPayload)
                }
            );
            if (!response.ok) throw new Error(t('chat.error.load'));
            
            const sentMessage = await response.json();
            setMessages(prevMessages => [...prevMessages, { ...sentMessage, isNew: true }]);
            setNewMessage(''); // очищаем поле ввода
        } catch (error) {
            addNotificationOnce(error.message, 'error');
        }
    };

    return ReactDOM.createPortal(
        <div className={`chat-popup-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
            <div
                ref={modalRef}
                style={modalPosition}
                className={`chat-popup-container ${isClosing ? 'closing' : ''}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="chat-popup-header" onMouseDown={handleDragStart}>
                    <h3>{t('chat.title', { event: request.eventName || request.id })}</h3>
                    <button onClick={handleClose} className="chat-close-button" title={t('chat.button.close')}><ExitIcon /></button>
                </div>

                {currentUser?.role === 'curator' && studentParticipant && (
                    <div className="chat-curator-tabs">
                        <div className="student-info-tab">
                            <span className="student-info-label">{t('chat.youChatWith')}</span>
                            <div className="student-info-card">
                                <img
                                    src={`${API_BASE_URL}${studentParticipant.avatar}`}
                                    alt={`${studentParticipant.firstName} ${studentParticipant.lastName}`}
                                    className="curator-avatar"
                                />
                                <span className="curator-name-label active">
                                    {`${studentParticipant.firstName} ${studentParticipant.lastName}`}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {currentUser?.role === 'student' && (
                    <div
                        ref={curatorTabsRef}
                        className="chat-curator-tabs"
                        onMouseLeave={() => setHoveredCurator(null)}
                    >
                        {curators.length > 0 ? (
                            curators.map(curator => {
                                const isSelected = selectedCuratorLogin === curator.login;
                                const isHovered = hoveredCurator === curator.login;
                                const isActive = isSelected || isHovered;
                                return (
                                    <button
                                        key={curator.login}
                                        className={`curator-tab-button ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                                        onMouseEnter={() => setHoveredCurator(curator.login)}
                                        onClick={() => handleCuratorSelect(curator.login)}
                                        title={`${curator.firstName} ${curator.lastName}`}
                                    >
                                        <img
                                            src={`${API_BASE_URL}${curator.avatar}`}
                                            alt={`${curator.firstName} ${curator.lastName}`}
                                            className="curator-avatar"
                                        />
                                        <span className="curator-name-label">
                                            {`${curator.firstName} ${curator.lastName}`}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            <p style={{textAlign: 'center', color: '#6c757d', padding: '10px'}}>{t('chat.noCurators')}</p>
                        )}
                    </div>
                )}

                <div className="chat-popup-messages">
                    {isLoading && messages.length === 0 ? (
                        <p className="chat-placeholder">{t('chat.loading')}</p>
                    ) : messages.length > 0 ? (
                        // рендерим список сообщений
                        filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                className={`message-bubble-wrapper ${msg.sender.login === userLogin ? 'my-message' : 'other-message'} ${msg.isNew ? 'new-message' : ''}`}
                            >
                                <div
                                    className="message-bubble"
                                    onMouseMove={handleMouseMove}
                                >
                                    <div className="message-sender">{getSenderName(msg.sender)}</div>
                                    <div className="message-text">{msg.text}</div>
                                    <div className="message-time">{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        // сообщение, если чат пуст
                        <p className="chat-placeholder">{t('chat.empty')}</p>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form className="chat-popup-input-form" onSubmit={handleSendMessage}>
                    <div className="chat-input-wrapper">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={
                                currentUser?.role === 'curator' && studentParticipant
                                    ? t('chat.input.toUser', { name: `${studentParticipant.firstName}` })
                                    : selectedCurator
                                    ? t('chat.input.toUser', { name: `${selectedCurator.firstName}` })
                                    : t('chat.input.placeholder')
                            }
                            autoFocus
                            disabled={currentUser?.role === 'student' && curators.length === 0}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="chat-submit-btn"
                        disabled={currentUser?.role === 'student' && curators.length === 0}
                    >
                        <span><SendIcon /></span>
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ChatView;