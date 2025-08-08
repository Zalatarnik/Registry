import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../notification/NotificationContext';
import { useTranslation } from '../common/useTranslation';
import './Chat.css';

// иконки
import { ReactComponent as ExitIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as SendIcon } from '../../icons/send-icon.svg';

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

    // эффект для блокировки прокрутки основного контента, пока чат открыт
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        // возвращаем прокрутку при размонтировании компонента
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    // функция для плавной прокрутки вниз
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // эффект для загрузки и периодического обновления сообщений
    useEffect(() => {
        if (!request?.id) return; // выходим, если нет id заявки

        const fetchMessages = async () => {
            try {
                const response = await fetch(
                `http://localhost:8000/api/requests/${request.id}/chat`,
                { credentials: 'include' } 
                );
                if (!response.ok) throw new Error('Не удалось загрузить сообщения чата.');
                const data = await response.json();
                
                // обновляем состояние только если пришли новые данные, чтобы избежать лишних ререндеров
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

    // обработчик для плавного закрытия чата
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    };

    // обработчик отправки нового сообщения
    const handleSendMessage = async (e) => {
        e.preventDefault(); // предотвращаем перезагрузку страницы
        if (!newMessage.trim()) return; // не отправляем пустое сообщение

        try {
        const response = await fetch(
        `http://localhost:8000/api/requests/${request.id}/chat`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: newMessage, sender_login: userLogin })
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
            <div className={`chat-popup-container ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="chat-popup-header">
                    <h3>{t('chat.title', { event: request.eventName || request.id })}</h3>
                    <button onClick={handleClose} className="chat-close-button" title={t('chat.button.close')}><ExitIcon /></button>
                </div>
                <div className="chat-popup-messages">
                    {isLoading && messages.length === 0 ? (
                        <p className="chat-placeholder">{t('chat.loading')}</p>
                    ) : messages.length > 0 ? (
                        // рендерим список сообщений
                        messages.map(msg => (
                            <div
                                key={msg.id}
                                // выравниваем свои сообщения справа, чужие - слева
                                className={`message-bubble-wrapper ${msg.sender.login === userLogin ? 'my-message' : 'other-message'} ${msg.isNew ? 'new-message' : ''}`}
                            >
                                <div
                                  className="message-bubble"
                                  onMouseMove={handleMouseMove}
                                >
                                    <div className="message-sender">{`${msg.sender.first_name} ${msg.sender.last_name}`}</div>
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
                            placeholder={t('chat.input.placeholder')}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="chat-submit-btn"><span><SendIcon /></span></button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ChatView;