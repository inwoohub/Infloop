/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaPlus, FaCaretRight, FaCaretDown } from "react-icons/fa";
import Topbar from "../components/Topbar";
import Topbarst from "../components/Topbarst";
import TaskDetailPanel from "../components/TaskDetailPanel";
import "./TaskPage.css";
import Header from '../components/Header';

function TaskPage({ nameInitials, currentProjectId }) {
  const { projectId } = useParams();
  
  const [tasks, setTasks] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleDays, setVisibleDays] = useState(21);
  const [cellWidth, setCellWidth] = useState(40);
  const [userName, setUserName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [statusFilters, setStatusFilters] = useState({
    요청: true,
    진행: true,
    피드백: true,
    완료: true,
    보류: true,
  });
  const [filterOpen, setFilterOpen] = useState(false);

  // 상세 패널용 상태
  const [selectedTask, setSelectedTask] = useState(null);

  // 드래그 스크롤용
  const tableContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 하위업무 추가할 때 사용할 부모 ID
  const [subtaskParentId, setSubtaskParentId] = useState("");

  // 루트 업무만 뽑아서 옵션으로 보여줍니다
  const topLevelTasks = tasks.filter((t) => t.parent_task == null);

  const [currentUserId, setCurrentUserId] = useState(null);




  // 사용자 정보 (이름)
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/name/", {
          withCredentials: true,
        });
        setUserName(response.data.name);
        setCurrentUserId(response.data.user_id);
      } catch (error) {
        alert("사용자 정보를 가져오는 데 실패했습니다.");
      }
    };
    fetchUserInfo();
  }, []);

  // projectId 변화 시 업무 목록 로드
  useEffect(() => {
    if (projectId) {
      fetchTasksByProject(projectId);
    }
  }, [projectId]);

  // 업무 목록 API
  const fetchTasksByProject = async (id) => {
    try {
      const url = `http://127.0.0.1:8000/api/user/tasks/${id}/`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      const tasksArray = data.results
        ? data.results
        : Array.isArray(data)
        ? data
        : [];

      // DB의 상태값을 문자열로 변환해서 매핑 (예: "0" → "요청")
      const mapped = tasksArray.map((task) => ({
        ...task,
        task_name: task.task_name || "제목 없음",
        start_date: task.start_date || "2025-03-20T00:00:00",
        end_date: task.end_date || "2025-03-20T23:59:59",
        status:
          task.status === "0"
            ? "요청"
            : task.status === "1"
            ? "진행"
            : task.status === "2"
            ? "피드백"
            : task.status === "3"
            ? "완료"
            : "보류",
        assignee: task.assignees ? task.assignees[0] : "미정",
        parent_task_id: task.parent_task ?? null,
      }));
      setTasks(mapped);
    } catch (e) {
      console.error("업무 불러오기 실패", e);
    }
  };

  // onUpdate 콜백: TaskDetailPanel에서 변경된 태스크 데이터를 받아 
  // tasks 배열과 선택된 태스크(selectedTask)를 업데이트
  const handleTaskUpdate = (updatedTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.task_id === updatedTask.task_id ? { ...t, ...updatedTask } : t
      )
    );
    setSelectedTask((prev) =>
      prev && prev.task_id === updatedTask.task_id ? { ...prev, ...updatedTask } : prev
    );
  };

  // 필터링 함수
  const filterTasks = (tasks) => {
    let filtered = tasks;
    if (categoryFilter === "내 업무" && userName) {
      filtered = filtered.filter((task) => task.assignee === userName);
    }
    filtered = filtered.filter((task) => statusFilters[task.status]);
    filtered = filtered.filter((task) =>
      task.task_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered;
  };
  const filteredTasks = filterTasks(tasks);

  // 트리 구조 생성 함수 (부모-자식 관계)
  const buildTree = (tasks) => {
    const map = {};
    const roots = [];
    tasks.forEach((t) => (map[t.task_id] = { ...t, children: [] }));
    tasks.forEach((t) => {
      if (t.parent_task) {
        map[t.parent_task]?.children.push(map[t.task_id]);
      } else {
        roots.push(map[t.task_id]);
      }
    });
    return roots;
  };
  const filteredTree = buildTree(filteredTasks);

  // 트리 확장/접기 토글
  const toggleExpand = (taskId) => {
    const newSet = new Set(expanded);
    newSet.has(taskId) ? newSet.delete(taskId) : newSet.add(taskId);
    setExpanded(newSet);
  };

  // 날짜 계산 함수들
  const parseDate = (dateStr) => (dateStr ? new Date(dateStr) : null);
  const addDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };
  const generateDateRange = (start, days) => {
    const arr = [];
    for (let i = 0; i < days; i++) {
      arr.push(addDays(start, i));
    }
    return arr;
  };

  

  // 최소 시작일부터 visibleDays만큼의 날짜 범위 계산
  const startDates = tasks
    .map((t) => parseDate(t.start_date))
    .filter((d) => d && !isNaN(d.getTime()));
  const minStart =
    startDates.length > 0 ? new Date(Math.min(...startDates)) : new Date();
     // 1) 모든 task의 종료일(EndDate)을 모아서
  const endDates = tasks
    .map((t) => parseDate(t.end_date))
    .filter((d) => d && !isNaN(d.getTime()));

  // 2) 그 중 가장 늦은 날짜를 구하고
  const maxEnd =
    endDates.length > 0
      ? new Date(Math.max(...endDates.map((d) => d.getTime())))
      : addDays(minStart, visibleDays - 1);
    

  // 2) 전체 날짜(fullDateRange): 헤더용 (고정)
