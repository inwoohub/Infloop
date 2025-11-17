/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import './Report.css';
import Header from '../components/Header';
import Topbar from "../components/Topbar";
import Topbarst from '../components/Topbarst';
import Loading from '../components/Loading';
import { FaFileAlt, FaRobot, FaSave, FaEdit, FaTrash, FaFileWord, FaTimes } from 'react-icons/fa';

function Report({ nameInitials, currentProjectId }) {
  const { projectId } = useParams();
  const editorRef = useRef(null);

  // 사용자 정보
  const [userId, setUserId] = useState("");

  // 보고서 작성 상태
  const [reportType, setReportType] = useState("");
  const [summaryHTML, setSummaryHTML] = useState("");

  // 저장된 보고서 목록
  const [savedReports, setSavedReports] = useState([]);

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // AI 요약 모달
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 수정 모달
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const [currentUserId, setCurrentUserId] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewContent, setViewContent] = useState("");

  // 1) 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/name/", { withCredentials: true });
        setUserId(response.data.user_id);
        setCurrentUserId(response.data.user_id);
      } catch (error) {
        console.error("사용자 정보를 가져오는 데 실패했습니다:", error);
        alert("사용자 정보를 가져오는 데 실패했습니다.");
      }
    };
    fetchUserInfo();
  }, []);

  // 2) 해당 프로젝트의 저장된 보고서 불러오기
  useEffect(() => {
    const fetchSavedReports = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/users/report/${projectId || 1}/`);
        setSavedReports(response.data.reports);
      } catch (error) {
        console.error("저장된 보고서 목록 불러오기 실패:", error);
      }
    };
    fetchSavedReports();
  }, [projectId]);

  // 3) AI 요약 요청
  const handleAISummary = async () => {
    if (!reportType) {
      alert("보고서 종류를 선택하세요.");
      return;
    }
    
    const endpoint = reportType === "중간보고서"
      ? "summarize_report"
      : "summarize_finalreport";

    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await axios.post(
        `http://127.0.0.1:8000/api/gpt/${endpoint}/`,
        { project_id: projectId, today }
      );
      setSummaryHTML(response.data.summary);
      setIsModalOpen(true);
    } catch (error) {
      console.error("AI 요약 요청 실패:", error);
      alert("AI 요약 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 4) 보고서 저장
  const handleSaveReport = async () => {
    const contentToSave = summaryHTML;
    if (!reportType || !contentToSave) {
      alert("보고서 종류와 내용을 확인하세요.");
      return;
    }
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/users/report/save/",
        {
          title: reportType,
          content: contentToSave,
          user_id: userId,
          project_id: projectId,
        }
      );
      alert("보고서가 저장되었습니다.");
      setReportType("");
      setSummaryHTML("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("보고서 저장 실패:", error);
      alert("보고서 저장에 실패했습니다.");
      return;
    }
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/users/report/${projectId || 1}/`);
      setSavedReports(response.data.reports);
    } catch (error) {
      console.error("저장된 보고서 목록 불러오기 실패:", error);
    }
  };

  // 5) 수정 저장
  const handleUpdateReport = async () => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/users/report/update/${editingReport.report_id}/`,
        { title: editTitle, content: editContent }
      );
      const res = await axios.get(`http://127.0.0.1:8000/api/users/report/${projectId || 1}/`);
      setSavedReports(res.data.reports);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("수정 실패:", err);
      alert("수정에 실패했습니다.");
    }
  };

  // 6) 삭제
  const handleDeleteReport = async (report) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/users/report/delete/${report.report_id}/`
      );
      setSavedReports(savedReports.filter(r => r.report_id !== report.report_id));
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  // 7) Word 저장
  const handleExportDocx = async (report) => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/users/report/html2docx/${report.report_id}/`,
        { responseType: 'blob', withCredentials: true }
      );
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("보고서 DOCX 다운로드 실패:", err);
      alert("다운로드에 실패했습니다.");
    }
  };

  // 편집 버튼 클릭
  const handleEditClick = (report) => {
    setEditingReport(report);
    setEditTitle(report.title);
    setEditContent(report.content);
    setIsEditModalOpen(true);
  };

  const handleViewClick = (content) => {
    setViewContent(content);
    setIsViewModalOpen(true);
  };

  return (
    <div className="Report_wrapper">
      <Header
        nameInitials={nameInitials}
        currentProjectId={currentProjectId}
      />
      <Topbarst />
      <Topbar />

      {loading && <Loading message="보고서 작성 중입니다!" />}

      <div className="Report_container">
        <div className="Report_content">
          <div className="Report_editorCard">
            <select
              className="Report_typeSelect"
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="">보고서 종류를 선택하세요...</option>
              <option value="중간보고서">중간보고서</option>
              <option value="최종보고서">최종보고서</option>
            </select>

            <div className="Report_actions">
              <button 
                className="Report_aiBtn" 
                onClick={handleAISummary} 
                disabled={loading || !reportType}
              >
                <FaRobot />
                {loading ? "보고서 작성 중..." : "AI에게 양식 요청"}
              </button>
            </div>
          </div>

          {savedReports.length > 0 && (
            <div className="Report_savedSection">
              <h2 className="Report_sectionTitle">
                저장된 보고서
              </h2>
              <div className="Report_savedList">
                {savedReports.map((report, idx) => (
                  <div key={idx} className="Report_savedCard">
                    <div className="Report_savedHeader">
                      <h3>{report.title}</h3>
                      <span className="Report_savedDate">
                        {new Date(report.created_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div 
                      className="Report_savedContent"
                      onClick={() => handleViewClick(report.content)}
                      dangerouslySetInnerHTML={{ __html: report.content }}
                    />
                    <div className="Report_savedActions">
                      <button 
                        className="Report_wordBtn" 
                        onClick={() => handleExportDocx(report)}
                      >
                        <FaFileWord /> Word
                      </button>
                      <button 
                        className="Report_editBtn" 
                        onClick={() => handleEditClick(report)}
                      >
                        <FaEdit /> 수정
                      </button>
                      <button 
                        className="Report_deleteBtn" 
                        onClick={() => handleDeleteReport(report)}
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
            <div className="Report_modal" onClick={() => setIsModalOpen(false)}>
              <div className="Report_modalContent" onClick={(e) => e.stopPropagation()}>
                <div className="Report_modalHeader">
                  <h3>AI 요약 결과 ({reportType})</h3>
                  <button 
                    className="Report_modalClose" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="Report_modalBody">
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
                <div className="Report_modalFooter">
                  <button className="Report_saveBtn" onClick={handleSaveReport}>
                    <FaSave /> 저장하기
                  </button>
                  <button 
                    className="Report_cancelBtn" 
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
            <div className="Report_modal" onClick={() => setIsEditModalOpen(false)}>
              <div className="Report_modalContent" onClick={(e) => e.stopPropagation()}>
                <div className="Report_modalHeader">
                  <h3>보고서 수정</h3>
                  <button 
                    className="Report_modalClose" 
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="Report_modalBody">
                  <select
                    className="Report_typeSelect"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  >
                    <option value="중간보고서">중간보고서</option>
                    <option value="최종보고서">최종보고서</option>
                  </select>
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
                <div className="Report_modalFooter">
                  <button className="Report_saveBtn" onClick={handleUpdateReport}>
                    <FaSave /> 저장하기
                  </button>
                  <button 
                    className="Report_cancelBtn" 
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3) ▶ 여기에 “보기 전용” Modal을 추가 */}
          {isViewModalOpen && (
            <div className="Report_modal" onClick={() => setIsViewModalOpen(false)}>
              <div
                className="Report_modalContent"
                onClick={e => e.stopPropagation()}
              >
                <div className="Report_modalHeader">
                  <h3>보고서 내용 보기</h3>
                  <button
                    className="Report_modalClose"
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="Report_modalBody">
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

export default Report;