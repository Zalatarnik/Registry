import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from 'react';
import ReactDOM from 'react-dom';

import ClockwiseLoader from '../../components/common/Loader';
import './Notifications.css';
import { useTranslation } from '../common/useTranslation';

import defaultEventImage from '../../images/event-default.jpg';


import { ReactComponent as AddIcon } from '../../icons/add-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as ExitIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as UsersIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as GroupIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

// Заглушка для системы уведомлений
const useNotification = () => ({
  addNotification: (msg, type = 'info') =>
    console.log(`Notification (${type}): ${msg}`),
});

// Хелперы для «микро-анимации» кнопок
const EASING_FACTOR = 0.15;
const DEFAULT_RADIUS = 0;

function animateRadii(btn) {
  const state = btn._animationState;
  if (!state) return;

  let needNextFrame = false;
  ['tl', 'tr', 'br', 'bl'].forEach((c) => {
    const diff = state.target[c] - state.current[c];
    if (Math.abs(diff) > 0.01) {
      needNextFrame = true;
      state.current[c] += diff * EASING_FACTOR;
    } else {
      state.current[c] = state.target[c];
    }
  });

  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;

  if (needNextFrame) {
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
      current: { tl: 0, tr: 0, br: 0, bl: 0 },
      target: { tl: 0, tr: 0, br: 0, bl: 0 },
    };
  }

  const state = el._animationState;
  const { width, height } = rect;
  const maxR = 25;
  const diag = Math.hypot(width, height);

  const calcR = (cx, cy) =>
    Math.max(
      0,
      maxR * (1 - Math.hypot(x - cx, y - cy) / diag) ** 3,
    );

  state.target.tl = calcR(0, 0);
  state.target.tr = calcR(width, 0);
  state.target.br = calcR(width, height);
  state.target.bl = calcR(0, height);

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

