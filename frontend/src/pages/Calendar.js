/* eslint-disable */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; 
import './Calendar.css';
import MySchedule from "../components/MySchedule";
import TeamSchedule from "../components/TeamSchedule";

function Calendar() {
  // state 선언
  const [scheduleView, setScheduleView] = useState("my");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);  // 사용자 ID 상태 추가
  const [myProjects, setMyProjects] = useState([]);  // 프로젝트 목록 상태
  const [showTeamProjects, setShowTeamProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null); // 선택한 팀(프로젝트) ID 상태

  const { projectId } = useParams();              // ★ /project/:id/calendar면 값 있음, /calendar면 undefined
  const isProject = !!projectId; 

  // 사용자 데이터 (이름, ID) 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/name/", {
          withCredentials: true, // 세션 쿠키 포함
        });
        console.log("User data:", response.data);
        setUserName(response.data.name);
        // 응답에 userId가 포함되어 있다고 가정합니다.
        setUserId(response.data.user_id);
      } catch (error) {
        console.error("사용자 데이터를 불러오지 못했습니다:", error);
        alert("사용자 정보를 가져오는 데 실패했습니다. 다시 시도해주세요.");
      }
    };
    fetchUserData();
  }, []);

  // 사용자 ID가 있으면 해당 사용자의 프로젝트 목록 가져오기
  useEffect(() => {
    if (!userId) return;
    fetch(`http://127.0.0.1:8000/chat/api/user/${userId}/projects/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          setMyProjects(data.projects);
        } else if (data.error) {
          console.log(data.error);
        }
      })
      .catch((err) => {
        console.error("🚨 프로젝트 목록을 불러오지 못했습니다.", err);
      });
  }, [userId]);

  // 사용자 이름 마지막 두 글자 (또는 원하는 로직으로 초기값 설정)
  const nameInitials = userName.slice(-2);

  // 선택한 프로젝트 이름 (선택한 프로젝트가 없으면 기본 텍스트 "팀 일정")
  const selectedProjectName = selectedProjectId
    ? myProjects.find(project => project.project_id === selectedProjectId)?.project_name
    : "팀 일정";

  // handleProjectClick 함수: 프로젝트 선택 시 선택한 프로젝트 ID 업데이트 및 뷰 전환
  const handleProjectClick = (projectId) => {
    console.log("프로젝트 클릭됨:", projectId);
    setSelectedProjectId(projectId);
    setScheduleView("team");
  };

  return (
      <div className={`CalendarPage ${isProject ? 'calendar--project' : 'calendar--global'}`}>
      <div className="Calandar_App">
        <div className="Calandar_page" style={{ position: 'relative' }}>
          <div
            className="schedule-toggle"
            style={{
              display: 'flex',
              alignItems: 'center',
              position: 'absolute',
              top: '7vh',
              right: '4vw',
              zIndex: 1,
            }}
          >
            {/* 내 일정 버튼 */}
            <button
              onClick={() => {
                setScheduleView("my");
                setSelectedProjectId(null);
              }}
              className={`no-style-button ${scheduleView === "my" ? "active" : ""}`}
              style={{
                padding: '0.5em 1em',
                fontSize: '16px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>내 일정 👤</span>
            </button>

            {/* 팀 일정 드롭다운 컨테이너 */}
            <div
              className="team-dropdown"
              onMouseEnter={() => setShowTeamProjects(true)}
              onMouseLeave={() => setShowTeamProjects(false)}
              style={{ position: 'relative', display: 'inline-block' }}
            >
              {/* 토글 버튼 */}
              <button
                onClick={() => setScheduleView("team")}
                className={`no-style-button ${scheduleView === "team" ? "active" : ""}`}
                style={{
                  padding: '0.5em 1em',
                  fontSize: '16px',
                  marginRight:'2vw'
                }}
              >
                <span style={{ fontWeight: 'bold', cursor: 'pointer' }}>
                  {selectedProjectName} 👥
                </span>
              </button>

              {/* 드롭다운 메뉴 */}
              {showTeamProjects && (
                <ul
                  className="Header_dropdown-content"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    margin: 0,
                    padding: '0.5em 0',
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {myProjects.length > 0 ? (
                    myProjects.map((p) => (
                      <li
                        key={p.project_id}
                        onClick={() => handleProjectClick(p.project_id)}
                        style={{
                          padding: '0.5em 1em',
                          cursor: 'pointer',
                        }}
                      >
                        {p.project_name}
                      </li>
                    ))
                  ) : (
                    <li style={{ padding: '0.5em 1em' }}>프로젝트가 없습니다.</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* 일정 뷰 */}
          {scheduleView === "my" ? (
            <MySchedule className="MySchedule" />
          ) : (
            <TeamSchedule className="TeamSchedule" teamId={selectedProjectId} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Calendar;
