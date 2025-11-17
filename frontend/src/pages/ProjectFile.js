import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Header from '../components/Header';
import Topbarst from "../components/Topbarst";
import Topbar from "../components/Topbar";
import { FaFolder, FaFolderOpen, FaFile, FaDownload, FaSearch, FaCloudUploadAlt } from "react-icons/fa";
import "./ProjectFile.css";

export default function ProjectFile({ nameInitials, currentProjectId }) {
  const { projectId } = useParams();

  const [tasks, setTasks] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [filesByTask, setFilesByTask] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 1) 최상위 업무 불러오기
  useEffect(() => {
    if (!projectId) return;
    setLoadingTasks(true);
    axios.get(`http://127.0.0.1:8000/api/user/tasks/${projectId}/`, {
      withCredentials: true,
    })
    .then(res => {
      const parents = res.data.filter(t => t.parent_task == null);
      setTasks(parents);
      setErrorTasks(null);
    })
    .catch(err => {
      console.error(err);
      setErrorTasks("업무를 불러오는 중 오류가 발생했습니다.");
    })
    .finally(() => setLoadingTasks(false));
  }, [projectId]);

  // 2) 업무 클릭 → 파일 토글 & 로드
  const onTaskClick = (task) => {
    const id = task.task_id;
    const newExp = new Set(expanded);

      if (expanded.has(id)) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    return;
  }

    if (!filesByTask[id]) {
      axios.get("http://127.0.0.1:8000/api/task-files/", {
        // params: { task_id: id, include_children: true },
        params: { task_id: id, project_id: projectId ?? currentProjectId, include_children: true },
        withCredentials: true,
      })
      .then(res => {
        setFilesByTask(prev => ({ ...prev, [id]: res.data }));
      })
      .catch(err => {
        console.error(`파일 목록 로드 실패 (task ${id}):`, err);
        setFilesByTask(prev => ({ ...prev, [id]: [] }));
      })
      .finally(() => {
        setExpanded(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      });
    } else {
         setExpanded(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
    }
  };

  // 3) 파일 다운로드
  const handleDownload = async (e, fileId, fileName) => {
    e.stopPropagation();
    try {
       const res = await axios.get("http://127.0.0.1:8000/api/download-files/", {
        params: { file_id: fileId },
        withCredentials: true,
      });

      window.location.href = res.data.url;
    } catch (e) {
      console.error("다운로드 에러:", e);
      alert("다운로드에 실패했습니다.");
    }
  };

  // 파일 크기 포맷팅
    const formatFileSize = (bytes) => {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) return null; // 값 없으면 표시 안 함
    if (bytes === 0) return '0 Byte';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${(Math.round(val * 100) / 100).toFixed(2)} ${units[i]}`;
  };
  // 날짜 포맷팅
  const formatDate = (s) => {
  if (!s) return "-";
  let str = s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    str = s + '+09:00'; // 서버가 KST라면
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};


  // 파일 타입별 아이콘
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
      ppt: "📊", pptx: "📊", jpg: "🖼️", jpeg: "🖼️", png: "🖼️",
      gif: "🖼️", zip: "📦", rar: "📦", mp4: "🎥", mp3: "🎵"
    };
    return iconMap[ext] || "📎";
  };

  // 검색 필터링
  const filterFiles = (files) => {
  if (!searchTerm) return files;
  const q = searchTerm.toLowerCase();
  return files.filter(f => (f.file_name || '').toLowerCase().includes(q));
};

  return (
    <div className="ProjectFile_wrapper">
      <Header
        nameInitials={nameInitials}
        currentProjectId={currentProjectId}
      />
      <Topbarst />
      <Topbar />

      <div className="ProjectFile_container">
        <div className="ProjectFile_content">
          <div className="ProjectFile_header">
            <div className="ProjectFile_titleSection">
              <h1 className="ProjectFile_title">
                <FaFolder className="ProjectFile_titleIcon" />
                프로젝트 파일
              </h1>
              <p className="ProjectFile_subtitle">업무별 파일을 관리하고 다운로드하세요</p>
            </div>
            
            <div className="ProjectFile_controls">
              <div className="ProjectFile_searchBox">
                <FaSearch className="ProjectFile_searchIcon" />
                <input
                  type="text"
                  className="ProjectFile_searchInput"
                  placeholder="파일명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="ProjectFile_uploadBtn" onClick={() => setUploadModalOpen(true)}>
                <FaCloudUploadAlt />
                파일 업로드
              </button>
            </div>
          </div>

          <div className="ProjectFile_fileContent">
            {loadingTasks ? (
              <div className="ProjectFile_loading">
                <div className="ProjectFile_loadingSpinner"></div>
                <p>업무 목록을 불러오는 중...</p>
              </div>
            ) : errorTasks ? (
              <div className="ProjectFile_error">
                <p>⚠️ {errorTasks}</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="ProjectFile_empty">
                <p>📁 등록된 업무가 없습니다</p>
              </div>
            ) : (
              <div className="ProjectFile_taskList">
                {tasks.map((task) => {
                  const taskFiles = filesByTask[task.task_id] || [];
                  const filteredFiles = filterFiles(taskFiles);
                  const isExpanded = expanded.has(task.task_id);
                  
                  return (
                    <div key={task.task_id} className={`ProjectFile_taskItem ${isExpanded ? 'expanded' : ''}`}>
                      <div
                        className="ProjectFile_taskHeader"
                        onClick={() => onTaskClick(task)}
                      >
                        <div className="ProjectFile_taskInfo">
                          {isExpanded ? <FaFolderOpen className="ProjectFile_folderIcon" /> : <FaFolder className="ProjectFile_folderIcon" />}
                          <span className="ProjectFile_taskName">{task.task_name}</span>
                          <span className="ProjectFile_fileCount">
                            {taskFiles.length > 0 && `(${taskFiles.length}개 파일)`}
                          </span>
                        </div>
                        <div className="ProjectFile_expandIcon">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="ProjectFile_fileGrid">
                          {filteredFiles.length === 0 ? (
                            <div className="ProjectFile_noFiles">
                              <p>📭 등록된 파일이 없습니다</p>
                            </div>
                          ) : (
                            filteredFiles.map((file) => (
                              <div key={file.file_id} className="ProjectFile_fileCard">
                                <div className="ProjectFile_fileIcon">
                                  {getFileIcon(file.file_name)}
                                </div>
                                <div className="ProjectFile_fileInfo">
                                  <h4 className="ProjectFile_fileName">{file.file_name}</h4>
                                  <div className="ProjectFile_fileMeta">
                                    <span>{file.author}</span>
                                    <span className="ProjectFile_separator">•</span>
                                    <span>{formatDate(file.created_date)}</span>
                                     {formatFileSize(file.size) && (
                                      <>
                                        <span className="ProjectFile_separator">•</span>
                                        <span>{formatFileSize(file.size)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  className="ProjectFile_downloadBtn"
                                  onClick={(e) => handleDownload(e, file.file_id, file.file_name)}
                                  title="다운로드"
                                >
                                  <FaDownload />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 업로드 모달 */}
        {uploadModalOpen && (
          <div className="ProjectFile_modal" onClick={() => setUploadModalOpen(false)}>
            <div className="ProjectFile_modalContent" onClick={(e) => e.stopPropagation()}>
              <h2>파일 업로드</h2>
              <p>업무를 선택하고 파일을 업로드하세요</p>
              <select className="ProjectFile_taskSelect">
                <option value="">업무 선택...</option>
                {tasks.map(task => (
                  <option key={task.task_id} value={task.task_id}>{task.task_name}</option>
                ))}
              </select>
              <input type="file" className="ProjectFile_fileInput" />
              <div className="ProjectFile_modalActions">
                <button className="ProjectFile_cancelBtn" onClick={() => setUploadModalOpen(false)}>취소</button>
                <button className="ProjectFile_confirmBtn">업로드</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}