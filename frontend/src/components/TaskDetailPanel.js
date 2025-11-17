/* eslint-disable */
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TaskDetailPanel.css";

// axios 전역 기본 설정: 모든 요청에 쿠키(세션 정보)를 전송
axios.defaults.withCredentials = true;

function TaskDetailPanel({ task, projectId, onClose, onUpdate,  fetchTasks  }) {
  if (!task) return null;

  // 상태 관리
  const [userId, setUserId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(task.status || "요청");
  const [assigneeList, setAssigneeList] = useState([task.assignee].filter(Boolean));
  const [newAssignee, setNewAssignee] = useState(task.assignee || "");
  const [teamMembers, setTeamMembers] = useState([]);

  const [startDate, setStartDate] = useState(task.start_date ? task.start_date.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(task.end_date ? task.end_date.slice(0, 10) : "");

  // 탭 전환 (댓글 / 가이드)
  const [activeTab, setActiveTab] = useState("comment");

  // 상단 영역
  const projectName = task.project_name || "프로젝트 이름";
  const parentTaskName = task.parent_task_name || "상위 업무";
  const createdDate = task.created_date
    ? new Date(task.created_date).toLocaleDateString()
    : "생성일 미정";

  // 업무명 변경
  const [isEditingSubTask, setIsEditingSubTask] = useState(false);
  const [editedSubTaskName, setEditedSubTaskName] = useState(task.task_name || "");


  // 로그인된 사용자 ID 받아오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/users/name/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user_id) {
          setUserId(parseInt(data.user_id));
        }
      })
      .catch((err) =>
        console.error("🚨 사용자 정보를 불러오지 못했습니다.", err)
      );
  }, []);

  // 팀원 목록 불러오기 (task.project_id 또는 projectId 사용)
  useEffect(() => {
    const pid = task.project_id || projectId;
    if (!pid) return;
    const fetchTeamMembers = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/team-members/?project_id=${pid}`);
        setTeamMembers(res.data);
      } catch (err) {
        console.error("팀원 목록 가져오기 실패:", err);
      }
    };
    fetchTeamMembers();
  }, [task.project_id, projectId]);

  // task 변경 시 초기화
  useEffect(() => {
    if (task.task_id) fetchCommentsByTask(task.task_id);
    setStatus(task.status || "요청");
    setAssigneeList([task.assignee].filter(Boolean));
    setStartDate(task.start_date ? task.start_date.slice(0, 10) : "");
    setEndDate(task.end_date ? task.end_date.slice(0, 10) : "");
    setNewAssignee(task.assignee || "");
    // 편집용 상태 초기화
    setEditedSubTaskName(task.task_name || "");
    setIsEditingSubTask(false);
  }, [task]);

  // 댓글 불러오기: 날짜 포맷 변경 ("YYYY-MM-DD HH:mm") 및 작성자 처리
  const fetchCommentsByTask = async (taskId) => {
    try {
      const [commentRes, fileRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/comments/?task_id=${taskId}`),
        axios.get(`http://127.0.0.1:8000/api/task-files/?task_id=${taskId}`),  // ✅ task 기반 조회
      ]);
  
      const commentItems = commentRes.data.map((c) => ({
        type: "comment",
        id: c.comment_id,
        content: c.content,
        author: c.author || (c.user ? c.user.name : "알 수 없음"),
        created_date: new Date(c.created_date),
      }));
  
      const fileItems = fileRes.data.map((f) => ({
        type: "file",
        id: f.file_id,
        file_name: f.file_name,
        author: f.author,
        created_date: new Date(f.created_date),
      }));
  
      const merged = [...commentItems, ...fileItems].sort(
        (a, b) => a.created_date - b.created_date
      );
  
      setComments(merged);
    } catch (err) {
      console.error("댓글 및 파일 불러오기 실패:", err);
    }
  };
  
  
  
  
  const getDownloadLink = (fileName) => {
    const baseUrl = "https://s3.ap-northeast-2.amazonaws.com/infloop-aiservice";
    return `${baseUrl}/${encodeURIComponent(fileName)}`;
  };
  

 // 댓글 작성
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // 👉 userId 미확인 시 조기 return
    if (!userId) {
      console.error("사용자 ID(userId)가 없습니다.");
      return;
    }

    try {
      // 🔹 body: task → 백엔드에서 PrimaryKeyRelatedField 로 받음
      const body = {
        task   : task.task_id,
        content: newComment,
        user   : userId          // 세션 인증이면 생략 가능
      };

      // 🔹 여기서 res 선언
      const res = await axios.post(
        "http://127.0.0.1:8000/api/comments/",
        body
      );

      // 🔹 res 변수를 try 내부에서 바로 사용
      const newCommentObj = {
        type        : "comment",
        id          : res.data.comment_id,
        content     : res.data.content,
        author      : res.data.author ?? "알 수 없음",
        created_date: new Date(res.data.created_date)
      };

      setComments([...comments, newCommentObj]);
      setNewComment("");
    } catch (err) {
      console.error("댓글 작성 실패:", err);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || comments.length === 0) {
      alert("파일 업로드 전, 최소 1개의 댓글이 필요합니다!");
      return;
    }
    const currentTaskId = task.task_id;
    const targetTask = comments[0];
    const file = selectedFile;
  
    try {
      // 1. presigned URL 요청
      const presignedRes = await axios.get("http://127.0.0.1:8000/api/files/", {
        params: {
          file_name: file.name,
          file_type: file.type,
        },
      });
  
      const { url, fields } = presignedRes.data.data;
  
      // 2. FormData 구성
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("file", file);
  
      // ✅ 업로드 직전 로그
      console.log("🔁 S3 업로드 시작");
      console.log("업로드 대상 URL:", url);
      console.log("FormData 내용:", formData);
  
      // 3. S3에 업로드 요청
      const uploadRes = await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      // ✅ 업로드 응답 확인
      console.log("📦 S3 응답:", uploadRes);
  
      if (uploadRes.status === 204) {
        console.log("✅ S3 업로드 성공");
  
        // 4. 메타데이터 서버에 저장
        const fileMeta = {
          task : currentTaskId,   // 🔹 숫자 PK만 전달, key 이름은 "task"
          file_name: file.name,
          user: userId            // 세션 인증이면 생략 가능
        };

        const metaRes = await axios.post(
          "http://127.0.0.1:8000/api/save-file-meta/",
          fileMeta
        );
        console.log("📝 메타데이터 저장 응답:", metaRes);

        // 화면에 즉시 반영
        const newFileItem = {
          type:      "file",
          id:        metaRes.data.file_id,
          file_name: metaRes.data.file_name,
          author:    metaRes.data.author || "알 수 없음",
          created_date: new Date(metaRes.data.created_date),
        };
        setComments(prev => [...prev, newFileItem]);
  
        setSelectedFile(null);
      } else {
        console.error("❌ S3 응답 상태가 204가 아님:", uploadRes.status);
        alert("S3 업로드 실패");
      }
    } catch (err) {
      console.error("🚨 파일 업로드 중 오류:", err);
      alert("업로드 중 오류 발생");
    }
  };
  
  
  // 상태 변경 처리
  const handleStatusChange = async (e) => {
    if (!userId) {
      console.error("🚫 handleStatusChange → userId 없음");
      return;
    }
    console.log("▶ PATCH 요청에 실릴 userId =", userId);
    const newStatusLabel = e.target.value;
    setStatus(newStatusLabel);
    const statusMapping = { "요청": 0, "진행": 1, "피드백": 2, "완료": 3 };
    const newStatusInt = statusMapping[newStatusLabel];
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/`,
        { status: newStatusInt, user: userId } 
      );
      if (onUpdate) {
        onUpdate({ ...task, status: newStatusLabel });
      }
    } catch (err) {
      console.error("상태 업데이트 실패:", err);
      alert("상태 업데이트에 실패했습니다.");
    }
  };


  // 담당자 변경 처리
  const handleChangeAssignee = async () => {
    if (!newAssignee.trim()) return;
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/`,
        { assignee: newAssignee, user: userId }
      );
      setAssigneeList([newAssignee]);
      if (onUpdate) {
        onUpdate({ ...task, assignee: newAssignee });
      }
    } catch (err) {
      console.error("담당자 변경 실패:", err);
      alert("담당자 변경에 실패했습니다.");
    }
  };

  // 시작일 변경 처리
  const handleStartDateChange = async (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/`,
        { start_date: newStartDate, user: userId }
      );
      if (onUpdate) {
        onUpdate({ ...task, start_date: newStartDate });
      }
    } catch (err) {
      console.error("시작일 업데이트 실패:", err);
      alert("시작일 업데이트에 실패했습니다.");
    }
  };

  // 종료일 변경 처리
  const handleEndDateChange = async (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/`,
        { end_date: newEndDate, user: userId }
      );
      if (onUpdate) {
        onUpdate({ ...task, end_date: newEndDate });
      }
    } catch (err) {
      console.error("종료일 업데이트 실패:", err);
      alert("종료일 업데이트에 실패했습니다.");
    }
  };

  // AI 가이드 버튼 처리
  const handleAiGuide = async () => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/generate-ai-guide/`,
        {}
      );
      alert("AI 가이드라인이 성공적으로 생성되었습니다!");
    } catch (err) {
      console.error("AI 가이드라인 생성 실패:", err);
      alert("서비스 준비 중입니다.");
    }
  };

  // 하위업무명 저장 처리
  const handleSubTaskNameSubmit = async () => {
    if (!editedSubTaskName.trim() || editedSubTaskName === task.task_name) {
      setIsEditingSubTask(false);
      return;
    }
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/`,
        { task_name: editedSubTaskName, user: userId }
      );
      onUpdate && onUpdate({ ...task, task_name: editedSubTaskName });
    } catch (err) {
      console.error("하위업무 이름 업데이트 실패:", err);
      alert("업데이트에 실패했습니다.");
    } finally {
      setIsEditingSubTask(false);
    }
  };

  // 삭제 처리
