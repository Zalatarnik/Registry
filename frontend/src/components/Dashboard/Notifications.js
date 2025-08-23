import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import ReactDOM from 'react-dom';

import ClockwiseLoader from '../../components/common/Loader';
import './Notifications.css';
import { useTranslation } from '../common/useTranslation';

import defaultEventImage from '../../images/event-default.jpg';

// иконки
import { ReactComponent as AddIcon } from '../../icons/add-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as ExitIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as UsersIcon } from '../../icons/users-icon.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as GroupIcon } from '../../icons/group-icon.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
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
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
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

const useLowHeightOrMobile = () => {
  const [isSheet, setIsSheet] = useState(false);
  const recompute = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const lowH = vh < 560; // ландшафт телефонов/низкие окна
    setIsSheet(coarse || vw <= 640 || lowH);
  }, []);
  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
    };
  }, [recompute]);
  return isSheet;
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


const toEventStatusKey = (s = '') => {
  const raw = String(s).trim();
  const map = {
    // ru
    'Международный': 'international',
    'Всероссийский': 'allRussian',
    'Городской': 'city',
    'Региональный': 'regional',
    'Внутривузовский': 'university',
    // en
    'International': 'international',
    'All-Russian': 'allRussian',
    'City': 'city',
    'Regional': 'regional',
    'University': 'university',
    // already keys
    'international': 'international',
    'allRussian': 'allRussian',
    'city': 'city',
    'regional': 'regional',
    'university': 'university',
  };
  return map[raw] ?? '';
};

const EVENT_STATUS_I18N_KEYS = {
  international: 'createEvent.status.international',
  allRussian:    'createEvent.status.allRussian',
  city:          'createEvent.status.city',
  regional:      'createEvent.status.regional',
  university:    'createEvent.status.university',
};

const getEventStatusLabel = (value, t) => {
  const key = EVENT_STATUS_I18N_KEYS[toEventStatusKey(value)];
  return key ? t(key) : (value || '—');
};

