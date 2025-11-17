import React, { useState, useEffect, useMemo } from 'react';
import axios from "axios";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import "./MainPage.css";

// 아이콘 컴포넌트들
const LayoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);

const CheckSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "none"} stroke={filled ? "#fbbf24" : "currentColor"} strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// 날짜 포맷 통일을 위한 헬퍼 함수

const formatDate = (dateInput) => {
  const dateObj = new Date(dateInput);
  return dateObj
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, "-")
    .replace(/\./g, "");
};
const getToday = () => formatDate(new Date());

// O(1) 조회용 맵
const buildScheduleMap = (arr) => {
  const map = new Map();
  for (const it of arr) {
    const d = formatDate(it.date); // 서버가 YYYY-MM-DD/ISO 혼재여도 통일
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(it);
  }
  return map;
};



// 날짜 차이 계산 함수
const getDaysDifference = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return Math.round((firstDate - secondDate) / oneDay);
};

function MainPage({ userId, userName }) {
  // 선택/상태
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // 데이터 상태
  const [projects, setProjects] = useState([]);
  const [projectLogs, setProjectLogs] = useState([]);

  // 캘린더 상태(맵)
  const [date, setDate] = useState(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [schedulesMap, setSchedulesMap] = useState(new Map());     // 개인 일정 맵
  const [teamSchedulesMap, setTeamSchedulesMap] = useState(new Map()); // 팀 일정 맵

  // 통계
  const [stats, setStats] = useState({
    totalProjects: 0,
    myTasks: 0,          // 내가 맡은 전체 업무
    incompleteTasks: 0,  // 요청+진행
    feedbackTasks: 0,    // 피드백
    urgentTasks: 0
  });

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    type: '',
    tasks: [],
    projects: [],   // 추가
    title: '',
    total: 0
  });

  // month 파라미터(YYYY-MM) → 달 이동 시 재요청
  const monthParam = `${activeStartDate.getFullYear()}-${String(activeStartDate.getMonth() + 1).padStart(2, "0")}`;

  // 대시보드 한 번 호출
  useEffect(() => {
    if (!userId) return;
    const ctrl = new AbortController();

    (async () => {
      try {
        const { data } = await axios.get(
          `http://127.0.0.1:8000/api/users/${userId}/dashboard/?month=${monthParam}`,
          { withCredentials: true, signal: ctrl.signal }
        );

        setProjects(data.projects ?? []);
        setProjectLogs(data.recent_logs ?? []);
        setStats({
          totalProjects: (data.projects ?? []).length,
          myTasks:          data.task_stats?.my_tasks ?? 0,
          incompleteTasks:  data.task_stats?.incomplete_tasks ?? 0,
          feedbackTasks:    data.task_stats?.feedback_tasks ?? 0,
          urgentTasks:      data.task_stats?.urgent_tasks ?? 0
        });

        setSchedulesMap(buildScheduleMap(data.calendar?.my ?? []));
        setTeamSchedulesMap(buildScheduleMap(data.calendar?.team ?? []));
      } catch (e) {
        if (!axios.isCancel(e)) console.error('대시보드 로드 실패:', e);
      }
    })();

    return () => ctrl.abort();
  }, [userId, monthParam]);

  // 프로젝트 로그 (선택했을 때만 개별 호출 유지)
  const fetchProjectLogs = async (projectId) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/projects/${projectId}/logs/`,
        { withCredentials: true }
      );
      setProjectLogs(response.data);
    } catch (error) {
      console.error('Error fetching project logs:', error);
    }
  };

  // 모달 데이터
  const fetchTaskDetails = async (type) => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/users/task-details/?type=${type}`,
          { withCredentials: true }
        );
      const titles = {
        my: '내가 맡은 업무',
        incomplete: '미완료된 업무',
        feedback: '피드백 필요한 업무',
        completed: '완료한 업무',
        urgent: '긴급 업무'
      };
        setModalData({
          type,
          tasks: response.data.tasks,
          title: titles[type],
          total: response.data.total
        });
        setShowModal(true);
      } catch (error) {
        console.error('Error fetching task details:', error);
      }
    };

  const closeModal = () => {
    setShowModal(false);
    setModalData({ type: '', tasks: [], title: '', total: 0 });
  };

  // D-day/날짜 포맷(모달용)
  const formatModalDate = (dateString) => {
    if (!dateString) return "날짜 없음";
    const d = new Date(dateString);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const calculateDDay = (endDate) => {
    if (!endDate) return "";
    const today = new Date();
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `D+${Math.abs(diffDays)}`;
    if (diffDays === 0) return "D-Day";
    return `D-${diffDays}`;
  };

  // 즐겨찾기
  const handleFavoriteToggle = async (projectId, isFavorite) => {
    const effectiveIsFavorite = isFavorite ?? false;
    if (!effectiveIsFavorite) {
      const currentFavorites = projects.filter(p => p.is_favorite);
      if (currentFavorites.length >= 3) {
        alert('최대 3개의 즐겨찾기를 등록할 수 있습니다.');
        return;
      }
    }
    const url = `http://127.0.0.1:8000/api/users/${userId}/projects/${projectId}/favorite/`;
    const method = effectiveIsFavorite ? 'delete' : 'post';

    try {
      await axios({ method, url, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      setProjects(prev =>
        prev.map(p => p.project_id === projectId ? { ...p, is_favorite: !effectiveIsFavorite } : p)
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // 프로젝트 클릭 → 로그 불러오기(선택 토글)
  const handleProjectSelect = (projectId) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    } else {
      setSelectedProjectId(projectId);
      fetchProjectLogs(projectId);
    }
  };

  // 정렬 (useMemo 권장)
  const orderedProjects = useMemo(() => {
    const favoriteProjects = projects.filter(p => p.is_favorite);
    const nonFavoriteProjects = projects
      .filter(p => !p.is_favorite)
      .sort((a, b) => {
        const aNum = /^\d/.test(a.project_name);
        const bNum = /^\d/.test(b.project_name);
        if (aNum && !bNum) return 1;
        if (!aNum && bNum) return -1;
        return a.project_name.localeCompare(b.project_name, 'ko', { sensitivity: 'base' });
      });
    return [...favoriteProjects, ...nonFavoriteProjects];
  }, [projects]);

// 프로젝트 목록 모달 열기 (대시보드에서 이미 받은 projects 사용)
const fetchProjectList = () => {
  setModalData({
    type: 'projects',
    projects,                      // 현재 상태의 프로젝트 배열
    tasks: [],
    title: '내 프로젝트',
    total: projects.length
  });
  setShowModal(true);
};

  // 오늘/선택일 일정 (맵으로 O(1))
  const today = getToday();
  const todaySchedules = schedulesMap.get(today) || [];
  const todayTeamSchedules = teamSchedulesMap.get(today) || [];
  const selectedDateSchedules = selectedDate ? (schedulesMap.get(selectedDate) || []) : [];
  const selectedDateTeamSchedules = selectedDate ? (teamSchedulesMap.get(selectedDate) || []) : [];

  // 로그 파싱
  const parseSnapshot = (content = "") => {
    const m = content.match(/^\[task_id=(\d+)\]\s*(.*?)\s*(업무가\s*삭제됨|업무\s*생성)?$/u);
    if (!m) return { id: null, name: content.trim(), verb: "" };
    return { id: m[1], name: m[2].trim(), verb: (m[3] || "").trim() };
  };
  const labelClass = (action) => ({
    "댓글 등록": "action-댓글등록",
    "업무 상태 변경": "action-업무상태변경",
    "담당자 변경": "action-담당자변경",
    "상위 업무 생성": "action-업무생성",
    "하위 업무 생성": "action-업무생성",
    "상위 업무 삭제": "action-업무삭제",
    "하위 업무 삭제": "action-업무삭제",
    "파일 업로드": "action-파일업로드",
  }[action] || "");

  return (
    <div className="main-container">
      <div className="dashboard-container">
        <div className="dashboard-content">

          {/* Top Stats */}
          {/* Top Stats (개편) */}
          <div className="stats-grid">
            <div className="stat-card clickable" onClick={() => fetchTaskDetails('my')}>
              <div className="stat-header">
                <div className="stat-icon purple-bg"><LayoutIcon /></div>
                <span className="stat-badge purple">내 업무</span>
              </div>
              <h3 className="stat-number">{stats.myTasks}</h3>
              <p className="stat-label">내가 맡은 업무</p>
            </div>

            <div className="stat-card clickable" onClick={() => fetchTaskDetails('incomplete')}>
              <div className="stat-header">
                <div className="stat-icon blue-bg"><FolderIcon /></div>
                <span className="stat-badge blue">미완료</span>
              </div>
              <h3 className="stat-number">{stats.incompleteTasks}</h3>
              <p className="stat-label">미완료된 업무</p>
            </div>

            <div className="stat-card clickable" onClick={() => fetchTaskDetails('feedback')}>
              <div className="stat-header">
                <div className="stat-icon green-bg"><CheckSquareIcon /></div>
                <span className="stat-badge green">피드백</span>
              </div>
              <h3 className="stat-number">{stats.feedbackTasks}</h3>
              <p className="stat-label">피드백 필요한 업무</p>
            </div>

            <div className="stat-card clickable" onClick={() => fetchTaskDetails('urgent')}>
              <div className="stat-header">
                <div className="stat-icon red-bg"><AlertCircleIcon /></div>
                <span className="stat-badge red pulse">긴급</span>
              </div>
              <h3 className="stat-number">{stats.urgentTasks}</h3>
              <p className="stat-label">긴급 사항</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="content-grid">
            {/* Projects */}
            <div className="projects-section">
              <div className="section-card">
                <div className="section-header">
                  <h2 className="section-title">프로젝트 현황</h2>
                  <span className="section-count-badge"> {stats.totalProjects}</span>
                </div>
                {userId ? (
                  <div className="projects-list">
                    {orderedProjects.map(project => (
                      <div
                        key={project.project_id}
                        onClick={() => handleProjectSelect(project.project_id)}
                        className={`project-card ${selectedProjectId === project.project_id ? 'selected' : ''}`}
                      >
                        <div className="project-header">
                          <div className="project-title-wrapper">
                            <div
                              className="favorite-star"
                              onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(project.project_id, project.is_favorite); }}
                            >
                              <StarIcon filled={project.is_favorite} />
                            </div>
                            <div>
                              <h3 className="project-name">{project.project_name}</h3>
                              <p className="project-desc">팀 프로젝트</p>
                            </div>
                          </div>
                        </div>

                        <div className="progress-section">
                          <div className="progress-info">
                            <span>진행률</span>
                            <span className="progress-value">{project.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${project.progress}%` }}></div>
                          </div>
                        </div>

                        {selectedProjectId === project.project_id && (
                          <div className="project-detail-inline">
                            <div className="detail-item">
                              <span>진행중인 업무</span>
                              <span className="detail-value">{project.ongoing_tasks || 0}개</span>
                            </div>
                            <div className="detail-item">
                              <span>남은 기간</span>
                              <span className={`detail-value ${project.remaining_days !== null && project.remaining_days < 7 ? 'red-text' : ''}`}>
                                {project.remaining_days !== null && project.remaining_days !== undefined 
                                  ? `${project.remaining_days}일` 
                                  : '기한 없음'}
                              </span>
                            </div>
                            <button
                              className="detail-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetch("http://127.0.0.1:8000/api/users/projects/set/", {
                                  method: "POST",
                                  credentials: "include",
                                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                  body: new URLSearchParams({ project_id: project.project_id }),
                                })
                                  .then((res) => res.json())
                                  .then(() => { window.location.href = `/project/${project.project_id}/task`; })
                                  .catch((err) => console.error("Error setting project ID:", err));
                              }}
                            >
                              프로젝트 상세 보기 <ChevronRightIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="loading-container"><p>Loading...</p></div>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="center-section">
              <div className="section-card calendar-section">
                <h2 className="section-title">캘린더</h2>

                <div className="calendar-wrapper">
                  <Calendar
                    onChange={setDate}
                    value={date}
                    onClickDay={(value) => setSelectedDate(formatDate(value))}
                    locale="ko-KR"
                    calendarType="gregory"
                    onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)}
                    tileClassName={({ date }) => {
                      if (date.getMonth() !== activeStartDate.getMonth()) return "neighboring-month";
                      const day = date.getDay();
                      if (day === 0) return "sunday";
                      if (day === 6) return "saturday";
                      return "";
                    }}
                    tileContent={({ date }) => {
                      const d = formatDate(date);
                      const personal = (schedulesMap.get(d) || []).length;
                      const team = (teamSchedulesMap.get(d) || []).length;
                      if (personal || team) {
                        return (
                          <div className="event-markers">
                            {personal > 0 && <span className="event-dot personal"></span>}
                            {team > 0 && <span className="event-dot team"></span>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </div>

                {/* 오늘/선택 일정 */}
                <div className="schedule-summary">
                  <div className="schedule-day">
                    <h4 className="schedule-day-title">오늘 일정</h4>
                    <div className="schedule-items">
                      {todaySchedules.length === 0 && todayTeamSchedules.length === 0 ? (
                        <p className="no-schedule">일정이 없습니다</p>
                      ) : (
                        <>
                          {todaySchedules.map(s => (
                            <div key={s.schedule_id} className="schedule-item">
                              <span className="schedule-dot personal"></span>
                              <span className="schedule-text">{s.title}</span>
                            </div>
                          ))}
                          {todayTeamSchedules.map(s => (
                            <div key={s.task_id} className="schedule-item">
                              <span className="schedule-dot team"></span>
                              <span className="schedule-text">{s.task_name}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="schedule-day">
                    <h4 className="schedule-day-title">
                      {selectedDate ? `${selectedDate} 일정` : '날짜를 선택하세요'}
                    </h4>
                    <div className="schedule-items">
                      {selectedDate ? (
                        selectedDateSchedules.length === 0 && selectedDateTeamSchedules.length === 0 ? (
                          <p className="no-schedule">일정이 없습니다</p>
                        ) : (
                          <>
                            {selectedDateSchedules.map(s => (
                              <div key={s.schedule_id} className="schedule-item">
                                <span className="schedule-dot personal"></span>
                                <span className="schedule-text">{s.title}</span>
                              </div>
                            ))}
                            {selectedDateTeamSchedules.map(s => (
                              <div key={s.task_id} className="schedule-item">
                                <span className="schedule-dot team"></span>
                                <span className="schedule-text">{s.task_name}</span>
                              </div>
                            ))}
                          </>
                        )
                      ) : (
                        <p className="no-schedule">캘린더에서 날짜를 클릭하세요</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Recent Activity */}
            <div className="right-section">
              <div className="section-card activity-section">
                <h2 className="section-title-activity">최근 활동</h2>
                <div className="activity-list">
                  {projectLogs.length === 0 ? (
                    <p className="no-activity">활동 내역이 없습니다</p>
                  ) : (
                    projectLogs.slice(0, 10).map((log, idx) => {
                      const uname = log.user_name || log.user || "알 수 없음";
                      const createdAt = log.created_date || log.date;
                      const taskObj = log.task_name || log.task || null;
                      const snap = parseSnapshot(log.content || "");
                      const taskName = taskObj || snap.name;
                      const bodyText = snap.verb || (log.content || "").replace(/^\[task_id=\d+\]\s*/u, "");

                      return (
                        <div className="activity-log-item" key={idx}>
                          <div className="activity-log-header">
                            <div className="activity-user-info">
                              <span className="activity-user-name">{uname}</span>
                              <span className={`activity-action-label ${labelClass(log.action)}`}>
                                {log.action}
                              </span>
                            </div>
                            <span className="activity-time">
                              {createdAt && new Date(createdAt).toLocaleString('ko-KR', {
                                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="activity-task-name">업무: {taskName}</p>
                          {bodyText && <p className="activity-content">{bodyText}</p>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {showModal && (
              <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2 className="modal-title">{modalData.title}</h2>
                    <button className="modal-close" onClick={closeModal}>×</button>
                  </div>

                  <div className="modal-body">
                    {/* 프로젝트 모달 */}
                    {modalData.type === 'projects' ? (
                      modalData.projects.length === 0 ? (
                        <p className="no-tasks">프로젝트가 없습니다.</p>
                      ) : (
                        <div className="task-list">
                          {modalData.projects.map((p) => (
                            <div key={p.project_id} className="task-item">
                              <div className="task-info">
                                <h4 className="task-name">{p.project_name}</h4>
                                <div className="task-meta">
                                  <span className="project-info">진행률 {p.progress}%</span>
                                  <span className={`due-date ${p.remaining_days !== null && p.remaining_days < 7 ? 'red-text' : ''}`}>
                                    {p.remaining_days !== null && p.remaining_days !== undefined ? `남은 ${p.remaining_days}일` : '기한 없음'}
                                  </span>
                                </div>
                              </div>
                              <button
                                className="detail-button"
                                onClick={() => {
                                  fetch("http://127.0.0.1:8000/api/users/projects/set/", {
                                    method: "POST",
                                    credentials: "include",
                                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                    body: new URLSearchParams({ project_id: p.project_id }),
                                  })
                                    .then((res) => res.json())
                                    .then(() => { window.location.href = `/project/${p.project_id}/task`; })
                                    .catch((err) => console.error("Error setting project ID:", err));
                                }}
                              >
                                프로젝트 상세 보기 <ChevronRightIcon />
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      /* 기존 업무 모달 그대로 */
                      <>
                        {modalData.tasks.length === 0 ? (
                          <p className="no-tasks">업무가 없습니다.</p>
                        ) : (
                          <div className="task-list">
                            {modalData.tasks.map((task) => (
                              <div key={task.task_id} className="task-item">
                                <div className="task-info">
                                  <h4 className="task-name">{task.task_name}</h4>
                                  <p className="project-info">📁 {task.project_name}</p>
                                  <div className="task-meta">
                                    <span className={`status-badge status-${task.status_code}`}>{task.status}</span>
                                    <span className="due-date">
                                      {formatModalDate(task.end_date)}
                                      {modalData.type === 'urgent' && task.end_date && (
                                        <span className="d-day"> ({calculateDDay(task.end_date)})</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="modal-footer">
                    <p className="task-count">총 {modalData.total}{modalData.type === 'projects' ? '개의 프로젝트' : '개의 업무'}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;