import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNotification } from '../../notification/NotificationContext';
import './ReviewRequestsPage.css';
import ClockwiseLoader from '../../components/common/Loader';
import ChatView from '../../components/Chat/Chat';
import FilterModal from '../../components/FilterModal';
import { useTranslation } from '../../components/common/useTranslation';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// иконки
import { ReactComponent as ChatIcon } from '../../icons/chat-icon.svg';
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as ApproveIcon } from '../../icons/accept-icon.svg';
import { ReactComponent as RejectIcon } from '../../icons/reject-icon.svg';
import { ReactComponent as ExportIcon } from '../../icons/upload-icon.svg';
import { ReactComponent as FilterIcon } from '../../icons/filter-icon.svg';

const API_BASE_URL = 'http://localhost:8000';
const locale = (navigator.language || 'ru-RU');

// АНИМАЦИЯ КНОПКИ
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

    if (el.classList.contains('interactive-button')) {
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
        const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
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
    if (btn.classList.contains('interactive-button')) {
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

const downloadFile = (fileUrl, fileName) => {
    const fullUrl = `${API_BASE_URL}${fileUrl}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const STATUS_KEYS = { ALL:'all', APPROVED:'approved', REJECTED:'rejected', PENDING:'pending' };

const statusStyleMap = {
  [STATUS_KEYS.ALL]: 'btn-style-neutral',
  [STATUS_KEYS.APPROVED]: 'btn-style-approved',
  [STATUS_KEYS.REJECTED]: 'btn-style-rejected',
  [STATUS_KEYS.PENDING]: 'btn-style-pending'
};

const toStatusKey = (s) => {
  const map = {
    'Одобрено': STATUS_KEYS.APPROVED,
    'Отклонено': STATUS_KEYS.REJECTED,
    'На рассмотрении': STATUS_KEYS.PENDING,
    'Approved': STATUS_KEYS.APPROVED,
    'Rejected': STATUS_KEYS.REJECTED,
    'Pending': STATUS_KEYS.PENDING,
  };
  return map[s] ?? STATUS_KEYS.PENDING;
};

const toEventStatusKey = (s) => {
  const map = {
    'Международный':'international',
    'Всероссийский':'allRussian',
    'Городской':'city',
    'Региональный':'regional',
    'Внутривузовский':'university',
    'International':'international',
    'All-Russian':'allRussian',
    'City':'city',
    'Regional':'regional',
    'University':'university',
  };
  return map[s] ?? s;
};

const RequestReviewCard = memo(({ request, isActive, isExpanded, onCardClick, onMouseEnter, onApprove, onReject, onDownload, onOpenChat, innerRef, onSelect, isSelected }) => {
    const cardClassName = ['request-card', isActive && 'is-active', isExpanded && 'is-expanded', isSelected && 'is-selected-card'].filter(Boolean).join(' ');
    const { t } = useTranslation();
    const [areButtonsRendered, setAreButtonsRendered] = useState(false);
    const [animationClass, setAnimationClass] = useState('');
    const prevIsExpanded = useRef(isExpanded);
    const animationTimer = useRef();
    new Date(request.created_at).toLocaleDateString(locale)
    new Date(request.eventDate).toLocaleDateString(locale)

    useEffect(() => {
        clearTimeout(animationTimer.current);
        if (isExpanded) {
            setAreButtonsRendered(true);
            setAnimationClass('is-action-button-fly-in');
        } else {
            if (prevIsExpanded.current) {
                setAnimationClass('is-action-button-fade-out');
                animationTimer.current = setTimeout(() => setAreButtonsRendered(false), 300);
            }
        }
        prevIsExpanded.current = isExpanded;
        return () => clearTimeout(animationTimer.current);
    }, [isExpanded]);
    
    const handleActionClick = (e, callback, ...args) => {
        e.stopPropagation();
        if (typeof callback === 'function') callback(...args);
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
        if (typeof onSelect === 'function') onSelect();
    };

    

    // фио студента
    const studentFullName = `${request.owner.lastName} ${request.owner.firstName} ${request.owner.middleName || ''}`.trim();
    
    const formatFileText = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    let form = 'many';
    if (mod10 === 1 && mod100 !== 11) form = 'one';
    else if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) form = 'few';
    return t(`review.card.file.${form}`, { n: count });
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={onCardClick}>
                <div className="card-header">
                    <div className="selection-checkbox-wrapper" onClick={handleCheckboxClick}>
                        <input type="checkbox" className="selection-checkbox" checked={isSelected} readOnly />
                    </div>
                    <div className="header-content">
                        <h3>{request.eventName}</h3>
                        <div className="card-date">  {t('notification.inviteFrom')} {studentFullName} | {t('review.card.submitted')} {new Date(request.created_at).toLocaleDateString(locale)}</div>
                    </div>
                    <div className="card-header-right">
                        {areButtonsRendered && request.statusKey === STATUS_KEYS.PENDING && (
                            <>
                                <button className={`interactive-button is-icon btn-style-approved ${animationClass}`} title={t('review.status.approved')} onClick={(e) => handleActionClick(e, onApprove, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ApproveIcon /></span></button>
                                <button className={`interactive-button is-icon btn-style-rejected ${animationClass}`} title={t('review.status.rejected')} onClick={(e) => handleActionClick(e, onReject, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><RejectIcon /></span></button>
                            </>
                        )}
                        <button className="interactive-button is-icon btn-style-chat" title={t('review.chat.open')} onClick={(e) => handleActionClick(e, onOpenChat, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ChatIcon /></span></button>
                        <button className={`interactive-button is-status-button ${statusStyleMap[request.statusKey]}`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{t(`request.status.${request.statusKey}`)}</span></button>
                    </div>
                </div>
            </div>
            <div className="card-details-wrapper">
                <div className="request-card-body-grid">
                    <div className="card-body-column column-files">
                        {(request.files && request.files.length > 0) ? (
                            <div className="mac-stack-download" onClick={(e) => handleActionClick(e, onDownload, request)} title={t('review.download.title')}>
                                <DownloadIcon className="stack-download-icon" />
                                <div className="stack-label">{formatFileText(request.files.length)}</div>
                            </div>
                        ) : (
                            <div className="mac-stack-download is-empty">
                                <DownloadIcon className="stack-download-icon" />
                                <div className="stack-label">{t('review.card.noFiles')}</div>
                            </div>
                        )}
                    </div>
                    <div className="card-body-column column-description">
                        <div className="detail-item">
                            <span className="detail-label">{t('events.description')}:</span>
                            {request.description || t('review.card.noDescription')}
                        </div>
                        <div className="detail-item detail-item-link">
                            <span className="detail-label">{t('newRequest.link')}:</span>
                            {request.resource_link ? (
                                <a href={request.resource_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{request.resource_link}</a>
                            ) : t('review.card.noLink')}
                        </div>
                    </div>
                    <div className="card-body-column column-details">
                        <div className="detail-item"><span className="detail-label">{t('events.leader')}:</span> {request.leader}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.organizer')}:</span> {request.organizer}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.location')}:</span> {request.location}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.status')}:</span> {t(`createEvent.status.${request.eventStatusKey}`)}</div>
                        <div className="detail-item"><span className="detail-label">{t('events.date')}:</span> {new Date(request.eventDate).toLocaleDateString(locale)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default function ReviewRequestsPage({ userLogin }) {
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
    const [selectedRequests, setSelectedRequests] = useState([]);
    const topPanelRef = useRef(null);

    // сотояние открытия модалки фильтра
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
    sort: '',
    regional: false,
    allRussian: false,
    international: false,
    city: false,
    });
    
    useEffect(() => {
        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:8000/api/requests`);
                if (!response.ok) throw new Error(t('review.error.load'));
                const data = await response.json();
                const processedData = data.map(req => ({...req, statusKey: toStatusKey(req.status), eventStatusKey: toEventStatusKey(req.eventStatus),}));
                setRequests(processedData);
                setIsLoading(false);

            } catch (error) {
                console.error("Ошибка при загрузке заявок:", error);
            }
        };

        fetchRequests();
    }, [addNotification, t]);

    const handleCloseFilter = () => {
        const filterModal = topPanelRef.current?.querySelector('.filter-modal-dropdown-container');
        if (filterModal) {
            filterModal.classList.add('is-closing');
            setTimeout(() => {
                setIsFilterModalOpen(false);
            }, 250);
        } else {
            setIsFilterModalOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isFilterModalOpen && topPanelRef.current && !topPanelRef.current.contains(event.target)) {
                handleCloseFilter();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterModalOpen]);

    const filteredRequests = useMemo(() => {
    let result = requests
        .filter(r => (activeFilter === STATUS_KEYS.ALL ? true : r.statusKey === activeFilter))
        .filter(r =>
        r.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${r.owner.lastName} ${r.owner.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // сортировка
    if (advancedFilters.sort === 'recent') {
        result = result.filter(r => new Date(r.eventDate) > Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    if (advancedFilters.sort === 'alphabetical') {
        result = [...result].sort((a, b) => a.owner.lastName.localeCompare(b.owner.lastName));
    }
    if (advancedFilters.sort === 'reverseAlphabetical') {
        result = [...result].sort((a, b) => b.owner.lastName.localeCompare(a.owner.lastName));
    }

    // фильтры по типу
    const typeFilters = [];
    if (advancedFilters.regional)     typeFilters.push('regional');
    if (advancedFilters.allRussian)   typeFilters.push('allRussian');
    if (advancedFilters.international)typeFilters.push('international');
    if (advancedFilters.city)         typeFilters.push('city');

    if (typeFilters.length > 0) result = result.filter(r => typeFilters.includes(r.eventStatusKey));
    return result;
    }, [requests, searchTerm, activeFilter, advancedFilters]);



    const gliderTargetId = expandedCardId ? null : hoveredCardId;

    useEffect(() => {
        const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`,
                opacity: 1
            });
        } else {
            setGliderStyle(prevStyle => ({ ...prevStyle, opacity: 0 }));
        }
    }, [gliderTargetId, filteredRequests]);

    const handleCardClick = (clickedId) => setExpandedCardId(prevId => (prevId === clickedId ? null : clickedId));

    const handleSelectRequest = (requestId) => {
        setSelectedRequests(prev => prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]);
    };

    const handleDownloadAll = (request) => {
        if (!request.files || request.files.length === 0) {
            addNotification(t('review.download.noFiles'), 'info');
            return;
        }
        addNotification(t('review.download.start', { n: request.files.length }), 'success');
        request.files.forEach((file, index) => {
            setTimeout(() => { downloadFile(file.url, file.name); }, index * 300);
        });
    };

    const handleAction = async (id, action) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/requests/${id}/${action}`, { method: 'PUT' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || t('review.action.error'));
            }
            const result = await response.json();
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: result.status, statusKey: toStatusKey(result.status) } : r));
            addNotification(action === 'approve' ? t('review.action.success.approve') : t('review.action.success.reject'), 'success');
        } catch (error) {
            addNotification(error.message, 'error');
        }
    };
    
    const handleApprove = (id) => handleAction(id, 'approve');
    const handleReject = (id) => handleAction(id, 'reject');

    const handleOpenChat = (request) => setActiveChatRequest({ id: request.id, eventName: request.eventName });
    const handleCloseChat = () => setActiveChatRequest(null);
    

    // Преобразует массив заявок в лист Excel и скачивает .xlsx
    const generateXlsx = async (requestsToExport, fileName = 'export.xlsx') => {
    if (!requestsToExport || requestsToExport.length === 0) {
        addNotification('Нет данных для экспорта.', 'info');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Заявки');

    // Колонки
    worksheet.columns = [
        { header: 'Название мероприятия', key: 'eventName', width: 40 },
        { header: 'ФИО студента', key: 'student', width: 30 },
        { header: 'Подана (дата)', key: 'createdAt', width: 14 },
        { header: 'Статус заявки', key: 'status', width: 14 },
        { header: 'Тип мероприятия', key: 'eventStatus', width: 16 },
        { header: 'Дата мероприятия', key: 'eventDate', width: 14 },
        { header: 'Руководитель', key: 'leader', width: 22 },
        { header: 'Организатор', key: 'organizer', width: 22 },
        { header: 'Место', key: 'location', width: 20 },
        { header: 'Описание', key: 'description', width: 60 },
        { header: 'Ссылка на ресурс', key: 'resourceLink', width: 40 },
        { header: 'Файлы', key: 'files', width: 40 }
    ];

    // Заголовки
    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // белый текст
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD35400' } // фон d35400
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Заполняем данные
    requestsToExport.forEach((req) => {
        const studentFullName = `${req.owner?.lastName || ''} ${req.owner?.firstName || ''} ${req.owner?.middleName || ''}`.trim();
        const createdAt = req.created_at ? new Date(req.created_at).toLocaleDateString('ru-RU') : '';
        const eventDate = req.eventDate ? new Date(req.eventDate).toLocaleDateString('ru-RU') : '';

        let filesCellText = '';
        if (req.files && req.files.length > 0) {
            filesCellText = req.files.map(f => f.name).join('\n');
        }

        const rowValues = {
            eventName: req.eventName || '',
            student: studentFullName,
            createdAt,
            status: req.status || '',
            eventStatus: req.eventStatus || '',
            eventDate,
            leader: req.leader || '',
            organizer: req.organizer || '',
            location: req.location || '',
            description: req.description || '',
            resourceLink: req.link || '',
            files: filesCellText
        };

        worksheet.addRow(rowValues);
    });

    // Теперь установим гиперссылки и стиль ссылок:
    const resourceColNum = worksheet.getColumn('resourceLink').number; // 1-based
    const filesColNum = worksheet.getColumn('files').number;

    for (let r = 2; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);

        // resource link
        const resCell = row.getCell(resourceColNum);
        if (resCell && resCell.value && typeof resCell.value === 'string' && resCell.value.trim() !== '') {
            const url = resCell.value;
            resCell.value = { text: url, hyperlink: url };
            resCell.font = { color: { argb: 'FF0000FF' }, underline: true }; // синий + подчёркнутый
        }

        // files — ставим hyperlink на первый файл если есть
        const reqIdx = r - 2;
        const reqObj = requestsToExport[reqIdx];
        if (reqObj && reqObj.files && reqObj.files.length > 0) {
            const firstFile = reqObj.files[0];
            if (firstFile && firstFile.url) {
                const fullUrl = `${API_BASE_URL}${firstFile.url}`;
                const filesCell = row.getCell(filesColNum);
                const text = (filesCell.value && typeof filesCell.value === 'string') ? filesCell.value : (firstFile.name || fullUrl);
                filesCell.value = { text: text, hyperlink: fullUrl };
                filesCell.font = { color: { argb: 'FF0000FF' }, underline: true };
            }
        }
    }

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            // Центрирование по вертикали и горизонтали для всех ячеек
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            // Одна и та же тонкая граница вокруг каждой ячейки
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Сохраняем и предлагаем скачать
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Ошибка при создании xlsx', err);
        addNotification('Ошибка при создании файла', 'error');
    }
    };

  const handleExport = () => {
    if (!filteredRequests || filteredRequests.length === 0) {
        addNotification('Нет заявок для экспорта.', 'info');
        return;
    }
    const fileName = `requests_all_${new Date().toISOString().slice(0,10)}`.xlsx;
    generateXlsx(filteredRequests, fileName);
    };

    const handleExportSelected = () => {
    if (selectedRequests.length === 0) {
        addNotification("Сначала выберите заявки для выгрузки.", "info");
        return;
    }
    const toExport = filteredRequests.filter(r => selectedRequests.includes(r.id));
    const exportList = toExport.length > 0 ? toExport : requests.filter(r => selectedRequests.includes(r.id));
    if (exportList.length === 0) {
        addNotification('Не найдены выбранные заявки для экспорта.', 'error');
        return;
    }
    const fileName = `requests_selected_${new Date().toISOString().slice(0,10)}`.xlsx;
    generateXlsx(exportList, fileName);
    };

    return (
        <div className="review-requests-scope">
            {activeChatRequest && (<ChatView userLogin={userLogin} request={activeChatRequest} onClose={handleCloseChat} />)}
            
            <div className="review-requests-container">
                <h1>{t('review.title')}</h1>
                
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
                            <div className="filter-buttons-panel" ref={topPanelRef}>
                                <button
                                    className={`interactive-button btn-style-neutral is-icon ${isFilterModalOpen ? 'is-active-filter' : ''}`}
                                    onClick={() => isFilterModalOpen ? handleCloseFilter() : setIsFilterModalOpen(true)}
                                    onMouseMove={handleMouseMoveForEffect}
                                    onMouseLeave={handleButtonLeave}
                                    title={t('review.filter.title')}
                                    >
                                    <span>
                                        <FilterIcon />
                                    </span>
                                </button>
                                {Object.values(STATUS_KEYS).map(key => (
                                <button
                                    key={key}
                                    className={`interactive-button ${activeFilter === key ? 'is-active-filter' : ''} ${statusStyleMap[key]}`}
                                    onClick={() => setActiveFilter(key)}
                                    onMouseMove={handleMouseMoveForEffect}
                                    onMouseLeave={handleButtonLeave}
                                >
                                    <span>{t(`review.status.${key}`)}</span>
                                </button>
                                ))}
                                
                                {isFilterModalOpen && <FilterModal
                                    isOpen={isFilterModalOpen}
                                    onClose={handleCloseFilter}
                                    filters={advancedFilters}
                                    setFilters={setAdvancedFilters}
                                    handleMouseMoveForEffect={handleMouseMoveForEffect}
                                    handleButtonLeave={handleButtonLeave}
                                />}
                            </div>
                        </div>

                        <div className="requests-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                            <div className="list-glider" style={gliderStyle}></div>
                            
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((request, index) => (
                                    <React.Fragment key={request.id}>
                                        <RequestReviewCard
                                            innerRef={node => node ? cardElements.current.set(request.id, node) : cardElements.current.delete(request.id)}
                                            request={request}
                                            isActive={expandedCardId ? request.id === expandedCardId : expandedCardId ? false : hoveredCardId === request.id}
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
                                        {index < filteredRequests.length - 1 && <div className="request-divider" />}
                                    </React.Fragment>
                                ))
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>{t('review.noRequests')}</div>
                            )}
                        </div>
                        
                        <div className="export-button-container">
                            <button className="interactive-button btn-style-neutral" onClick={handleExportSelected} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} disabled={selectedRequests.length === 0}>
                                <span>{t('review.export.button.selected', { n: selectedRequests.length })}</span>
                            </button>
                            <button className="interactive-button btn-style-export" onClick={handleExport} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span><ExportIcon/> {t('review.export.button.all')}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}