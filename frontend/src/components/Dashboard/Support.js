import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './Support.css';

// иконки
import { ReactComponent as ExitIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as PhoneIcon } from '../../icons/phone-icon.svg';
import { ReactComponent as EmailIcon } from '../../icons/email-icon.svg';

const EASING_FACTOR = 0.15;
const DEFAULT_RADIUS = 12;

function animateRadii(el) {
    const state = el._animationState;
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

    el.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;

    if (isAnimationNeeded) {
        requestAnimationFrame(() => animateRadii(el));
    } else {
        state.isAnimating = false;
    }
}

const handleMouseMoveForEffect = (e) => {
    const el = e.currentTarget;
    if (!el.classList.contains('interactive-container')) return;

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
    const maxRadius = 30;
    const diagonal = Math.sqrt(width**2 + height**2);

    const calculateRadius = (cx, cy) =>
        Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));

    state.target.tl = calculateRadius(0, 0);
    state.target.tr = calculateRadius(width, 0);
    state.target.br = calculateRadius(width, height);
    state.target.bl = calculateRadius(0, height);

    if (!state.isAnimating) {
        state.isAnimating = true;
        requestAnimationFrame(() => animateRadii(el));
    }
};

const handleMouseLeaveForEffect = (e) => {
    const el = e.currentTarget;
    if (!el.classList.contains('interactive-container')) return;
    const state = el._animationState;
    if (!state) return;

    state.target.tl = DEFAULT_RADIUS;
    state.target.tr = DEFAULT_RADIUS;
    state.target.br = DEFAULT_RADIUS;
    state.target.bl = DEFAULT_RADIUS;

    if (!state.isAnimating) {
        state.isAnimating = true;
        requestAnimationFrame(() => animateRadii(el));
    }
};


const Support = ({ isOpen, onClose, position }) => {
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
    <div className="support-component-scope">
      <div className="support-view-wrapper" style={wrapperStyle}>
        <div className={`support-modal ${isClosing ? 'is-closing' : ''}`}>
          <div className="info-modal-header">
            <h2>Поддержка</h2>
            
          </div>
          <div className="info-modal-body">
            <div className="support-contact-list">
               <p className="support-intro-text">
                  Если у вас возникли вопросы или проблемы, свяжитесь с нами одним из следующих способов:
               </p>
               <div 
                  className="support-contact-item interactive-container"
                  onMouseMove={handleMouseMoveForEffect}
                  onMouseLeave={handleMouseLeaveForEffect}
                >
                  <div className="contact-icon-wrapper"><EmailIcon/></div>
                  <div className="contact-details">
                     <span className="contact-label">Электронная почта</span>
                     <a href="mailto:support@example.com" className="contact-value">support@example.com</a>
                  </div>
               </div>
               <div className="support-divider" />
               <div 
                  className="support-contact-item interactive-container"
                  onMouseMove={handleMouseMoveForEffect}
                  onMouseLeave={handleMouseLeaveForEffect}
                >
                  <div className="contact-icon-wrapper"><PhoneIcon/></div>
                  <div className="contact-details">
                      <span className="contact-label">Номер телефона</span>
                      <a href="tel:+78005553535" className="contact-value">+7 (800) 111-11-11</a>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Support;