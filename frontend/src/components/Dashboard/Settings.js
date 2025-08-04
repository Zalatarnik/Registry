import React, { useState, useEffect, useCallback, useContext } from 'react';
import ReactDOM from 'react-dom';
import './Settings.css';
import { ThemeContext } from '../../context/ThemeContext';


const GliderToggle = ({ options, selectedOption, onOptionSelect }) => {
    const [hoveredOption, setHoveredOption] = useState(selectedOption);
    useEffect(() => { setHoveredOption(selectedOption); }, [selectedOption]);
    const gliderIndex = options.findIndex(opt => opt.id === hoveredOption);

    return (
        <div className="glider-toggle" onMouseLeave={() => setHoveredOption(selectedOption)}>
            {options.map(option => (
                <button 
                    key={option.id} 
                    onClick={() => onOptionSelect(option.id)} 
                    onMouseEnter={() => setHoveredOption(option.id)}
                    className={`glider-toggle-button ${selectedOption === option.id ? 'selected' : ''} ${hoveredOption === option.id ? 'hover-active' : ''}`}>
                    {option.label}
                </button>
            ))}
            <div className="glider-toggle-glider" style={{ transform: `translateX(${gliderIndex * 100}%)` }} />
        </div>
    );
};

// Компонент, содержащий содержимое настроек
const SettingsContent = () => {
    // Состояния для хранения выбранного языка и темы
    const [language, setLanguage] = useState('ru');
    const { theme, toggleTheme } = useContext(ThemeContext);
      const handleThemeChange = (selectedId) => {
    if (selectedId !== theme) toggleTheme();
  };
    const langOptions = [ { id: 'ru', label: 'Русский' }, { id: 'en', label: 'English' } ];
    // Опции для выбора темы
    const themeOptions = [ { id: 'light', label: 'Светлая' }, { id: 'dark', label: 'Темная' } ];

    return (
        <div className="settings-content-container">
            <div className="settings-section">
                <p className="settings-label">Язык</p>
                <GliderToggle options={langOptions} selectedOption={language} onOptionSelect={setLanguage} />
            </div>
            <div className="settings-divider" /> 
            <div className="settings-section">
                <p className="settings-label">Тема</p>
                <GliderToggle options={themeOptions} selectedOption={theme} onOptionSelect={handleThemeChange}  />
            </div>
        </div>
    );
};

// Основной компонент панели настроек
const Settings = ({ isOpen, onClose, position }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClosePanel = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
        setIsClosing(false); 
    }, 400); 
  }, [onClose]);

  if (!isOpen) return null;

  const wrapperStyle = {
      top: `${(position?.bottom || 0) + 8}px`, 
      right: `${window.innerWidth - (position?.right || 0)}px`,
  };

  return ReactDOM.createPortal(
    <div className="settings-component-scope">
      <div className="settings-view-wrapper" style={wrapperStyle}>
        <div className={`settings-modal ${isClosing ? 'is-closing' : ''}`}>
          <div className="info-modal-header">
            <h2>Настройки</h2>
          </div>
          <div className="info-modal-body">
            <SettingsContent />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Settings;