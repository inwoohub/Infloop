import React, { useState, useEffect } from 'react';
import './PostModal.css';

function PostModal({
  isOpen,
  onClose,
  onSubmit,
  subjects,
  initialSubject = '',
  initialTitle   = '',
  initialContent = '',
  mode = 'create', // 'create' 또는 'edit'
}) {
  const [subject, setSubject] = useState('');
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');

  // 👉 모달이 열릴 때마다, props 초기값을 state에 동기화
  useEffect(() => {
    if (!isOpen) return;
    console.log('PostModal useEffect:', { initialSubject, initialTitle, initialContent });
    setSubject(initialSubject);
    setTitle(initialTitle);
    setContent(initialContent);
  }, [isOpen, initialSubject, initialTitle, initialContent]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!subject || !title.trim()) return;
    onSubmit({ subject, title: title.trim(), content: content.trim() });
    if (mode === 'create') {
      setSubject(''); setTitle(''); setContent('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{mode === 'edit' ? '게시글 수정' : '게시글 작성'}</h2>

        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="" disabled>과목을 선택해주세요.</option>
          {subjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <textarea
          rows="5"
          placeholder="내용을 입력하세요"
          value={content}
          onChange={e => setContent(e.target.value)}
        />

        <div className="modal-actions">
          <button onClick={handleSubmit}>
            {mode === 'edit' ? '수정' : '등록'}
          </button>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

export default PostModal;