const handleDeleteTask = async () => {
  if (!window.confirm("정말 이 업무를 삭제하시겠습니까?")) return;

  try {
    await axios.delete(
       `http://127.0.0.1:8000/api/tasks-no-project/${task.task_id}/`,
       { params: { user: userId } } 
    );
    window.location.reload();
    // 부모 컴포넌트에게도 알려주기 (필요하다면)
    onUpdate && onUpdate({ deletedTaskId: task.task_id });
    // 패널 닫기
    onClose();
  } catch (err) {
    console.error("업무 삭제 실패:", err);
    alert("업무 삭제에 실패했습니다.");
  }
};

  return (
    <div className="TaskDetailPanel_container">
      <button className="TaskDetailPanel_closeBtn" onClick={onClose}>
        닫기
      </button>

      {/* 상단 헤더 */}
      <div className="TDP_header">
        <div className="TDP_projectLine">
          <span className="TDP_projectName">{projectName}</span>
          <span className="TDP_separator">&gt;</span>
          <span className="TDP_parentTaskName">{parentTaskName}</span>
        </div>
        <div className="TDP_infoLine">
          <div className="TDP_assigneeDate">
            <p>담당자: {assigneeList.join(", ") || "미정"}</p>
            <p>생성일: {createdDate}</p>
          </div>
        </div>
      </div>

      {/* 하위 업무 + AI 가이드 버튼 */}
      <div className="TDP_subTaskLine">
        {!isEditingSubTask ? (
          <>
            <p className="TDP_subTaskTitle">
              {task.task_name || "업무 이름"}
            </p>
            <div className="TDP_buttonGroup">
              <button
                className="TDP_subTaskEditBtn"
                onClick={() => setIsEditingSubTask(true)}
              >
                수정 ✏️
              </button>
              <button className="TDP_aiGuideBtn" onClick={handleAiGuide}>
                가이드라인
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              className="TDP_subTaskTitleEdit"
              type="text"
              value={editedSubTaskName}
              onChange={(e) => setEditedSubTaskName(e.target.value)}
              autoFocus
            />
            <div className="TDP_buttonGroup">
              <button
                className="TDP_subTaskSaveBtn"
                onClick={handleSubTaskNameSubmit}
              >
                저장
              </button>
              <button
                className="TDP_subTaskCancelBtn"
                onClick={() => {
                  setEditedSubTaskName(task.task_name || "");
                  setIsEditingSubTask(false);
                }}
              >
                취소
              </button>
            </div>
          </>
        )}
      </div>

      {/* 상태 / 담당자 / 날짜 */}
      <div className="TDP_statusLine">
        <div className="TDP_statusSelect">
          <label>
            상태:
            <select value={status} onChange={handleStatusChange}>
              <option value="요청">요청</option>
              <option value="진행">진행</option>
              <option value="피드백">피드백</option>
              <option value="완료">완료</option>
            </select>
          </label>
        </div>
        <div className="TDP_assigneeAdd">
          <label>담당자: </label>
          <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}>
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <option key={member.user_id} value={member.name}>
                  {member.name}
                </option>
              ))
            ) : (
              <option value="">미정</option>
            )}
          </select>
          <button onClick={handleChangeAssignee}>변경</button>
        </div>
      </div>
      <div className="TDP_dates">
        <label>
          시작일:{" "}
          <input type="date" value={startDate} onChange={handleStartDateChange} />
        </label>
        <label>
          마감일:{" "}
          <input type="date" value={endDate} onChange={handleEndDateChange} />
        </label>
      </div>

      {/* 탭 버튼 (댓글 / 가이드라인) */}
      <div className="TDP_tabs">
        <button
          className={activeTab === "comment" ? "active" : ""}
          onClick={() => setActiveTab("comment")}
        >
          댓글
        </button>
        <button
          className={activeTab === "guide" ? "active" : ""}
          onClick={() => setActiveTab("guide")}
        >
          가이드라인
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="TDP_tabContent">
        {activeTab === "comment" ? (
          <div className="TDP_commentArea">
            {comments.length === 0 ? (
              <p>아직 댓글이 없습니다.</p>
            ) : (
              <ul className="TDP_commentList">
                {comments.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="TDP_commentItem">
                    {item.type === "comment" ? (
                      <>
                        <span className="TDP_commentAuthor">{item.author}</span>
                        <span className="TDP_commentContent">{item.content}</span>
                      </>
                    ) : (
                      <>
                        <span className="TDP_commentAuthor">{item.author}</span> {/* ← 이 줄 수정 */}
                        <a
                          href={getDownloadLink(item.file_name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="TDP_commentContent"
                        >
                          {item.file_name}
                        </a>
                      </>
                    )}
                    <span className="TDP_commentDate">
                      {new Date(item.created_date).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>



            )}
          </div>
        ) : (
          <div className="TDP_guideArea">
            <p>AI로 생성된 가이드라인 내용이 여기에 표시됩니다.</p>
            <p>생성된 가이드라인이 없다면 비어 있습니다.</p>
          </div>
        )}
      </div>

      {/* 입력 영역 (댓글 작성 및 파일 첨부) */}
      <div className="TDP_inputRow">
        <form onSubmit={handleCommentSubmit} className="TDP_commentForm">
          <input
            type="text"
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit">등록</button>
        </form>
        <form onSubmit={handleFileUpload} className="TDP_fileForm">
          <label className="TDP_fileLabel">
            파일 첨부:
            <input type="file" name="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
          </label>
          {selectedFile && (
            <p className="TDP_selectedFile">📎 {selectedFile.name}</p>
          )}
          <button type="submit">업로드</button>
        </form>

        {/* 하단: 업무 삭제 버튼 */}
          <button
            className="TDP_deleteBtn"
            onClick={handleDeleteTask}
          >
            업무 삭제
          </button>
      </div>
    </div>
  );
}

export default TaskDetailPanel;
