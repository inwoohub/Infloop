// src/pages/TeamFinder.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TeamFinder.css';
import PostModal from '../components/PostModal';
import Chat from './Chat';  // ← 채팅 컴포넌트 import

function TeamFinder() {
  // 0) 상태 정의
  const [userId, setUserId]                     = useState(null);
  const [userSubjects, setUserSubjects]         = useState(['전체']);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterSubject, setFilterSubject]       = useState('전체');
  const [posts, setPosts]                       = useState([]);

  // 모달 / 편집 상태
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);
  const [editingPost, setEditingPost]           = useState(null);

  // --- 채팅 모달 상태 추가 ---
  const [showChatModal, setShowChatModal]   = useState(false);
  const [chatTargetId, setChatTargetId]     = useState(null);

  // 1) 로그인한 사용자 ID 가져오기
  useEffect(() => {
    axios
      .get('http://127.0.0.1:8000/api/users/name/', { withCredentials: true })
      .then(resp => {
        console.log('로그인 유저:', resp.data);
        setUserId(resp.data.user_id);
      })
      .catch(err => console.error('사용자 정보 오류:', err));
  }, []);

  // 2) 사용자 과목 리스트 가져오기
  useEffect(() => {
    if (!userId) return;
    axios
      .get(`http://127.0.0.1:8000/api/users/${userId}/subjects/`, { withCredentials: true })
      .then(resp => {
        console.log('과목 리스트:', resp.data);
        const codes = resp.data.subjects.map(s => `${s.subject_code} ${s.subject_name}`);
        setUserSubjects(['전체', ...codes]);
      })
      .catch(err => console.error('과목 리스트 오류:', err));
  }, [userId]);

  // 3) 게시글 전체 조회
  useEffect(() => {
    axios
      .get('http://127.0.0.1:8000/api/users/posts/', { withCredentials: true })
      .then(resp => {
        console.log('게시글 목록:', resp.data);
        setPosts(resp.data);
      })
      .catch(err => console.error('게시글 조회 오류:', err));
  }, []);

  // 4) 새 게시글 저장
  const handleAddPost = async newPost => {
    const [code, name] = newPost.subject.split(' ');
    try {
      const resp = await axios.post(
        'http://127.0.0.1:8000/api/users/posts/save/',
        { subject_code: code, title: newPost.title, content: newPost.content, user_id: userId },
        { withCredentials: true }
      );
      console.log('저장 응답:', resp.data);
      const savedId = resp.data.id;
      setPosts(prev => [
        {
          id: savedId,
          subject_code: code,
          subject_name: name,
          title: newPost.title,
          content: newPost.content,
          created_date: new Date().toISOString(),
          author_id: userId
        },
        ...prev
      ]);
      setShowCreateModal(false);
      setFilterSubject('전체');
    } catch (err) {
      console.error('게시글 저장 실패:', err);
      alert('게시글 저장에 실패했습니다.');
    }
  };

  // 5) 편집 모달 열기
  const handleEditPost = post => {
    setEditingPost(post);
    setShowEditModal(true);
  };

  // 6) 편집한 내용 저장
  const handleUpdatePost = async updated => {
    const [code, name] = updated.subject.split(' ');
    try {
      const resp = await axios.post(
        `http://127.0.0.1:8000/api/users/posts/update/${editingPost.id}/`,
        { title: updated.title, content: updated.content, subject_code: code },
        { withCredentials: true }
      );
      console.log('수정 응답:', resp.data);
      setPosts(prev =>
        prev.map(p =>
          p.id === editingPost.id
            ? {
                ...p,
                title: updated.title,
                content: updated.content,
                subject_code: code,
                subject_name: name
              }
            : p
        )
      );
      setShowEditModal(false);
      setEditingPost(null);
    } catch (err) {
      console.error('게시글 수정 실패:', err);
      alert('게시글 수정에 실패했습니다.');
    }
  };

  // 7) 게시글 삭제
  const handleDeletePost = async post => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      const resp = await axios.delete(
        `http://127.0.0.1:8000/api/users/posts/delete/${post.id}/`,
        { withCredentials: true }
      );
      console.log('삭제 응답:', resp.data);
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

// 8) 채팅 시작
const handleChat = async post => {
  try {
    const resp = await axios.post(
      "http://127.0.0.1:8000/chat/api/dm_rooms/",
      { user_id: userId, target_id: post.author_id },
      { withCredentials: true }
    );
    const roomId = resp.data.room_id;

    // 게시글 객체에 상대 이름 필드가 있다면 사용, 없다면 별도 호출
    const partnerName = post.author_name || post.author || "상대";

    setChatTargetId({ roomId, partnerName });
    setShowChatModal(true);
  } catch (err) {
    console.error("DM 방 생성 실패:", err);
    alert("채팅방 생성에 실패했습니다.");
  }
};

  // 필터링
  const filteredPosts =
    filterSubject === '전체'
      ? posts
      : posts.filter(p => `${p.subject_code} ${p.subject_name}` === filterSubject);

  // 9) 렌더링
  return (
    <div className="TeamFinderPage">
      <div className="teamfinder-container">
        <div className="teamfinder-content">
          {/* 필터 + 글쓰기 */}
          <div className="controls">
            <div
              className="filter-dropdown-container"
              onMouseEnter={() => setShowFilterDropdown(true)}
              onMouseLeave={() => setShowFilterDropdown(false)}
            >
              <button className="filter-button">{filterSubject}</button>
              {showFilterDropdown && (
                <ul className="filter-dropdown-content">
                  {userSubjects.map(code => (
                    <li key={code} onClick={() => setFilterSubject(code)}>
                      {code}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="post-add-btn" onClick={() => setShowCreateModal(true)}>
              게시글 작성
            </button>
          </div>

          {/* 게시글 목록 */}
          <div>
            {filteredPosts.length === 0 && <p className="no-posts">게시글이 없습니다.</p>}
            {filteredPosts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-subject">
                  {`${post.subject_code} ${post.subject_name}`}
                </div>
                <h2 className="post-title">{post.title}</h2>
                <p className="post-content">{post.content}</p>
                <div className="post-footer">
                  {new Date(post.created_date).toLocaleString()}
                </div>
                <div className="post-actions">
                  {post.author_id == userId && (
                    <div className="left-actions">
                      <button className="action-btn edit-btn" onClick={() => handleEditPost(post)}>수정</button>
                      <button className="action-btn delete-btn" onClick={() => handleDeletePost(post)}>삭제</button>
                    </div>
                  )}
                  {post.author_id != userId && (
                    <div className="right-actions">
                      <button className="action-btn chat-btn" onClick={() => handleChat(post)}>채팅</button>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>

          {/* 생성 모달 */}
          <PostModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleAddPost}
            subjects={userSubjects.filter(s => s !== '전체')}
          />

          {/* 수정 모달 */}
          {editingPost && (
            <PostModal
              isOpen={showEditModal}
              mode="edit"
              onClose={() => {
                setShowEditModal(false);
                setEditingPost(null);
              }}
              onSubmit={handleUpdatePost}
              subjects={userSubjects.filter(s => s !== '전체')}
              initialSubject={`${editingPost.subject_code} ${editingPost.subject_name}`}
              initialTitle={editingPost.title}
              initialContent={editingPost.content}
            />
          )}

                  {/* ── 여기서 Chat 컴포넌트를 띄웁니다 ── */}
          {showChatModal && (
            <Chat
              initTab="dm"
              initRoomId={chatTargetId.roomId}
              initPartner={chatTargetId.partnerName}
              onClose={() => setShowChatModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamFinder;