// Карточка мероприятия
const StudentEventCard = ({
    
  event,
  onSignUp,
  isRegistered,
  isDetailed,
  onCloseRequest, onDownload,
  isOpen,
}) => {
    const { t } = useTranslation();
    const STATUS_MAP = {
    Активен: { key: 'active', i18n: 'notification.recruitmentStatus.active' },
    Завершён: {
        key: 'completed',
        i18n: 'notification.recruitmentStatus.completed',
    },
    };

    const { key: statusKey, i18n: statusLabel } =
    STATUS_MAP[event.recruitment_status] || STATUS_MAP.Завершён;

  const cardCls = [
    'event-card-student',
    isDetailed && 'is-detailed-view',
  ]
    .filter(Boolean)
    .join(' ');

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
        <div className={cardCls}>
            <div className="student-card-inner">
                <img src={event.imageUrl || defaultEventImage} alt="Event texture" className="cover-image" />
                <div className={`registration-status-badge ${isRegistered ? 'registered' : 'unregistered'}`}>
                  {isRegistered ? t('notification.alreadyRegistered') : t('notification.notRegistered')}
                </div>
               <div className={`recruitment-status-badge status-${event.eventStatus === 'Активен' ? 'active' : 'completed'}`}>
                  {event.eventStatus}
                </div>
                <div className="details-container">
                    <div className="details-header" onClick={handleHeaderClick}>
                        <div className="details-title-section">
                            <h4>{event.eventName}</h4>
                            <div className="card-date">{new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <div className="details-icons">
                            <div className="icon-item" title={t('notification.maxParticipants')}>
                                <UsersIcon />
                                <span>{event.max_participants || '∞'}</span>
                            </div>
                            <div className="icon-item" title={t('notification.maxGroupSize')}>
                                <GroupIcon />
                                <span>{event.max_group_size || 1}</span>
                            </div>
                        </div>
                    </div>
                    <div className="details-body">
                      <div className="detail-item"><span className="detail-label">{t('notification.leader')}</span> {event.leader}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.organizer')}</span> {event.organizer}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.location')}</span> {event.location}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.status')}</span> {event.eventStatus}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.date')}</span> {new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="details-actions">
                        <button
                            className="interactive-button btn-style-neutral is-icon"
                            onClick={(e) => handleActionClick(e, onDownload)}
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                            title={t('events.materials.download')}
                        >
                            <span><DownloadIcon /></span>
                        </button>
                        <button
                            className="interactive-button btn-style-register"
                            onClick={(e) => handleActionClick(e, onSignUp)}
                            onMouseMove={handleMouseMoveForEffect}
                            disabled={isRegistered || !isOpen}
                            >
                             <span>
                               <AddIcon />
                               {isRegistered
                                 ? t('notification.alreadySignedUp')
                                 : !isOpen
                                   ? t('events.recruitment.closed')
                                   : t('notification.signUp')}
                             </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Контейнер детали мероприятия
const DetailedEventContainer = ({
  event,
  onSignUp,
  onDownload, isRegistered,
  isClosing,
  isExpanded,
  onExpand,
  onCloseRequest,
}) => (
  <div
    className={`detailed-event-container ${
      isClosing ? 'is-closing' : ''
    }`}
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
    const { t } = useTranslation();
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
    const max = event.max_group_size || 5;
    if (participants.length < max) {
      setParticipants([...participants, { id: nextId.current++, fullName: '', group: '' }]);
    } else {
      addNotification(
        t('notification.maxGroupReached', { max }),
        'info',
      );
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
        addNotification(t('notification.fillAllFields'), 'error');
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
        if (!resp.ok) throw new Error(t('signup.error'));

        addNotification(t('notification.successfulRegistration', { event: event.eventName }), 'success');
        onConfirm({ eventId: event.id, user_login: currentUser.login, participants });
    } catch (error) {
        addNotification(error.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
    };

    
    if (!event) return null;

  return (
    <div
      className={`modal-overlay ${isClosing ? 'is-closing' : ''}`}
      onMouseDown={handleClose}
    >
      <div
        className={`signup-modal-content ${isClosing ? 'is-closing' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="chat-header">
          <div className="chat-title-wrapper">
            <h2>{t('notification.signUpTitle')}</h2>
            <p>{event.eventName}</p>
          </div>
          <button
            onClick={handleClose}
            className="chat-close-btn"
            title={t('notification.close')}
          >
            <ExitIcon />
          </button>
        </div>

        <div className="edit-modal-body">
          <form
            onSubmit={handleSubmit}
            className="edit-form-inside-modal"
          >
            {participants.map((p, idx) => (
              <div className="participant-entry" key={idx}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      {idx === 0
                        ? t('notification.yourFullName')
                        : t('notification.fullName')}
                    </label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="text"
                        value={p.fullName}
                        onChange={(e) =>
                          handleParticipantChange(idx, 'fullName', e.target.value)
                        }
                        required
                        disabled={idx === 0}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label>
                      {idx === 0
                        ? t('notification.yourGroup')
                        : t('notification.group')}
                    </label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="text"
                        value={p.group}
                        onChange={(e) =>
                          handleParticipantChange(idx, 'group', e.target.value)
                        }
                        required
                        disabled={idx === 0}
                      />
                    </div>
                  </div>
                </div>

                {idx > 0 && (
                  <button
                    type="button"
                    className="remove-participant-btn"
                    title={t('notification.removeParticipant')}
                    onClick={() => removeParticipant(idx)}
                  >
                    <RemoveIcon />
                  </button>
                )}
              </div>
            ))}

            <div className="form-actions-container participant-actions">
              <button
                type="button"
                className="form-secondary-btn interactive-button"
                onMouseMove={handleMouseMoveForEffect}
                onMouseLeave={handleButtonLeave}
                onClick={addParticipant}
                disabled={
                  participants.length >= (event.max_group_size || 5)
                }
              >
                <span>{t('notification.addParticipant')}</span>
              </button>

              <button
                type="submit"
                className="form-submit-btn interactive-button"
                onMouseMove={handleMouseMoveForEffect}
                onMouseLeave={handleButtonLeave}
              >
                <span>{t('notification.submit')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};



//Карточка приглашения 
const NotificationCard = memo(
  ({ invite, isActive, onCardClick, onMouseEnter, innerRef }) => {
    const { t } = useTranslation();

    const cls = ['notification-card', isActive && 'is-active']
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={innerRef}
        className={cls}
        onMouseEnter={onMouseEnter}
        onClick={() => onCardClick(invite.event)}
      >
        <div className="card-content-wrapper">
          <div className="notification-card-header">
            <div className="notification-item-info">
              <h5>{invite.event.eventName}</h5>
              <p>
                {t('notification.inviteFrom')}
                <strong>{invite.inviter}</strong>
              </p>
            </div>

            <div className="notification-card-actions">
              <button
                className="interactive-button btn-style-accept"
                onMouseMove={handleMouseMoveForEffect}
                onMouseLeave={handleButtonLeave}
              >
                <span>{t('notification.view')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// Главное окно уведомлений
const Notifications = ({ isOpen, onClose, position, userLogin }) => {
    const { t } = useTranslation();
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
                eventStatus: ev.eventStatus,
                description: ev.description || t('events.noDescription'),
            };

            const inviterUser = n.Inviter;
            const inviterName = inviterUser
                ? `${inviterUser.lastName} ${inviterUser.firstName}${inviterUser.middleName ? ' ' + inviterUser.middleName : ''}`.trim()
                : n.inviter;
            const inviterGroup = inviterUser?.group || '';

            return {
                id: n.id,
                inviter: inviterName,
                inviterGroup,
                event: normalizedEvent,
                message: n.message,
            };
            }));
        } catch (err) {
        addNotification(t('notifications.loadError'), 'error');
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

  const closePanel = useCallback(() => {
    setIsClosing(true);
    if (detailedEvent) handleCloseDetails();
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDetailedEvent(null);
      setIsDetailCardExpanded(false);
    }, 400);
  }, [detailedEvent, handleCloseDetails, onClose]);

       const handleDeleteAll = async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/api/notifications/user/${userLogin}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!resp.ok) throw new Error(t('notifications.deleteAllError'))
            setInvitations([]); 
            addNotification(t('notifications.cleared'), 'success');
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
        if (!profileRes.ok) throw new Error(t('notification.errorLoadProfile'));
        const p = await profileRes.json();
        setCurrentUser({
            login: p.login,
            lastName: p.lastName,
            firstName: p.firstName,
            patronymic: p.patronymic,
            group: p.group,
        });

        const regsRes = await fetch(`${API_BASE_URL}/api/users/${userLogin}/registrations`, { credentials: 'include' });
        if (!regsRes.ok) throw new Error(t('notification.errorLoadRegistrations'));
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

  // ── «Липучий» маркер списка 
  const gliderTargetId = detailedEvent ? null : hoveredInviteId;

  useEffect(() => {
    const target = gliderTargetId
      ? cardElements.current.get(gliderTargetId)
      : null;

    if (target) {
      setGliderStyle({
        transform: `translateY(${target.offsetTop}px)`,
        height: `${target.offsetHeight}px`,
        opacity: 1,
      });
    } else {
      setGliderStyle((prev) => ({ ...prev, opacity: 0 }));
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
        const link = document.createElement("a");
        link.href = `${API_BASE_URL}/api/events/${event.id}/download-documents`;
        link.setAttribute("download", `${event.eventName}_documents.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSignUp = (event, e) => {
        if (!currentUser) {
            addNotification(t('notification.loginRequired'), 'info');
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

  // Рендер
  if (!isOpen) return null;

  const wrapperStyle = {
    top: `${(position?.bottom || 0) + 8}px`,
    right: `${window.innerWidth - (position?.right || 0)}px`,
  };

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
                        <h2>{t('notification.title')}</h2>
                        <button
                        className="chat-close-btn"
                        title={t('notifications.deleteAll')}
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
                            <p className="notifications-empty">{t('notification.noInvites')}</p>
                        ) : (
                            <div className="notifications-list-container" onMouseLeave={() => setHoveredInviteId(null)}>
                                <div className="list-glider" style={gliderStyle}></div>
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
