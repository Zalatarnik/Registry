import React, { useState, useEffect, useRef } from 'react';
import './CreateEventPage.css';
import { useNotification } from '../../notification/NotificationContext';
import ClockwiseLoader from '../../components/common/Loader';
import { useTranslation } from '../../components/common/useTranslation';
import { validateEventCreation } from '../../validation/ValidationContext';

// иконки
import { ReactComponent as UploadIcon } from '../../icons/upload-icon.svg';
import { ReactComponent as DownIcon } from '../../icons/down-icon.svg';
import defaultEventImage from '../../images/event-default.jpg';

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ КНОПОК

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;

// функция для анимирования радиусов углов элемента
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

// универсальный обработчик движения мыши для создания эффектов
const handleMouseMoveForEffect = (e) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);

  if (el.classList.contains('form-submit-btn') || el.classList.contains('form-secondary-btn')) {
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

// обработчик увода мыши с кнопки
const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
  if (btn.classList.contains('form-submit-btn') || btn.classList.contains('form-secondary-btn')) {
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

const FormField = ({ label, children, isTextarea }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isTextarea) {
            const textarea = inputRef.current;
            const handleInput = () => {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            };
            textarea.addEventListener('input', handleInput);
            handleInput();
            return () => textarea.removeEventListener('input', handleInput);
        }
    }, [isTextarea]);

    const childrenWithRef = isTextarea ? React.cloneElement(children, { ref: inputRef, rows: 1 }) : children;

    return (
        <div className="form-field">
            <label>{label}</label>
            <div className="input-wrapper">{childrenWithRef}</div>
        </div>
    );
};

