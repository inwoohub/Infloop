import React from 'react';
import './Loading.css';

function Loading({ message }) {
  return (
    <div className="loading-modal-backdrop">
      <div className="loading-modal-content">
        <span className="loader"></span>
      </div>
      {message && <div className="loading-text">{message}</div>}
    </div>
  );
}

export default Loading;