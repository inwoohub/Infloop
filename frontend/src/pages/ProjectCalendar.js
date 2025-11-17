/* src/pages/TaskPage.js (또는 ProjectCalendar.js) */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Topbar from "../components/Topbar";
import Topbarst from "../components/Topbarst";
import MySchedule from "../components/MySchedule";
import TeamSchedule from "../components/TeamSchedule";
import "./ProjectCalendar.css";

function ProjectCalendar() {
  const [scheduleView, setScheduleView] = useState("team");
  const [projectId, setProjectId] = useState(null);

  // 사용자 정보 로드 (생략 가능)
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/users/name/", { withCredentials: true })
      .catch(console.error);
  }, []);

  // 프로젝트 ID 로드
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/users/projects/get/", { withCredentials: true })
      .then(res => setProjectId(res.data.project_id))
      .catch(console.error);
  }, []);

  return (
    <div className="ProCalendar_wrapper">
      <Topbarst />
      <Topbar />

      <div className="ProCalendar_main">

        <div className="CalendarContainer">
          {scheduleView === "my" ? (
            <MySchedule projectId={projectId} />
          ) : (
            /* ★여기만 projectId → teamId로 변경★ */
            <TeamSchedule teamId={projectId} />
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectCalendar;