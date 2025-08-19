import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom';

import ClockwiseLoader from '../../components/common/Loader';
import './Notifications.css';

import defaultEventImage from '../../images/event-default.jpg';

// иконки
import { ReactComponent as AddIcon } from '../../icons/add-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as ExitIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as UsersIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as GroupIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

const useNotification = () => ({
    addNotification: (msg, type) => console.log(`Notification (${type}): ${msg}`)
});

const EASING_FACTOR = 0.15;
const DEFAULT_RADIUS = 0;

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

const handleMouseMoveForEffect = (e) => {
    const el = e.currentTarget;
    if (!el.classList.contains('interactive-button') && !el.classList.contains('form-submit-btn') && !el.classList.contains('form-secondary-btn')) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    if (!el._animationState) {
        el._animationState = {
            isAnimating: false,
            current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
            target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS }
        };
    }

    const state = el._animationState;
    const { width, height } = rect;
    const maxRadius = 25;
    const diagonal = Math.sqrt(width ** 2 + height ** 2);

    const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / diagonal), 3));

    state.target.tl = calculateRadius(0, 0);
    state.target.tr = calculateRadius(width, 0);
    state.target.br = calculateRadius(width, height);
    state.target.bl = calculateRadius(0, height);

    if (!state.isAnimating) {
        state.isAnimating = true;
        requestAnimationFrame(() => animateRadii(el));
    }
};

