import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import './Minutes.css';
import Header from '../components/Header';
import Topbar from "../components/Topbar";
import Topbarst from '../components/Topbarst';
import Loading from '../components/Loading';
import { FaMicrophone, FaFileAudio, FaRobot, FaSave, FaEdit, FaTrash, FaFileWord, FaTimes } from 'react-icons/fa';

function Minutes({nameInitials, currentProjectId}) {
  const { projectId } = useParams();
  const editorRef = useRef(null);

  // 사용자 정보
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  // 회의록 작성 상태
  const [minutesTitle, setMinutesTitle] = useState("");
  const [minutesContent, setMinutesContent] = useState("");
  const [summaryHTML, setSummaryHTML] = useState("");

  // 저장된 회의록 목록
  const [savedMinutes, setSavedMinutes] = useState([]);

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // AI 요약 모달
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 수정 모달
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // STT용 상태
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState("");

  const [currentUserId, setCurrentUserId] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewContent, setViewContent] = useState("");


  // 1) 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/name/", { withCredentials: true });
        setUserName(response.data.name);
        setUserId(response.data.user_id);
      } catch (error) {
        console.error("사용자 정보를 가져오는 데 실패했습니다:", error);
        alert("사용자 정보를 가져오는 데 실패했습니다.");
      }
    };
    fetchUserInfo();
  }, []);

  // 2) 해당 프로젝트의 저장된 회의록 불러오기
  useEffect(() => {
    const fetchSavedMinutes = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/users/minutes/${projectId}/`);
        setSavedMinutes(response.data.minutes);
      } catch (error) {
        console.error("저장된 회의록 목록 불러오기 실패:", error);
      }
    };
    fetchSavedMinutes();
  }, [projectId]);

  // 파일 선택 핸들러
  const handleFileChange = e => {
    setAudioFile(e.target.files[0]);
  };

  // STT 요청 핸들러
  const handleSTT = async () => {
    if (!audioFile) {
      return alert("오디오 파일을 선택하세요.");
    }
    const fd = new FormData();
    fd.append("audio", audioFile);
    setLoading(true);
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/gpt/transcribe/",
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      const text = res.data.transcript || "";
      setTranscript(text);
      if (editorRef.current) {
        editorRef.current.setContent(text);
      }
    } catch (err) {
      console.error("STT 요청 실패:", err);
      alert("STT 요청에 실패했습니다.");
    }
    setLoading(false);
  };

  // 3) AI 요약 요청
  const handleAISummary = async () => {
    const content = editorRef.current ? editorRef.current.getContent() : "";
    if (!minutesTitle || !content) {
      alert("회의 제목과 내용을 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/gpt/summarize/",
        { notes: content }
      );
      setSummaryHTML(response.data.summary_html);
      setIsModalOpen(true);
    } catch (error) {
      console.error("AI 요약 요청 실패:", error);
      if (
        error.response?.status === 400 &&
        error.response.data?.invalid
      ) {
        const invalid = error.response.data.invalid;
        const badKeys = Object.keys(invalid).filter(k => invalid[k] === false);
        const labels = {
          "회의록 형식": "회의록 형식(질문·답변 형태)",
          "회의록 내용": "회의 내용 적합성"
        };
        alert(
          `회의록 유효성 검사 실패:\n\n` +
          badKeys.map(k => `- ${labels[k] || k}`).join("\n") +
          `\n\n내용을 다시 확인해주세요.`
        );
      } else {
        alert("AI 요약 요청에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 4) 회의록 저장
  const handleSaveMinutes = async () => {
    const contentToSave = isModalOpen
      ? summaryHTML
      : (editorRef.current ? editorRef.current.getContent() : "");
    if (!minutesTitle || !contentToSave) {
      alert("제목과 내용을 입력하세요.");
      return;
    }
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/users/minutes/save/",
        {
          title: minutesTitle,
          content: contentToSave,
          user_id: userId,
          project_id: projectId,
        }
      );
      alert("회의록이 저장되었습니다.");
      setMinutesTitle("");
      setMinutesContent("");
      setSummaryHTML("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("회의록 저장 실패:", error);
      alert("회의록 저장에 실패했습니다.");
      return;
    }
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/users/minutes/${projectId}/`);
      setSavedMinutes(response.data.minutes);
    } catch (error) {
      console.error("저장된 회의록 목록 불러오기 실패:", error);
    }
  };

  // 5) 수정 저장
  const handleUpdateMinutes = async () => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/users/minutes/update/${editingMinute.minutes_id}/`,
        { title: editTitle, content: editContent }
      );
      const res = await axios.get(`http://127.0.0.1:8000/api/users/minutes/${projectId}/`);
      setSavedMinutes(res.data.minutes);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("수정 실패:", err);
      alert("수정에 실패했습니다.");
    }
  };

  // 6) 삭제
  const handleDeleteClick = async (minute) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/users/minutes/delete/${minute.minutes_id}/`
      );
      setSavedMinutes(savedMinutes.filter(m => m.minutes_id !== minute.minutes_id));
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  // 7) Word 저장
  const handleExportDocx = async (minute) => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/users/minutes/html2docx/${minute.minutes_id}/`,
        { responseType: 'blob', withCredentials: true }
      );
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${minute.title}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("회의록 DOCX 다운로드 실패:", err);
      alert("다운로드에 실패했습니다.");
    }
  };

  // 편집 버튼 클릭
  const handleEditClick = (minute) => {
    setEditingMinute(minute);
    setEditTitle(minute.title);
    setEditContent(minute.content);
    setIsEditModalOpen(true);
  };

  const handleViewClick = (content) => {
    setViewContent(content);
    setIsViewModalOpen(true);
  };

  return (
    <div className="Minutes_wrapper">
      <Header 
        nameInitials={nameInitials}
        currentProjectId={currentProjectId}
      />
      <Topbarst />
      <Topbar />

      {loading && <Loading message="처리 중입니다..." />}

      <div className="Minutes_container">
        <div className="Minutes_content">
          <div className="Minutes_editorCard">
            <input
              className="Minutes_titleInput"
              type="text"
              placeholder="회의 제목을 입력하세요..."
              value={minutesTitle}
              onChange={e => setMinutesTitle(e.target.value)}
            />

            <div className="Minutes_audioSection">
              <label className="Minutes_fileLabel">
                <FaFileAudio />
                <input type="file" accept="audio/*" onChange={handleFileChange} />
                {audioFile ? audioFile.name : "오디오 파일 선택"}
              </label>
              <button 
                className="Minutes_sttBtn" 
                onClick={handleSTT} 
                disabled={loading || !audioFile}
              >
                {loading ? "변환 중..." : "음성을 텍스트로"}
              </button>
            </div>

            <div className="Minutes_editorWrapper">
              <Editor
                tinymceScriptSrc="/tinymce/tinymce.min.js"
                initialValue={minutesContent || transcript}
                licenseKey='gpl'
                init={{
                  height: 400,
                  language: 'ko_KR',
                  menubar: true,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'table', 'preview', 'help', 'wordcount'
                  ],
                  toolbar:
                    'undo redo | formatselect fontselect fontsizeselect | bold italic backcolor | ' +
                    'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                    'table | removeformat | help',
                  skin: 'oxide',
                  content_css: 'default'
                }}
                onInit={(_evt, editor) => editorRef.current = editor}
              />
            </div>

            <div className="Minutes_actions">
              <button className="Minutes_aiBtn" onClick={handleAISummary} disabled={loading}>
                <FaRobot />
                {loading ? "요약 중..." : "AI 요약"}
              </button>
              <button className="Minutes_saveBtn" onClick={handleSaveMinutes}>
                <FaSave />
                저장하기
              </button>
            </div>
          </div>

          {savedMinutes.length > 0 && (
            <div className="Minutes_savedSection">
              <h2 className="Minutes_sectionTitle">
                저장된 회의록
              </h2>
              <div className="Minutes_savedList">
                {savedMinutes.map((minute, idx) => (
                  <div key={idx} className="Minutes_savedCard">
                    <div className="Minutes_savedHeader">
                      <h3>{minute.title}</h3>
                      <span className="Minutes_savedDate">
                        {new Date(minute.created_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div 
                      className="Minutes_savedContent"
                      onClick={() => handleViewClick(minute.content)}
                      dangerouslySetInnerHTML={{ __html: minute.content }}
                    />
                    <div className="Minutes_savedActions">
                      <button 
                        className="Minutes_wordBtn" 
                        onClick={() => handleExportDocx(minute)}
                      >
                        <FaFileWord /> Word
                      </button>
                      <button 
                        className="Minutes_editBtn" 
                        onClick={() => handleEditClick(minute)}
                      >
                        <FaEdit /> 수정
                      </button>
                      <button 
                        className="Minutes_deleteBtn" 
                        onClick={() => handleDeleteClick(minute)}
                      >
                        <FaTrash /> 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 요약 모달 */}
          {isModalOpen && (
            <div className="Minutes_modal" onClick={() => setIsModalOpen(false)}>
              <div className="Minutes_modalContent" onClick={(e) => e.stopPropagation()}>
                <div className="Minutes_modalHeader">
                  <h3>AI 요약 결과</h3>
                  <button 
                    className="Minutes_modalClose" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="Minutes_modalBody">
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    value={summaryHTML}
                    licenseKey='gpl'
                    init={{
                      height: 400,
                      language: 'ko_KR',
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'table', 'preview', 'help', 'wordcount'
                      ],
                      toolbar:
                        'undo redo | formatselect fontselect fontsizeselect | bold italic backcolor | ' +
                        'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                        'table | removeformat | help'
                    }}
                    onEditorChange={newContent => setSummaryHTML(newContent)}
                  />
                </div>
                <div className="Minutes_modalFooter">
                  <button className="Minutes_saveBtn" onClick={handleSaveMinutes}>
                    <FaSave /> 저장하기
                  </button>
                  <button 
                    className="Minutes_cancelBtn" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 수정 모달 */}
          {isEditModalOpen && (
            <div className="Minutes_modal" onClick={() => setIsEditModalOpen(false)}>
              <div className="Minutes_modalContent" onClick={(e) => e.stopPropagation()}>
                <div className="Minutes_modalHeader">
                  <h3>회의록 수정</h3>
                  <button 
                    className="Minutes_modalClose" 
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="Minutes_modalBody">
                  <input
                    className="Minutes_titleInput"
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    value={editContent}
                    licenseKey='gpl'
                    init={{
                      height: 400,
                      language: 'ko_KR',
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'table', 'preview', 'help', 'wordcount'
                      ],
                      toolbar:
                        'undo redo | formatselect fontselect fontsizeselect | bold italic backcolor | ' +
                        'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                        'table | removeformat | help'
                    }}
                    onEditorChange={newContent => setEditContent(newContent)}
                  />
                </div>
                <div className="Minutes_modalFooter">
                  <button className="Minutes_saveBtn" onClick={handleUpdateMinutes}>
                    <FaSave /> 저장하기
                  </button>
                  <button 
                    className="Minutes_cancelBtn" 
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
          {isViewModalOpen && (
            <div className="Minutes_modal" onClick={() => setIsViewModalOpen(false)}>
              <div
                className="Minutes_modalContent"
                onClick={e => e.stopPropagation()}
              >
                <div className="Minutes_modalHeader">
                  <h3>회의록 내용 보기</h3>
                  <button
                    className="Minutes_modalClose"
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="Minutes_modalBody">
                  <div
                    dangerouslySetInnerHTML={{ __html: viewContent }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Minutes;