const fullDays    = Math.floor((maxEnd - minStart)/(1000*60*60*24)) + 1;
const fullDateRange = generateDateRange(minStart, fullDays);

const totalDays =
         Math.floor((maxEnd.getTime() - minStart.getTime()) / (1000*60*60*24)) + 1;
       // visibleDays 만큼만 보여주되, 전체 범위(totalDays)보다 크면 totalDays
       const daysToShow = Math.min(visibleDays, totalDays);
       const dateRange = generateDateRange(minStart, totalDays);


  // 헤더 그룹: YYYY-MM과 일자로 구성
  const groupDates = (dates) => ({
    mode: "day",
    groups: dates.map((d) => ({
      label: d.getDate(),
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    })),
  });
  const headerGroups = groupDates(dateRange);

 
  const calcBarStyle = (start, end, status) => {
    const s = parseDate(start), e = parseDate(end);
    if (!s || !e) return { left: 0, width: 0 };
    const offsetDays = Math.floor((s - minStart) / (1000*60*60*24));
    const durDays    = Math.floor((e - s) / (1000*60*60*24)) + 1;
    return {
      position: "absolute",
      top:          '50%',                     // ← 부모 높이의 50%
    transform:    'translateY(-50%)',        // ← 자기 높이의 절반만큼 위로
      left:   `${offsetDays * cellWidth}px`,
      width:  `${durDays    * cellWidth}px`,
      height: "12px",        // 막대 높이
      borderRadius: "6px",
      backgroundColor: getStatusColor(status)
    };
  };

  // 상태에 따른 색상 반환
  const getStatusColor = (status) => {
    switch (status) {
      case "요청":
        return "#2196F3";
      case "진행":
        return "#13a75d";
      case "피드백":
        return "#FF9800";
      case "완료":
        return "rgb(163, 156, 231)";
      default:
        return "#909399";
    }
  };

  // 업무명 클릭 시 상세 패널 토글
  const handleTaskNameClick = (task) => {
    if (selectedTask && selectedTask.task_id === task.task_id) {
      setSelectedTask(null);
    } else {
      setSelectedTask(task);
    }
  };
  

  // 트리 렌더링
  const renderRows = (nodes, level = 0) => {
    return nodes.flatMap((task) => {
      if (!task) return [];
      const hasChildren = task.children?.length > 0;
      const isOpen = expanded.has(task.task_id);
      const indentStyle = { paddingLeft: `${level * 20}px` };

      return [
        <tr key={task.task_id}>
          <td className="fixed-col col-task" title={task.task_name}>
            <div style={indentStyle} className="TreeItem">
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(task.task_id);
                  }}
                  className="ToggleBtn"
                >
                  {isOpen ? <FaCaretDown /> : <FaCaretRight />}
                </span>
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskNameClick(task);
                }}
              >
                {task.task_name.length > 15
                  ? task.task_name.slice(0, 15) + "..."
                  : task.task_name}
              </span>
            </div>
          </td>
          <td className="fixed-col col-assignee">{task.assignee}</td>
          <td className="fixed-col col-status">
            <span className={`StatusBadge status-${task.status}`}>
              {task.status}
            </span>
            
          </td>
          <td colSpan={headerGroups.groups.length} className="gantt-cell">
          <div className="gantt-bar" style={calcBarStyle(
              task.start_date,
              task.end_date,
            task.status
            )} />
          </td>
        </tr>,
        ...(isOpen ? renderRows(task.children, level + 1) : []),
      ];
    });
  };

  // 드래그 스크롤 핸들러
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = tableContainerRef.current.getBoundingClientRect();
    setStartX(e.clientX - rect.left);
    setScrollLeft(tableContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const rect = tableContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const walk = x - startX;
    tableContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // ───────────────────────────────────────────────
  // 루트(상위) 업무 생성  +  TaskManager 자동 연결
  // ───────────────────────────────────────────────
  const handleAddTask = async () => {
    const name = window.prompt("상위 업무명을 입력하세요");
    if (!name?.trim()) return;

    if (!currentUserId) {
      alert("사용자 정보가 아직 로드되지 않았습니다.");
      return;
    }

    try {
      /* 1) Task 생성 ― project_id, user 를 함께 전송하면
            백엔드 perform_create() 가 TaskManager 한 줄을 자동 삽입 */
      const { data: task } = await axios.post(
        "http://127.0.0.1:8000/api/tasks-no-project/",
        {
          task_name:  name,
          status:     0,                         // 요청 상태
          start_date: new Date().toISOString(),
          end_date:   new Date().toISOString(),
          parent_task: null,                     // 최상위 업무
          project_id: projectId,
          user:       currentUserId              // B안: user PK 직접 전달
        },
        { withCredentials: true }               // 세션 쿠키 전송
      );

      /* 2) 프런트 상태 갱신 */
      setTasks(prev => [...prev, { ...task, children: [] }]);

      /* 3) 새로고침(혹은 onUpdate 사용) */
      window.location.reload();

    } catch (err) {
      console.error("업무 추가 실패:", err);
      alert("업무 추가에 실패했습니다.");
    }
  };


  
  // 하위업무 추가 --------------------------------------------------
  const handleAddSubtask = async (parentId) => {
    const name = window.prompt("하위 업무명을 입력하세요");
    if (!name?.trim()) return;

    if (!currentUserId) {
      alert("사용자 정보가 아직 로드되지 않았습니다.");
      return;
    }

    try {
      /* 1) Task(하위업무) 생성 ― TaskManager 레코드는
            백엔드 perform_create에서 자동으로 1줄 삽입됨 */
      const { data: task } = await axios.post(
        "http://127.0.0.1:8000/api/tasks-no-project/",
        {
          task_name:   name,
          status:      0,                       // 숫자 코드
          start_date:  new Date().toISOString(),
          end_date:    new Date().toISOString(),
          parent_task: parentId,
          project_id:  projectId,
          user:        currentUserId            // B안: user PK 직접 전달
        },
        { withCredentials: true }               // 세션 쿠키 전송
      );

      // 2) 프런트 상태 갱신
      setTasks(prev => [...prev, { ...task, children: [] }]);
      setExpanded(s => new Set(s).add(parentId));

      // 3) 필요하면 새로고침 대신 onUpdate 콜백 활용
      window.location.reload();
    } catch (err) {
      console.error("하위 업무 추가 실패:", err);
      alert("하위 업무 추가에 실패했습니다.");
    }
  };




const flatList = [];
const flatten = (nodes, level = 0) => {
  nodes.forEach(n => {
    flatList.push({ task: n, level });
    if (expanded.has(n.task_id)) {
      flatten(n.children, level + 1);
    }
  });
};
flatten(filteredTree);

// dateRange: 실제 화면에 보여질 날짜(Date[]) 배열
const buildWeekGroups = (dates) => {
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    const weekIndex = Math.floor(i / 7) + 1;
    const span = Math.min(7, dates.length - i);
    weeks.push({ label: `${weekIndex}주차`, span });
  }
  return weeks;
};
const weekGroups = buildWeekGroups(fullDateRange);



  return (
    <div className="TaskPage_wrapper">
      
      <div className="TaskPage_Topbarst_header">
      <Header
          nameInitials={nameInitials}
          currentProjectId={currentProjectId}
        />
        <Topbarst />
        <Topbar />
        {/* 컨트롤 바 */}
        <div className="TaskPage_controlRow">
          <div className="ControlLeft">
            <input
              type="text"
              className="TaskNameInput"
              placeholder="업무명을 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
            <div className="ControlRight">
              <button
                className="TaskPage_FilterButton"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                필터
              </button>
              <div className="ZoomAndNew">
              <button onClick={() => setCellWidth(w => Math.max(20, w - 5))}>–</button>
              <button onClick={() => setCellWidth(w => Math.min(100, w + 5))}>+</button>
                {/* 상위 업무 추가 */}
                <button className="AddTaskButton" onClick={handleAddTask}>
                  <FaPlus /> 상위 업무 추가
                </button>

                {/* parent_task_id 선택 시 즉시 하위업무 추가 */}
                <select
                  className="ParentSelect"
                  value={subtaskParentId}
                  onChange={e => {
                    const parentId = e.target.value;
                    setSubtaskParentId(parentId);
                    if (parentId) {
                      handleAddSubtask(parentId);
                      setSubtaskParentId("");
                    }
                  }}
                >
                  <option value="">하위 업무 추가</option>
                  {topLevelTasks.map(t => (
                    <option key={t.task_id} value={t.task_id}>
                      {t.task_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

      {/* 필터 패널 */}
      {filterOpen && (
        <div className="FilterPanel">
          <div className="FilterGroup">
            <label>
              <input
                type="radio"
                name="category"
                value="내 업무"
                checked={categoryFilter === "내 업무"}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
              내 업무
            </label>
            <label>
              <input
                type="radio"
                name="category"
                value="전체"
                checked={categoryFilter === "전체"}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
              전체
            </label>
          </div>
          <div className="FilterGroup">
            <label>
              <input
                type="checkbox"
                checked={statusFilters.요청}
                onChange={(e) =>
                  setStatusFilters({ ...statusFilters, 요청: e.target.checked })
                }
              />
              요청
            </label>
            <label>
              <input
                type="checkbox"
                checked={statusFilters.진행}
                onChange={(e) =>
                  setStatusFilters({ ...statusFilters, 진행: e.target.checked })
                }
              />
              진행
            </label>
            <label>
              <input
                type="checkbox"
                checked={statusFilters.피드백}
                onChange={(e) =>
                  setStatusFilters({ ...statusFilters, 피드백: e.target.checked })
                }
              />
              피드백
            </label>
            <label>
              <input
                type="checkbox"
                checked={statusFilters.완료}
                onChange={(e) =>
                  setStatusFilters({ ...statusFilters, 완료: e.target.checked })
                }
              />
              완료
            </label>
            <label>
              <input
                type="checkbox"
                checked={statusFilters.보류}
                onChange={(e) =>
                  setStatusFilters({ ...statusFilters, 보류: e.target.checked })
                }
              />
              보류
            </label>
          </div>
        </div>
      )}


      {/* ----------------------------------------------------------------------------------------- */}
      <div>
          
      </div>

      {/* 간트차트 테이블 컨테이너 */}
      <div className="GanttContainer">
      {/* 왼쪽 고정 컬럼 */}
      <table className="LeftTable">
        <thead>
          <tr>
            <th className="col-task">업무명</th>
            <th className="col-assignee">담당자</th>
            <th className="col-status">상태</th>
          </tr>
        </thead>
        <tbody>
          {flatList.map(({ task, level }) => (
            <tr key={task.task_id}>
              <td className="col-task">
                <div
                  className="TreeItem"
                  style={{ paddingLeft: level * 20 + "px", cursor: "pointer" }}
                  onClick={() => handleTaskNameClick(task)}
                >
                  {task.children.length > 0 && (
                    <span
                      className="ToggleBtn"
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpand(task.task_id);
                      }}
                    >
                      {expanded.has(task.task_id) ? <FaCaretDown /> : <FaCaretRight />}
                    </span>
                  )}
                  <span>{task.task_name}</span>
                </div>
              </td>
              <td className="col-assignee">{task.assignee}</td>
              <td className="col-status">
                <span className={`StatusBadge status-${task.status}`}>
                  {task.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <div style={{marginBottom:"15px"}}>

        </div>
      </table>

      {/* 오른쪽 간트 차트 (스크롤/드래그 가능) */}
      <div
        className={`RightTableWrapper ${isDragging ? "dragging" : ""}`}
        ref={tableContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <table className="RightTable">
          <thead>
            {cellWidth === 20 ? (
              // ── cellWidth가 최소(20)일 때, 주차 헤더
              <tr className="week_tr">
                {weekGroups.map(({ label, span }) => (
                  <th
                    key={label}
                    className="week-header-cell"
                    style={{
                      width:      `${span * cellWidth}px`,
                      minWidth:   `${span * cellWidth}px`,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
              ) : (
                // ── 그 외 zoom 레벨에서는 기존 월/일 헤더
                <>
                  <tr>
                    {(() => {
                      const ymMap = {};
                      fullDateRange.forEach(d => {
                        const lbl = `${d.getFullYear()}년 ${d.getMonth()+1}월`;
                        ymMap[lbl] = (ymMap[lbl]||0) + 1;
                      });
                      return Object.entries(ymMap).map(([lbl, span]) => (
                        <th key={lbl} colSpan={span} style={{ textAlign: 'center', background: '#f0f0f0' }}>
                          {lbl}
                        </th>
                      ));
                    })()}
                  </tr>
                  <tr>
                    {fullDateRange.map((d,i) => (
                      <th key={i} style={{
                        width:  `${cellWidth}px`,
                        minWidth: `${cellWidth}px`,
                        boxSizing: "border-box"
                      }}>
                        {d.getDate()}
                      </th>
                    ))}
                  </tr>
                </>
              )}
            </thead>

          <tbody>
            {flatList.map(({ task }) => (
              <tr key={task.task_id}>
                <td
                  colSpan={fullDateRange.length}           // ← dateRange → fullDateRange 로 변경
                  className={`gantt-cell status-${task.status}`}
                >
                  <div className="gantt-bar" style={calcBarStyle(
                      task.start_date,
                      task.end_date,
                      task.status
                    )} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* 상세 패널 */}
    {selectedTask && (
      <div className="TaskPage_rightSide">
        <TaskDetailPanel
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      </div>
    )}
  </div>
);
}

export default TaskPage;
