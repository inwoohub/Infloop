// src/components/ScheduleModal.js
import React from "react";
import Modal from "react-modal";
import "./ScheduleModal.css";

// 접근성 설정: 모달이 렌더링될 앱 루트를 지정합니다.
Modal.setAppElement("#root");

const ScheduleModal = ({ isOpen, onRequestClose, contentLabel, children, style }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel={contentLabel}
      className="schedule-modal-content"
      overlayClassName="schedule-modal-overlay"
      style={style}
    >
      {children}
    </Modal>
  );
};

export default ScheduleModal;