const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    const selected = (options || []).find(o => o.id === value);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div ref={ref} className={`custom-select-container ${isOpen ? 'is-open' : ''}`}>
            <div className="form-input custom-select-value" onClick={() => setIsOpen(!isOpen)}>
                {selected ? selected.label : <span style={{opacity: 0.6}}>{placeholder}</span>}
                <DownIcon />
            </div>
            <div className="custom-select-options">
                {options.map(opt => (
                    <div key={opt.id} className={`custom-select-option ${value === opt.id ? 'is-selected' : ''}`} onClick={() => handleSelect(opt)}>
                        {opt.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ImageUploadArea = ({ file, setFile }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(defaultEventImage);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(defaultEventImage);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const handleFileChange = (selectedFiles) => {
        const imageFile = Array.from(selectedFiles).find(f => f.type.startsWith('image/'));
        if (imageFile) {
            setFile(imageFile);
        }
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

    const removeFile = (e) => {
        e.stopPropagation();
        setFile(null);
    };

    const triggerFileSelect = (e) => {
        e.stopPropagation();
        inputRef.current.click();
    };

    return (
        <div className="image-upload-container">
            <div
                className={`file-upload-area ${isDragging ? 'is-dragging' : ''} has-file`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMouseMove={handleMouseMoveForEffect}
            >
                <div className="image-preview" onClick={triggerFileSelect}>
                    <img src={previewUrl} alt="Обложка мероприятия" />
                    <div className="image-change-overlay">
                        <UploadIcon />
                        <span>Изменить обложку</span>
                    </div>
                    {file && (
                        <button className="file-item-remove-btn" onClick={removeFile}>
                            ✕
                        </button>
                    )}
                </div>
                 <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e.target.files)}
                />
            </div>
        </div>
    );
};


// компонент для загрузки файлов
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
                        <p className="file-upload-text">
                            {t('createEvent.file.dropText')} <span>{t('createEvent.file.chooseText')}</span>
                        </p>
                    </>
                ) : (
                    <div className="file-list-inside">
                        {files.map(file => (
                            <div key={file.name} className="file-item" onMouseMove={handleMouseMoveForEffect}>
                                <span className="file-item-name">{file.name}</span>
                                <button className="file-item-remove-btn" onClick={(e) => {e.stopPropagation(); removeFile(file.name);}}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                 <input
                    ref={inputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e.target.files)}
                />
            </div>
        </div>
    );
}

export default function CreateEventPage({ userLogin }) {
    const { t } = useTranslation(); 
    const [formData, setFormData] = useState({
        eventName: '', leader: '', organizer: '', location: '', eventStatus: '', eventDate: '', description: '', maxParticipants: '', teamSize: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [documentFiles, setDocumentFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useNotification();
    const STATUS_OPTIONS = [
    { id: 'international', label: t('createEvent.status.international') },
    { id: 'allRussian',    label: t('createEvent.status.allRussian') },
    { id: 'city',          label: t('createEvent.status.city') },
    { id: 'regional',      label: t('createEvent.status.regional') },
    { id: 'university',    label: t('createEvent.status.university') }
    ];

    const handleInputChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const clearForm = () => {
        setFormData({
            eventName: '', leader: '', organizer: '', location: '', eventStatus: '', eventDate: '', description: '', maxParticipants: '', teamSize: ''
        });
        setImageFile(null);
        setDocumentFiles([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userLogin) {
            addNotification(t('createEvent.notify.missingUser'), "error");
            return;
        }

        const validationResult = validateEventCreation(formData, imageFile, t);
        if (!validationResult.valid) {
            addNotification(validationResult.message, "error");
            return;
        }

        setIsSubmitting(true);
        const data = new FormData();
        
        for (const key in formData) {
            if (key === 'eventDate' && formData[key]) {
                 data.append(key, new Date(formData[key]).toISOString());
            } else if (formData[key]) {
                 data.append(key, formData[key]);
            }
        }
        data.append('user_login', userLogin);

        if (imageFile) {
            data.append('image', imageFile, imageFile.name);
        }

        documentFiles.forEach(file => {
            data.append('documents', file, file.name);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/events/create`, {
                method: 'POST',
                body: data, 
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ detail: t('createEvent.notify.error') }));
                throw new Error(errorResult.detail);
            }

            addNotification(t('createEvent.notify.success'), 'success');
            clearForm();

        } catch (error) {
            addNotification(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-event-container">
            <h1>{t('createEvent.title')}</h1>
            <div className="page-content">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <FormField label={t('createEvent.field.eventName')}><input className="form-input" type="text" value={formData.eventName} onChange={(e) => handleInputChange('eventName', e.target.value)} required /></FormField>
                        <FormField label={t('createEvent.field.leader')}><input className="form-input" type="text" value={formData.leader} onChange={(e) => handleInputChange('leader', e.target.value)} required /></FormField>
                        <FormField label={t('createEvent.field.organizer')}><input className="form-input" type="text" value={formData.organizer} onChange={(e) => handleInputChange('organizer', e.target.value)} required /></FormField>
                        <FormField label={t('createEvent.field.location')}><input className="form-input" type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} required /></FormField>
                        <FormField label={t('createEvent.field.status')}>
                            <CustomSelect
                            options={STATUS_OPTIONS}
                            value={formData.eventStatus}
                            onChange={(opt) => handleInputChange('eventStatus', opt.id)}
                            placeholder={t('createEvent.field.status.placeholder')}
                            />
                        </FormField>
                        <FormField label={t('createEvent.field.date')}><input className="form-input" type="date" value={formData.eventDate} onChange={(e) => handleInputChange('eventDate', e.target.value)} required /></FormField>
                        <FormField label={t('createEvent.field.maxParticipants')}><input className="form-input" type="number" value={formData.maxParticipants} onChange={(e) => handleInputChange('maxParticipants', e.target.value)} required /></FormField>
                        <FormField label={t('createEvent.field.teamSize')}><input className="form-input" type="number" value={formData.teamSize} onChange={(e) => handleInputChange('teamSize', e.target.value)} required /></FormField>

                        <div className="form-field">
                          <label>Обложка мероприятия*</label>
                          <ImageUploadArea file={imageFile} setFile={setImageFile} />
                        </div>

                        <div className="form-field">
                          <label>Дополнительные файлы</label>
                          <FileUploadArea files={documentFiles} setFiles={setDocumentFiles} />
                        </div>
                        
                        <FormField label={t('createEvent.field.description')} isTextarea={true}><textarea className="form-input" name="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)}></textarea></FormField>
                    </div>
                     <div className="form-actions-container">
                        <button type="button" className="form-secondary-btn" onClick={clearForm} disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{t('createEvent.button.clear')}</span></button>
                        <button type="submit" className="form-submit-btn" disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                            {isSubmitting ? <ClockwiseLoader size={20} /> : <span>{t('createEvent.button.submit')}</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}