const isRecruitmentOpen = (ev) => {
  const dateOk = new Date(ev.eventDate) > new Date();
  const capOk = !ev.maxParticipants || (Number(ev.current_participants||0) < Number(ev.maxParticipants));
  return dateOk && capOk;
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
    const open = isRecruitmentOpen(event);

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
                    {isRegistered ? 'Вы записаны' : 'Нет записи'}
                </div>
               <div className={`recruitment-status-badge status-${open ? 'active' : 'completed'}`}>
                  {open ? t('events.recruitment.open') : t('events.recruitment.closed')}
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
                      <div className="detail-item"><span className="detail-label">{t('notification.leader')}</span> {event.leader}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.organizer')}</span> {event.organizer}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.location')}</span> {event.location}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.status')}</span>{' '} {getEventStatusLabel(event.levelKey || event.eventStatus, t)}</div>
                      <div className="detail-item"><span className="detail-label">{t('notification.date')}</span> {new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
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
                            disabled={isRegistered || !open}
                            >
                             <span>
                               <AddIcon />
                               {isRegistered
                                 ? t('notification.alreadySignedUp')
                                 : !open
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
    const isSheet = useLowHeightOrMobile();
    const [isClosing, setIsClosing] = useState(false);
    const { addNotification } = useNotification();
    
    const getUserFullName = (user) => user 
    ? [user.lastName, user.firstName, user.patronymic || user.middleName]
        .filter(Boolean)
        .join(' ') 
    : '';

    const [participants, setParticipants] = useState(() => [{ 
        id: currentUser.id, 
        fullName: getUserFullName(currentUser), 
        group: currentUser.group || '', 
        isLocked: true 
    }]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef(null);
    const [modalPosition, setModalPosition] = useState(position);
    const dragInfo = useRef({});

    const [allStudents, setAllStudents] = useState([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState(null);
    
    const [hoveredStudentId, setHoveredStudentId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const studentElements = useRef(new Map());
    const participantsListWrapperRef = useRef(null);
    const modalBodyRef = useRef(null);
    const searchContainerRef = useRef(null);

    const [isSearchContainerVisible, setIsSearchContainerVisible] = useState(false);

    const shouldSearchBeVisible = useMemo(() => {
        if (activeSearchIndex === null) return false;
        const currentFullName = participants[activeSearchIndex]?.fullName.toLowerCase();
        if (!currentFullName) return false;

        const registeredIds = new Set(participants.map(p => p.id).filter(Boolean));
        return allStudents.some(student => {
            const fullName = `${student.lastName} ${student.firstName} ${student.middleName || ''}`.toLowerCase();
            return !registeredIds.has(student.id) && fullName.includes(currentFullName);
        });
    }, [activeSearchIndex, participants, allStudents]);
    const [modalStyle, setModalStyle] = useState({});
    useEffect(() => setModalPosition(position), [position]);

    // ESC + лока скролла
    useEffect(() => {
      const onKey = (e) => e.key === 'Escape' && handleClose();
      document.addEventListener('keydown', onKey);
      document.body.classList.add('scroll-lock');
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.classList.remove('scroll-lock');
      };
    }, []);

    // пересчёт позиции (если не шит)
    useEffect(() => {
      if (!event) return;
    if (isSheet || !modalPosition) {
    setModalStyle({ position: 'fixed', left: '50%', bottom: 'max( env(safe-area-inset-bottom), 8px )', transform: 'translateX(-50%)' });
    return;
    }
    setModalStyle({ position: 'fixed', top: modalPosition.top, left: modalPosition.left });
    }, [isSheet, modalPosition, event]);

    useEffect(() => {
        if (shouldSearchBeVisible) {
            setIsSearchContainerVisible(true);
        }
    }, [shouldSearchBeVisible]);
    
    const handleSearchAnimationEnd = () => {
        if (!shouldSearchBeVisible) {
            setIsSearchContainerVisible(false);
        }
    };

    useEffect(() => {
        const bodyEl = modalBodyRef.current;
        if (bodyEl) {
            bodyEl.style.overflowY = activeSearchIndex !== null ? 'visible' : 'auto';
        }
    }, [activeSearchIndex]);

    useEffect(() => {
        const wrapper = participantsListWrapperRef.current;
        if (wrapper) {
            const oldHeight = wrapper.getBoundingClientRect().height;
            wrapper.style.height = 'auto';
            const newHeight = wrapper.scrollHeight;

            if (oldHeight > 0) {
                wrapper.style.height = `${oldHeight}px`;
                void wrapper.offsetHeight;
            }
            
            wrapper.style.height = `${newHeight}px`;
        }
    }, [participants.length]);
    
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
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
    
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    
        const modalNode = modalRef.current;
        modalNode.style.transition = 'top 0.2s ease-out, left 0.2s ease-out';
    
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
        });
        
        dragInfo.current.isDragging = false;
    }, [handleDragMove]);

    const handleDragStart = (e) => {
        if (e.button !== 0 || !modalRef.current) return;
        
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

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/all`, { credentials: 'include' });
                if (!response.ok) throw new Error('Не удалось загрузить список студентов');
                const data = await response.json();
                setAllStudents(data.filter(u => u.role === 'student'));
            } catch (error) {
                console.error("Ошибка при загрузке студентов:", error);
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
            setActiveSearchIndex(null);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const handleOverlayMouseDown = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const addParticipant = () => {
        const maxGroupSize = event.max_group_size || 5;
        if (participants.length < maxGroupSize) {
            setParticipants([...participants, { id: null, fullName: '', group: '', isLocked: false }]);
        } else {
            addNotification(`Максимальный размер группы: ${maxGroupSize} чел.`, 'info');
        }
    };

    const removeParticipant = (index) => {
        if (!participants[index].isLocked) {
            setParticipants(participants.filter((_, i) => i !== index));
        }
    };

    const handleParticipantChange = (index, value) => {
        const newParticipants = [...participants];
        if (newParticipants[index].id) {
            newParticipants[index].id = null;
            newParticipants[index].group = '';
        }
        newParticipants[index].fullName = value;
        setParticipants(newParticipants);
        setActiveSearchIndex(value ? index : null);
    };

    const handleUserSelect = (index, user) => {
        const newParticipants = [...participants];
        newParticipants[index] = {
            id: user.id,
            fullName: `${user.lastName} ${user.firstName} ${user.middleName || ''}`.trim(),
            group: user.group,
            isLocked: false
        };
        setParticipants(newParticipants);
        setActiveSearchIndex(null);
    };

    const filteredStudents = useMemo(() => {
        if (activeSearchIndex === null) return [];
        const currentFullName = participants[activeSearchIndex]?.fullName.toLowerCase();
        if (!currentFullName) return [];

        const registeredIds = new Set(participants.map(p => p.id).filter(Boolean));

        return allStudents.filter(student => {
            const fullName = `${student.lastName} ${student.firstName} ${student.middleName || ''}`.toLowerCase();
            return !registeredIds.has(student.id) && fullName.includes(currentFullName);
        }).slice(0, 5);
    }, [activeSearchIndex, participants, allStudents]);
    
    useEffect(() => {
        const targetElement = hoveredStudentId ? studentElements.current.get(hoveredStudentId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.offsetHeight}px`,
                opacity: 1,
            });
        } else {
            setGliderStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [hoveredStudentId, filteredStudents]);

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
            const response = await fetch(`${API_BASE_URL}/api/events/${event.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_login: currentUser.login, participants }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Ошибка записи');
            addNotification(`Вы успешно записались на "${event.eventName}"`, 'success');
            onConfirm({ eventId: event.id });
        } catch (error) {
            addNotification(error.message, 'error');
            setIsSubmitting(false);
        }
    };

    if (!event) return null;

  return (
    <div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
      <div
        ref={modalRef}
        className={`signup-modal-content ${isSheet ? 'is-sheet' : ''} ${isClosing ? 'is-closing' : ''}`}
        style={modalStyle}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="signup-title"
      >
        <div className="chat-header">
          <div className="chat-title-wrapper">
            <h2 id="signup-title">{t('notification.signUpTitle')}</h2>
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


const NotificationCard = memo(({ invite, isActive, onCardClick, onMouseEnter, innerRef }) => {
    const cardClassName = ['notification-card', isActive && 'is-active'].filter(Boolean).join(' ');

    const handleAction = (e, callback, ...args) => {
        e.stopPropagation();
        callback(...args);
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter} onClick={(e) => handleAction(e, onCardClick, invite)}>
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
    const { t } = useTranslation();
    const isSheet = useLowHeightOrMobile();
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
    const [clickedInviteId, setClickedInviteId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const [modalPosition, setModalPosition] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [wrapperStyle, setWrapperStyle] = useState({});

    const handleCloseSignUpModal = useCallback(() => {
        setIsSignUpModalOpen(false);
        setModalPosition(null);
        setEventForSignUp(null);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setIsDetailCardExpanded(false);
        setIsDetailCardClosing(true);
        setClickedInviteId(null);
        handleCloseSignUpModal();
        setTimeout(() => {
            setDetailedEvent(null);
        }, 400);
    }, [handleCloseSignUpModal]);

    useEffect(() => {
        if (!isOpen) {
            setDetailedEvent(null);
            setIsDetailCardClosing(false);
            setIsDetailCardExpanded(false);
            setClickedInviteId(null);
            setHoveredInviteId(null);
            handleCloseSignUpModal();
        }
    }, [isOpen, handleCloseSignUpModal]);

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
                levelKey: toEventStatusKey(ev.eventStatus),
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
                inviterGroup: inviterUser?.group || '',
                event: normalizedEvent,
                message: n.message,
            };
            }));
        } catch (err) {
        addNotification("Ошибка загрузки уведомлений", "error");
        }
    };
    fetchInvites();
    }, [isOpen, userLogin, t]);

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
            id: p.id,
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

    const gliderTargetId = clickedInviteId || hoveredInviteId;

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

    const handleViewDetails = (invite) => {
        if (detailedEvent && clickedInviteId === invite.id) {
            handleCloseDetails();
        } else {
            setDetailedEvent(invite.event);
            setClickedInviteId(invite.id);
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

    const handleConfirmRegistration = (data) => {
        setUserRegisteredEventIds(prev => new Set(prev).add(data.eventId));
        handleCloseSignUpModal();
    };

  useEffect(() => {
    if (!isOpen) return;
      const clampInView = () => {
        const vw = window.innerWidth;
        const gap = 8;
        if (isSheet || !position) {
          setWrapperStyle({
            position: 'fixed',
          });
          return;
        }
        const right = Math.max(gap, vw - (position.right || vw)); // якорь к правому краю кнопок
        const top   = Math.max(gap, (position.bottom || 0) + gap);
        setWrapperStyle({
          position: 'fixed',
          right: `${right}px`,
          top:   `${top}px`,
          left:  'auto',
          transform: 'none',
        });
      };
    clampInView();
    window.addEventListener('resize', clampInView);
    window.addEventListener('orientationchange', clampInView);
    return () => {
      window.removeEventListener('resize', clampInView);
      window.removeEventListener('orientationchange', clampInView);
    };
  }, [isOpen, isSheet, position]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClosePanel(); };
    const onDown = (e) => {
      const panel = document.querySelector('.notifications-view-wrapper');
      if (panel && !panel.contains(e.target)) handleClosePanel();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [isOpen, handleClosePanel]);


  // Рендер
  if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="notifications-component-scope">
            {isSignUpModalOpen && eventForSignUp && currentUser && (
                <SignUpModal
                    key={currentUser?.login || 'nouser'}
                    event={eventForSignUp}
                    onClose={handleCloseSignUpModal}
                    onConfirm={handleConfirmRegistration}
                    currentUser={currentUser}
                    position={modalPosition}
                />
            )}

            <div className={`notifications-view-wrapper ${isSheet ? 'is-sheet' : ''}`} style={wrapperStyle}>
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
                                <div className="notifications-glider" style={gliderStyle}></div>
                                {invitations.map((invite, index) => {
                                    const isActive = invite.id === gliderTargetId;

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