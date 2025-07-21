import React from 'react';
import './Loader.css';

// квадратики <3
const ClockwiseLoader = () => {
  return (
    <div className="loader-container">
      <div className="loader-square square-1"></div>
      <div className="loader-square square-2"></div>
      <div className="loader-square square-4"></div>
      <div className="loader-square square-3"></div>
    </div>
  );
};

export default ClockwiseLoader;