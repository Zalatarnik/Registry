import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../notification/NotificationContext';
import './MyRequestsPage.css';
import ClockwiseLoader from '../../components/common/Loader';
import ChatView from '../../components/Chat/Chat';
import ConfirmationModal from '../../pages/ConfirmationModal';
import { useTranslation } from '../../components/common/useTranslation';

// иконки
import { ReactComponent as ChatIcon } from '../../icons/chat-icon.svg';
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';
import { ReactComponent as EditIcon } from '../../icons/edit-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as UploadIcon } from '../../icons/upload-icon.svg';
import { ReactComponent as DownIcon } from '../../icons/down-icon.svg';
import { ReactComponent as CloseIcon } from '../../icons/exit-icon.svg';

// АНИМАЦИЯ КНОПОК
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
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    const isInteractive = el.classList.contains('interactive-button') || el.classList.contains('form-submit-btn') || el.classList.contains('form-secondary-btn');
    if (isInteractive) {
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
    }
};

const handleButtonLeave = (e) => {
    const btn = e.currentTarget;
    const isInteractive = btn.classList.contains('interactive-button') || btn.classList.contains('form-submit-btn') || btn.classList.contains('form-secondary-btn');
    if (isInteractive) {
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
    }
};



const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);
    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };
    const selected = options.find(o => o.value === value);
    return (
        <div ref={ref} className={`custom-select-container ${isOpen ? 'is-open' : ''}`}>
            <div className="form-input custom-select-value" onClick={() => setIsOpen(!isOpen)}>
                {selected ? selected.label : <span style={{ opacity: 0.6 }}>{placeholder}</span>}
                <DownIcon />
            </div>
            <div className="custom-select-options">
                {options.map(opt => (
                    <div key={opt.value} className={`custom-select-option ${value === opt.value ? 'is-selected' : ''}`} onClick={() => handleSelect(opt)}>
                        {opt.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

const FileUploadArea = ({ files, setFiles }) => {
    const { t } = useTranslation(); 
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const handleFileChange = (selectedFiles) => {
        const newFiles = Array.from(selectedFiles).filter(file => !files.some(f => f.name === file.name));
        setFiles(prev => [...prev, ...newFiles]);
    };
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };
    const removeFile = (fileName) => {
        setFiles(files.filter(file => file.name !== fileName));
    };
    return (
        <div className="file-upload-container">
            <div
                className={`file-upload-area ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current.click()}
                onMouseMove={handleMouseMoveForEffect}
            >
                {files.length === 0 ? (
                    <>
                        <UploadIcon className="file-upload-icon" />
                        <p className="file-upload-text">{t('newRequest.upload.title')} <span>{t('newRequest.upload.browse')}</span></p>
                    </>
                ) : (
                    <div className="file-list-inside">
                        {files.map(file => (
                            <div key={file.name || file.url} className="file-item">
                                <span className="file-item-name">{file.name}</span>
                                <button className="file-item-remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}>✕</button>
                            </div>
                        ))}
                    </div>
                )}
                <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files)} />
            </div>
        </div>
    );
};

// ключи статусов запросов
export const STATUS_KEYS = {
  ALL: 'all',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING: 'pending',
};

// нормализация статусов запросов
const toStatusKey = (s = '') => {
  const raw = String(s).trim();
  const map = {
    'Одобрено': STATUS_KEYS.APPROVED,
    'Отклонено': STATUS_KEYS.REJECTED,
    'На рассмотрении': STATUS_KEYS.PENDING,
    'Approved': STATUS_KEYS.APPROVED,
    'Rejected': STATUS_KEYS.REJECTED,
    'Pending': STATUS_KEYS.PENDING,
    'approved': STATUS_KEYS.APPROVED,
    'rejected': STATUS_KEYS.REJECTED,
    'pending': STATUS_KEYS.PENDING,
  };
  return map[raw] ?? raw;
};

// стили кнопок статуса
const statusStyleMap = {
  [STATUS_KEYS.ALL]:      'btn-style-neutral',
  [STATUS_KEYS.PENDING]:  'btn-style-pending',
  [STATUS_KEYS.APPROVED]: 'btn-style-approved',
  [STATUS_KEYS.REJECTED]: 'btn-style-rejected',
};

const toEventStatusKey = (s = '') => {
  const raw = String(s).trim();
  const map = {
    // ru
    'Международный':   'international',
    'Всероссийский':   'allRussian',
    'Городской':       'city',
    'Региональный':    'regional',
    'Внутривузовский': 'university',
    // en
    'International': 'international',
    'All-Russian':   'allRussian',
    'All Russian':   'allRussian',
    'City':          'city',
    'Regional':      'regional',
    'University':    'university',
  };
  return map[raw] ?? raw;
};

const getEventStatusLabel = (raw, t) => {
  const key = toEventStatusKey(raw);
  const dictKey = `createEvent.status.${key}`;
  try { return t(dictKey); } catch { return raw; }
};

const EditRequestModal = ({ request, onClose, onSave, position }) => {
    const { t } = useTranslation(); 
    const { addNotification } = useNotification();
    const STATUS_OPTIONS = [
        { value: 'international', label: t('createEvent.status.international') },
        { value: 'allRussian',    label: t('createEvent.status.allRussian')   },
        { value: 'city',          label: t('createEvent.status.city')         },
        { value: 'regional',      label: t('createEvent.status.regional')     },
        { value: 'university',    label: t('createEvent.status.university')   },
    ];
    const [isClosing, setIsClosing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [files, setFiles] = useState(request.files || []);
    const [formData, setFormData] = useState({
        eventName: request.eventName || '',
        leader: request.leader || '',
        organizer: request.organizer || '',
        location: request.location || '',
        eventStatus: request.eventStatus || '',
        eventDate: request.eventDate ? new Date(request.eventDate).toISOString().split('T')[0] : '',
        description: request.description || '',
        link: request.link || ''
    });

    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const requiredFields = ['eventName', 'leader', 'organizer', 'location', 'eventStatus', 'eventDate'];
        for (const key of requiredFields) {
            if (!formData[key]) {
                addNotification(t('newRequest.notification.missingFields'), 'error');
                return;
            }
        }
        setIsSubmitting(true);
        await onSave({ id: request.id, ...formData, files });
        setIsSubmitting(false);
        handleClose();
    };

    return ReactDOM.createPortal(
        <div className={`my-requests-scope modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
            <div className={`edit-modal-content ${isClosing ? 'is-closing' : ''}`} onMouseDown={e => e.stopPropagation()} style={position || {}}>
                <div className="chat-header">
                    <div className="chat-title-wrapper"><h2>{t('editRequest.title')}</h2></div>
                    <button onClick={handleClose} className="chat-close-btn" title={t('myRequests.modal.close')}><CloseIcon /></button>
                </div>
                <div className="edit-modal-body">
                    <form onSubmit={handleSubmit} className="edit-form-inside-modal">
                        <div className="form-grid">
                            <FormField label={t('createEvent.field.eventName')}><input className="form-input" type="text" value={formData.eventName} onChange={(e) => handleInputChange('eventName', e.target.value)} required /></FormField>
                            <FormField label={t('createEvent.field.leader')}><input className="form-input" type="text" value={formData.leader} onChange={(e) => handleInputChange('leader', e.target.value)} required /></FormField>
                            <FormField label={t('createEvent.field.organizer')}><input className="form-input" type="text" value={formData.organizer} onChange={(e) => handleInputChange('organizer', e.target.value)} required /></FormField>
                            <FormField label={t('createEvent.field.location')}><input className="form-input" type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} required /></FormField>
                            <FormField label={t('createEvent.field.status')}><CustomSelect options={STATUS_OPTIONS} value={formData.eventStatus} onChange={(val) => handleInputChange('eventStatus', val)} placeholder={t('createEvent.field.status.placeholder')} /></FormField>
                            <FormField label={t('createEvent.field.date')}><input className="form-input" type="date" value={formData.eventDate} onChange={(e) => handleInputChange('eventDate', e.target.value)} required /></FormField>
                            <FileUploadArea files={files} setFiles={setFiles} />
                        </div>
                        <div className="form-actions-container">
                            <button type="button" className="form-secondary-btn" onClick={handleClose} disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{t('logout.cancel')}</span></button>
                            <button type="submit" className="form-submit-btn" disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{isSubmitting ? `${t('profile.saveChanges')}...` : t('profile.saveChanges')}</span></button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RequestCard = memo(({ request, isActive, isExpanded, onCardClick, onMouseEnter, onDelete, onDownload, onEdit, onOpenChat, innerRef }) => {
    const { t } = useTranslation();
    const cardClassName = ['request-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');
    const handleActionClick = (e, callback, ...args) => {
        e.stopPropagation();
        if (typeof callback === 'function') callback(e, ...args);
    };

    const [areButtonsRendered, setAreButtonsRendered] = useState(false);
    const [animationClass, setAnimationClass] = useState('');
    const prevIsExpanded = useRef(isExpanded);
    const animationTimer = useRef();

    useEffect(() => {
        clearTimeout(animationTimer.current);
        if (isExpanded) {
            setAreButtonsRendered(true);
            setAnimationClass('is-action-button-fly-in');
        } else {
            if (prevIsExpanded.current) {
                setAnimationClass('is-action-button-fade-out');
                animationTimer.current = setTimeout(() => {
                    setAreButtonsRendered(false);
                }, 300);
            }
        }
        prevIsExpanded.current = isExpanded;

        return () => clearTimeout(animationTimer.current);
    }, [isExpanded]);

    const formatFileText = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
        return t('review.card.file.one', { n: count });
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return t('review.card.file.few', { n: count });
    }
    return t('review.card.file.many', { n: count });
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={onCardClick}>
                <div className="card-header">
                    <div className="header-content">
                        <h3>{request.eventName}</h3>
                        <div className="card-date">{new Date(request.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        {areButtonsRendered && (
                            <>
                                {request.status === 'pending' &&
                                    <button className={`interactive-button is-icon btn-style-neutral ${animationClass}`} title={t('myRequests.action.edit')} onClick={(e) => handleActionClick(e, onEdit, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><EditIcon /></span></button>
                                }
                                <button className={`interactive-button is-icon btn-style-rejected ${animationClass}`} title={t('myRequests.action.delete')} onClick={(e) => handleActionClick(e, onDelete, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><RemoveIcon /></span></button>
                            </>
                        )}
                        <button className="interactive-button is-icon btn-style-chat" title={t('review.chat.open')} onClick={(e) => handleActionClick(e, onOpenChat, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ChatIcon /></span></button>
                        <button className={`interactive-button is-status-button ${statusStyleMap[request.status]}`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><span>{t(`request.status.${request.status}`)}</span></span></button>
                    </div>
                </div>
            </div>
            <div className="card-details-wrapper">
                <div className="card-body request-card-body-grid">
                    <div className="card-body-column column-files">
                        {(request.files && request.files.length > 0) ? (
                            <div
                                className="m-stack-download"
                                onClick={(e) => handleActionClick(e, onDownload, request)}
                                title={t('review.download.start', { n: request.files.length })}
                            >
                                <DownloadIcon className="stack-download-icon" />
                                <div className="stack-label">{formatFileText(request.files.length)}</div>
                            </div>
                        ) : (
                            <div className="m-stack-download is-empty">
                                 <DownloadIcon className="stack-download-icon" />
                                <div className="stack-label">{t('review.card.noFiles')}</div>
                            </div>
                        )}
                    </div>
                    <div className="card-body-column column-description">
                        <div className="detail-item">
                            <span className="detail-label">{t('events.description')}:</span>
                            {request.description}
                        </div>
                        <div className="detail-item detail-item-link">
                            <span className="detail-label">{t('newRequest.link')}:</span>
                            {request.resource_link ? (
                                <a href={request.resource_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    {request.resource_link}
                                </a>
                            ) : t('review.card.noLink')}
                        </div>
                    </div>
                    <div className="card-body-column column-details">
                        <div className="detail-item"><span className="detail-label">{t('events.leader')}:</span> {request.leader}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.organizer')}:</span> {request.organizer}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.location')}:</span> {request.location}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.status')}:</span> {getEventStatusLabel(request.eventStatus, t)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const FormField = ({ label, children }) => (
  <div className="form-field">
    <label>{label}</label>
    <div className="input-wrapper">{children}</div>
  </div>
);


export default function MyRequestsPage({ userLogin }) {
    const { t } = useTranslation();
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addNotification } = useNotification();
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState(STATUS_KEYS.ALL);
    const inputRef = useRef(null);
    const [activeChatRequest, setActiveChatRequest] = useState(null);
    const [editingRequest, setEditingRequest] = useState(null);
    const [modalPosition, setModalPosition] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState(null);
    const [deleteModalPosition, setDeleteModalPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!userLogin) return;
        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:8000/api/requests/student/${userLogin}`);
                if (!response.ok) throw new Error(t('review.error.load'));
                const data = await response.json();
                const processedData = data.map(req => ({
                    ...req,
                    description: req.description,
                    resource_link: (req.resource_link || '').trim(),
                    status: toStatusKey(req.status),
                }));
                setRequests(processedData);
                setIsLoading(false);
            } catch (error) {
                console.error("Ошибка при загрузке заявок студента:", error);
            }
        };
        fetchRequests();
    }, [userLogin, addNotification, t]);

    const filteredRequests = useMemo(() => {
        return requests
            .filter(request => (activeFilter === 'all' ? true : request.status === activeFilter))
            .filter(request => request.eventName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [requests, searchTerm, activeFilter]);

    const gliderTargetId = expandedCardId ? null : hoveredCardId;
    useEffect(() => {
        if (userLogin) {
            const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
            if (targetElement) {
                setGliderStyle({
                    transform: `translateY(${targetElement.offsetTop}px)`,
                    height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`,
                    opacity: 1
                });
            } else {
                setGliderStyle(prev => ({ ...prev, opacity: 0 }));
            }
        }
    }, [gliderTargetId, filteredRequests, userLogin]);

    const handleCardClick = (clickedId) => {
        setExpandedCardId(prevId => (prevId === clickedId ? null : clickedId));
    };

    const handleEditClick = (e, request) => {
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const rightPosition = window.innerWidth - buttonRect.left + 10;
        setModalPosition({ top: buttonRect.top - 200, right: `${rightPosition}px` });
        setEditingRequest(request);
    };

    // Открытие вложеных файлов в заметку
    const downloadAllFilesAsZip = useCallback((_e, request) => {
        const files = request.files || [];

        if (files.length === 0) {
            alert(t('review.download.noFiles'));
            return;
        }

        if (files.length === 1) {
            const fileUrl = `http://localhost:8000${files[0].url}`;
            window.open(fileUrl, '_blank');
        } else {
            const zipUrl = `http://localhost:8000/api/requests/${request.id}/files-zip`;
            const link = document.createElement('a');
            link.href = zipUrl;
            link.setAttribute('download', `request_${request.id}_files.zip`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [t]);

    const promptCancelRequest = (e, request) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 380;
        const gap = 15;
        const top = rect.top;
        let left = rect.left - modalWidth - gap;

        if (left < gap) {
            left = rect.right + gap;
        }

        setDeleteModalPosition({ top, left });
        setRequestToDelete(request);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!requestToDelete) return;
        try {
            const response = await fetch(`http://localhost:8000/api/requests/${requestToDelete.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(t('request.delete.error'));
            setRequests(current => current.filter(r => r.id !== requestToDelete.id));
            addNotification(t('request.delete.success'), 'success');
        } catch (error) {
            addNotification(error.message, 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setRequestToDelete(null);
        }
    };

    const handleOpenChat = (_e, request) => setActiveChatRequest({ id: request.id, eventName: request.eventName });
    const handleCloseChat = () => setActiveChatRequest(null);

    const handleSaveRequest = async (updatedData) => {
        try {
            const data = new FormData();
            data.append('eventName', updatedData.eventName);
            data.append('leader', updatedData.leader);
            data.append('organizer', updatedData.organizer);
            data.append('location', updatedData.location);
            data.append('eventStatus', updatedData.eventStatus);
            data.append('eventDate', new Date(updatedData.eventDate).toISOString());
            const newFiles = updatedData.files.filter(f => f instanceof File);
            const existingFilesToKeep = updatedData.files.filter(f => !(f instanceof File));
            newFiles.forEach(file => data.append('files', file, file.name));
            data.append('existingFiles', JSON.stringify(existingFilesToKeep.map(f => ({ name: f.name, url: f.url }))));

            const response = await fetch(`http://localhost:8000/api/requests/${updatedData.id}`, {
                method: 'PUT',
                body: data,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || t('request.update.error'));
            }

            const savedRequest = await response.json();
            setRequests(prev => prev.map(r => r.id === savedRequest.id ? { ...savedRequest, description: r.description, link: r.link } : r));
            addNotification(t('request.update.success'), 'success');
            setEditingRequest(null);

        } catch (error) {
            addNotification(error.message, 'error');
        }
    };

    return (
        <div className="my-requests-scope">
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmCancel}
                position={deleteModalPosition}
                title={t('confirm.title')}
                message={t('confirm.cancelRequest')}
                confirmText={t('common.delete')}
                cancelText={t('common.back')}
            />
            {activeChatRequest && (<ChatView userLogin={userLogin} request={activeChatRequest} onClose={handleCloseChat} />)}
            {editingRequest && <EditRequestModal request={editingRequest} onClose={() => { setEditingRequest(null); setModalPosition(null); }} onSave={handleSaveRequest} position={modalPosition} />}
            <div className="requests-container">
                <h1>{t('page.title.myRequests')}</h1>
                {isLoading ? (
                    <div className="page-loader-container"><ClockwiseLoader /></div>
                ) : (
                    <>
                        <div className="filter-container">
                            <div className="search-bar-wrapper">
                                <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                    <span><SearchIcon /><input ref={inputRef} type="text" placeholder={t('review.search.placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                                </div>
                            </div>
                            <div className="filter-buttons">
                            {Object.values(STATUS_KEYS).map(status => (
                                <button
                                key={status}
                                className={`interactive-button ${activeFilter === status ? 'is-active-filter' : ''} ${statusStyleMap[status]}`}
                                onClick={() => setActiveFilter(status)}
                                onMouseMove={handleMouseMoveForEffect}
                                onMouseLeave={handleButtonLeave}>
                                <span>{t(`review.status.${status}`)}</span>
                                </button>
                            ))}
                            </div>
                        </div>
                        <div className="page-content">
                            <div className="requests-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                                <div className="list-glider" style={gliderStyle}></div>
                                {filteredRequests.length > 0 ? (
                                    filteredRequests.map((request, index) => (
                                        <React.Fragment key={request.id}>
                                            <RequestCard
                                                innerRef={node => node ? cardElements.current.set(request.id, node) : cardElements.current.delete(request.id)}
                                                request={request}
                                                isActive={expandedCardId ? request.id === expandedCardId : request.id === hoveredCardId}
                                                isExpanded={expandedCardId === request.id}
                                                onCardClick={() => handleCardClick(request.id)}
                                                onMouseEnter={() => { if (!expandedCardId) setHoveredCardId(request.id); }}
                                                onDelete={promptCancelRequest}
                                                onDownload={downloadAllFilesAsZip}
                                                onEdit={handleEditClick}
                                                onOpenChat={handleOpenChat}
                                            />
                                            {index < filteredRequests.length - 1 && <div className="request-divider" />}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>{t('review.noRequests')}</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}