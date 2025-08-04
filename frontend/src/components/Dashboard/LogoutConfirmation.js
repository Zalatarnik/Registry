import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './LogoutConfirmation.css';

// АНИМАЦИЯ
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
  const btn = e.currentTarget; 
  if (!btn._animationState) {
    btn._animationState = {
      isAnimating: false,
      current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
    };
  }

  btn.style.setProperty('--mouse-x', `${e.clientX - btn.getBoundingClientRect().left}px`);
  btn.style.setProperty('--mouse-y', `${e.clientY - btn.getBoundingClientRect().top}px`);

  const state = btn._animationState;
  const rect = btn.getBoundingClientRect(); 
  const x = e.clientX - rect.left; 
  const y = e.clientY - rect.top; 
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
    requestAnimationFrame(() => animateRadii(btn));
  }
};

const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
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

// Компонент модального окна для подтверждения выхода
const LogoutConfirmation = ({ isOpen, onClose, onConfirm, position }) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null); 

  const handleClose = () => {
    setIsClosing(true); 
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250); 
  };

  useEffect(() => {
    if (!isOpen) return; 
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleConfirmAction = () => {
    onConfirm(); 
    handleClose(); 
  };
  
  if (!isOpen) return null;

  const modalStyle = {
    top: `${position.top}px`,
    left: `${position.left}px`,
  };

  const containerClassName = `logout-modal-container ${isClosing ? 'is-closing' : ''}`;

  return ReactDOM.createPortal(
    <div ref={modalRef} className={containerClassName} style={modalStyle}>
      <div className="logout-modal-header">
        <h2>Подтверждение</h2>
      </div>
      <div className="logout-modal-body">
        <p>Вы уверены, что хотите выйти из своей учетной записи?</p>
      </div>
      <div className="logout-modal-footer">
        <button 
          className="logout-modal-button neutral" 
          onClick={handleClose} 
          onMouseMove={handleMouseMoveForEffect} 
          onMouseLeave={handleButtonLeave} 
        >
          <span>Отмена</span>
        </button>
        <button 
          className="logout-modal-button reject" 
          onClick={handleConfirmAction} 
          onMouseMove={handleMouseMoveForEffect}
          onMouseLeave={handleButtonLeave} 
        >
          <span>Выйти</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default LogoutConfirmation;