const handleButtonLeave = (e) => {
    const btn = e.currentTarget;
     if (!btn.classList.contains('interactive-button') && !btn.classList.contains('form-submit-btn') && !btn.classList.contains('form-secondary-btn')) return;

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

const StudentEventCard = ({ event, onSignUp, isRegistered, isDetailed, onCloseRequest, onDownload }) => {
    const cardClassName = [
        'event-card-student',
        isDetailed && 'is-detailed-view'
    ].filter(Boolean).join(' ');

    const handleHeaderClick = (e) => {
        if (isDetailed) {
            e.stopPropagation();
            onCloseRequest();
        }
    };

    const handleActionClick = (e, action) => {
        e.stopPropagation();
        action(event, e);
    };

    return (
        <div className={cardClassName}>
            <div className="student-card-inner">
                <img src={defaultEventImage} alt="Event texture" className="cover-image" />
                <div className={`registration-status-badge ${isRegistered ? 'registered' : 'unregistered'}`}>
                    {isRegistered ? 'Вы записаны' : 'Нет записи'}
                </div>
                <div className={`recruitment-status-badge status-${event.recruitment_status === 'Активен' ? 'active' : 'completed'}`}>
                    {event.recruitment_status}
                </div>
                <div className="details-container">
                    <div className="details-header" onClick={handleHeaderClick}>
                        <div className="details-title-section">
                            <h4>{event.eventName}</h4>
                            <div className="card-date">{new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <div className="details-icons">
                            <div className="icon-item" title="Макс. участников">
                                <UsersIcon />
                                <span>{event.max_participants || '∞'}</span>
                            </div>
                            <div className="icon-item" title="Макс. чел. в группе">
                                <GroupIcon />
                                <span>{event.max_group_size || 1}</span>
                            </div>
                        </div>
                    </div>
                    <div className="details-body">
                        <div className="detail-description">{event.description}</div>
                        <div className="detail-item"><span className="detail-label">Руководитель:</span> {event.leader}</div>
                        <div className="detail-item"><span className="detail-label">Организатор:</span> {event.organizer}</div>
                        <div className="detail-item"><span className="detail-label">Место:</span> {event.location}</div>
                        <div className="detail-item"><span className="detail-label">Статус:</span> {event.eventStatus}</div>
                        <div className="detail-item"><span className="detail-label">Дата:</span> {new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="details-actions">
                        <button
                            className="interactive-button btn-style-neutral is-icon"
                            onClick={(e) => handleActionClick(e, onDownload)}
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                            title="Скачать материалы"
                        >
                            <span><DownloadIcon /></span>
                        </button>
                        <button
                            className="interactive-button btn-style-register"
                            onClick={(e) => handleActionClick(e, onSignUp)}
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                            disabled={isRegistered}
                        >
                            <span><AddIcon /> {isRegistered ? 'Вы уже записаны' : 'Записаться'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailedEventContainer = ({ event, onSignUp, onDownload, isRegistered, isClosing, isExpanded, onExpand, onCloseRequest }) => (
    <div
        className={`detailed-event-container ${isClosing ? 'is-closing' : ''}`}
        onClick={!isExpanded ? onExpand : undefined}
    >
        <StudentEventCard
            event={event}
            onSignUp={onSignUp}
            onDownload={onDownload}
            isRegistered={isRegistered}
            isDetailed={isExpanded}
            onCloseRequest={onCloseRequest}
        />
    </div>
);

const FormField = ({ label, children }) => (
    <div className="form-field">
        <label>{label}</label>
        <div className="input-wrapper">{children}</div>
    </div>
);

// всплывающее окно для записи на мероприятие
const SignUpModal = ({ event, onClose, onConfirm, currentUser, position }) => {
    const [isClosing, setIsClosing] = useState(false);
    const { addNotification } = useNotification();
    const getUserFullName = (user) => user ? [user.lastName, user.firstName, user.patronymic || user.middleName].filter(Boolean).join(' ') : '';
    const [participants, setParticipants] = useState(() => [
        { id: 1, fullName: getUserFullName(currentUser), group: currentUser.group || '' }
    ]);

    useEffect(() => {
    if (!currentUser) return;
    setParticipants(prev => {
        if (prev.length && (prev[0].fullName?.trim() || prev[0].group?.trim())) return prev;
        return [{
        fullName: getUserFullName(currentUser),
        group: currentUser.group || ''
        }];
    });
    }, [currentUser]);

    const nextId = useRef(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef(null);
    const prevHeight = useRef(null);
    const [dynamicPosition, setDynamicPosition] = useState(position);

    useEffect(() => {
        if (modalRef.current) {
            const currentHeight = modalRef.current.offsetHeight;
            const oldHeight = prevHeight.current;
            if (oldHeight !== null && currentHeight !== oldHeight) {
                const heightDifference = currentHeight - oldHeight;
                setDynamicPosition(pos => {
                    if (!pos || typeof pos.top !== 'string') return pos;
                    return {
                        ...pos,
                        top: `${parseFloat(pos.top) - heightDifference}px`
                    };
                });
            }
            prevHeight.current = currentHeight;
        }
    }, [participants.length]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const addParticipant = () => {
        const maxGroupSize = event.max_group_size || 5;
        if (participants.length < maxGroupSize) {
            setParticipants([...participants, { id: nextId.current++, fullName: '', group: '' }]);
        } else {
            addNotification(`Максимальный размер группы: ${maxGroupSize} чел.`, 'info');
        }
    };

    const removeParticipant = (index) => {
        if (index === 0) return;
        const participantToRemove = participants[index];
        if (!participantToRemove) return;

        setParticipants(currentParticipants =>
            currentParticipants.map(p =>
                p.id === participantToRemove.id ? { ...p, isDeleting: true } : p
            )
        );

        setTimeout(() => {
            setParticipants(currentParticipants =>
                currentParticipants.filter(p => p.id !== participantToRemove.id)
            );
        }, 300);
    };

    const handleParticipantChange = (index, field, value) => {
        const newParticipants = [...participants];
        if (newParticipants[index]) {
            newParticipants[index][field] = value;
            setParticipants(newParticipants);
        }
    };

    const handleSubmit = async (e) => {
    e.preventDefault();

    for (const p of participants) {
        if (!p.fullName.trim() || !p.group.trim()) {
        addNotification('Пожалуйста, заполните все поля.', 'error');
        return;
        }
    }

    setIsSubmitting(true);
    try {
        const resp = await fetch(`${API_BASE_URL}/api/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            user_login: currentUser.login,
            participants: participants.map(({ id, isDeleting, ...rest }) => rest)
        }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Не удалось записаться');

        addNotification(`Вы успешно записались на "${event.eventName}"`, 'success');
        onConfirm({ eventId: event.id, user_login: currentUser.login, participants });
    } catch (error) {
        addNotification(error.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
    };

    
    if (!event) return null;

    return ReactDOM.createPortal(
        <div className={`notifications-component-scope modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
            <div ref={modalRef} className={`edit-modal-content signup-modal ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()} style={dynamicPosition || {}}>
                <div className="chat-header">
                    <div className="chat-title-wrapper">
                        <h2>Запись на мероприятие</h2>
                        <p>{event.eventName}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="edit-form-inside-modal">
                    <div className="edit-modal-body">
                        <div className="participants-list">
                            {participants.map((p, index) => (
                                <div className={`participant-entry ${p.isDeleting ? 'is-deleting' : ''}`} key={p.id}>
                                    {index > 0 && <button type="button" className="remove-participant-btn" onClick={() => removeParticipant(index)}><RemoveIcon/></button>}
                                    <div className="form-grid signup-form-grid">
                                        <FormField label={index === 0 ? "Ваше ФИО" : "ФИО участника"}>
                                            <input type="text" className="form-input" value={p.fullName} onChange={(e) => handleParticipantChange(index, 'fullName', e.target.value)} required disabled={index === 0} />
                                        </FormField>
                                        <FormField label={index === 0 ? "Ваша группа" : "Группа"}>
                                            <input type="text" className="form-input" value={p.group} onChange={(e) => handleParticipantChange(index, 'group', e.target.value)} required disabled={index === 0} />
                                        </FormField>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="form-actions-container participant-actions">
                        <button type="button" className="form-secondary-btn btn-add-plus" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={addParticipant} disabled={isSubmitting || participants.length >= (event.max_group_size || 5)}>
                            <span>+</span>
                        </button>
                        <div className="form-actions-right">
                            <button type="button" className="form-secondary-btn" onClick={handleClose} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} disabled={isSubmitting}>
                                <span>Отмена</span>
                            </button>
                            <button type="submit" className="form-submit-btn" disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span>{isSubmitting ? 'Запись...' : 'Записаться'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};


const NotificationCard = memo(({ invite, isActive, onCardClick, onMouseEnter, innerRef }) => {
    const cardClassName = ['notification-card', isActive && 'is-active'].filter(Boolean).join(' ');

    const handleAction = (e, callback, ...args) => {
        e.stopPropagation();
        callback(...args);
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter} onClick={(e) => handleAction(e, onCardClick, invite.event)}>
            <div className="card-content-wrapper">
                <div className="notification-card-header">
                    <div className="notification-item-info">
                        <h5>{invite.event.eventName}</h5>
                        <p>От: <strong>{invite.inviter}</strong></p>
                    </div>
                    <div className="notification-card-actions">
                        <button
                            className="interactive-button btn-style-accept"
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                        >
                            <span>Посмотреть</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const Notifications = ({ isOpen, onClose, position, userLogin }) => {
    const [isClosing, setIsClosing] = useState(false);
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRegisteredEventIds, setUserRegisteredEventIds] = useState(new Set());
    const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
    const [eventForSignUp, setEventForSignUp] = useState(null);
    const [detailedEvent, setDetailedEvent] = useState(null);
    const [isDetailCardClosing, setIsDetailCardClosing] = useState(false);
    const [isDetailCardExpanded, setIsDetailCardExpanded] = useState(false);
    const [hoveredInviteId, setHoveredInviteId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const [modalPosition, setModalPosition] = useState(null);
    const [invitations, setInvitations] = useState([]);

        useEffect(() => {
    if (!isOpen || !userLogin) return;
    const fetchInvites = async () => {
        try {
        const res = await fetch(`${API_BASE_URL}/api/notifications/${userLogin}`, {
            credentials: "include"
        });
        const data = await res.json();
        setInvitations(data.map(n => {
            const ev = n.Event || {};
            const normalizedEvent = {
                ...ev,
                imageUrl: ev.coverImage ? `${API_BASE_URL}${ev.coverImage}` : defaultEventImage,
                max_participants: ev.maxParticipants,
                max_group_size: ev.teamSize,
                recruitment_status: ev.recruitment_status || 'Активен',
                description: ev.description || 'Тут будет описание, возможно, когда-нибудь',
            };

            const inviterUser = n.Inviter; // придёт из include
            const inviterName = inviterUser
                ? `${inviterUser.lastName} ${inviterUser.firstName}${inviterUser.middleName ? ' ' + inviterUser.middleName : ''}`.trim()
                : n.inviter;
            const inviterGroup = inviterUser?.group || '';

            return {
                inviter: inviterName,
                inviterGroup,
                event: normalizedEvent,
                message: n.message,
            };
            }));
        } catch (err) {
        addNotification("Ошибка загрузки уведомлений", "error");
        }
    };
    fetchInvites();
    }, [isOpen, userLogin]);

    const handleCloseDetails = useCallback(() => {
        setIsDetailCardExpanded(false);
        setIsDetailCardClosing(true);
        setTimeout(() => {
            setDetailedEvent(null);
        }, 400);
    }, []);

    const handleClosePanel = useCallback(() => {
        setIsClosing(true);
        if (detailedEvent) {
            handleCloseDetails();
        }
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDetailedEvent(null);
            setIsDetailCardExpanded(false);
        }, 400);
    }, [onClose, detailedEvent, handleCloseDetails]);

       const handleDeleteAll = async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/api/notifications/user/${userLogin}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!resp.ok) throw new Error('Не удалось удалить все уведомления');
            setInvitations([]); 
            addNotification('Все уведомления удалены', 'success');
        } catch (e) {
            addNotification(e.message, 'error');
        }
    };

    useEffect(() => {
    if (!isOpen || !userLogin) return;

    const load = async () => {
        setIsLoading(true);
        try {
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/${userLogin}`, { credentials: 'include' });
        if (!profileRes.ok) throw new Error('Не удалось загрузить профиль');
        const p = await profileRes.json();
        setCurrentUser({
            login: p.login,
            lastName: p.lastName,
            firstName: p.firstName,
            patronymic: p.patronymic,
            group: p.group,
        });

        const regsRes = await fetch(`${API_BASE_URL}/api/users/${userLogin}/registrations`, { credentials: 'include' });
        if (!regsRes.ok) throw new Error('Не удалось загрузить записи');
        const ids = await regsRes.json();
        setUserRegisteredEventIds(new Set(ids));
        } catch (e) {
        addNotification(e.message, 'error');
        } finally {
        setIsLoading(false);
        }
    };

    load();
    }, [isOpen, userLogin]);

    const gliderTargetId = detailedEvent ? detailedEvent.id : hoveredInviteId;

    useEffect(() => {
        const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;

        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.offsetHeight}px`,
                opacity: 1,
            });
        } else {
            setGliderStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [gliderTargetId, invitations]);

    const handleViewDetails = (event) => {
        if (detailedEvent && detailedEvent.id === event.id) {
            handleCloseDetails();
        } else {
            setDetailedEvent(event);
            setIsDetailCardClosing(false);
            setIsDetailCardExpanded(false);
            setHoveredInviteId(null);
        }
    };
    
    const handleDownload = (event) => {
        addNotification(`Загрузка материалов для мероприятия "${event.eventName}"...`, 'info');
        console.log("Download requested for event:", event.id);
    };

    const handleSignUp = (event, e) => {
        if (!currentUser) {
            addNotification("Необходимо войти в систему для записи.", "info");
            return;
        };
        
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 600; 
        const gap = 15;
        let top = buttonRect.top - 80;
        const left = buttonRect.left - modalWidth - gap;

        if (top < gap) {
            top = gap;
        }

        setModalPosition({
            top: `${top}px`,
            left: `${Math.max(left, gap)}px`
        });
        setEventForSignUp(event);
        setIsSignUpModalOpen(true);
    };

    const handleCloseSignUpModal = () => {
        setIsSignUpModalOpen(false);
        setModalPosition(null);
        setEventForSignUp(null);
    };

    const handleConfirmRegistration = (data) => {
        setUserRegisteredEventIds(prev => new Set(prev).add(data.eventId));
        handleCloseSignUpModal();
    };

    if (!isOpen) return null;

    const wrapperStyle = {
        top: `${(position?.bottom || 0) + 8}px`,
        right: `${window.innerWidth - (position?.right || 0)}px`,
    };

    const gliderClassName = [
        'list-glider',
        detailedEvent ? 'is-fixed' : ''
    ].filter(Boolean).join(' ');

    return ReactDOM.createPortal(
        <div className="notifications-component-scope">
            {isSignUpModalOpen && eventForSignUp && (
                <SignUpModal
                    key={currentUser?.login || 'nouser'}
                    event={eventForSignUp}
                    onClose={handleCloseSignUpModal}
                    onConfirm={handleConfirmRegistration}
                    currentUser={currentUser}
                    position={modalPosition}
                />
            )}

            <div className="notifications-view-wrapper" style={wrapperStyle}>
                {detailedEvent && (
                    <DetailedEventContainer
                        event={detailedEvent}
                        onSignUp={handleSignUp}
                        onDownload={handleDownload}
                        isRegistered={userRegisteredEventIds.has(detailedEvent.id)}
                        isClosing={isDetailCardClosing}
                        isExpanded={isDetailCardExpanded}
                        onExpand={() => setIsDetailCardExpanded(true)}
                        onCloseRequest={handleCloseDetails}
                    />
                )}
                <div className={`notifications-modal ${isClosing ? 'is-closing' : ''}`}>
                    <div className="info-modal-header">
                        <h2>Уведомления</h2>
                        <button
                        className="chat-close-btn"
                        title="Удалить все уведомления"
                        onClick={handleDeleteAll}
                        >
                        <ExitIcon />
                        </button>
                    </div>
                    <div className="info-modal-body">
                        {isLoading ? (
                            <div className="notifications-loader">
                                <ClockwiseLoader />
                            </div>
                        ) : !invitations.length ? (
                            <p className="notifications-empty">Новых приглашений нет.</p>
                        ) : (
                            <div className="notifications-list-container" onMouseLeave={() => setHoveredInviteId(null)}>
                                <div className={gliderClassName} style={gliderStyle}></div>
                                {invitations.map((invite, index) => {
                                    const isActive = invite.event.id === gliderTargetId;

                                    return (
                                        <React.Fragment key={invite.id}>
                                            <NotificationCard
                                                innerRef={node => node ? cardElements.current.set(invite.id, node) : cardElements.current.delete(invite.id)}
                                                invite={invite}
                                                isActive={isActive}
                                                onMouseEnter={() => setHoveredInviteId(invite.id)}
                                                onCardClick={handleViewDetails}
                                            />
                                            {index < invitations.length - 1 && <div className="notification-divider" />}
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Notifications;