/* eslint-disable */
// src/components/TeamSchedule.js
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import axios from "axios";
import ScheduleModal from "./ScheduleModal";
import "react-calendar/dist/Calendar.css";
import "./TeamSchedule.css";

function TeamSchedule({ teamId }) {
  const [tasks, setTasks] = useState({});
  const [date, setDate] = useState(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // jung DB의 Task 데이터를 불러와 due_date(start_date_due_date 기준)에 따라 그룹화
  const fetchTeamTasks = async () => {
    try {
      // 팀 ID에 따른 필터링을 위해 쿼리 파라미터 team_id를 사용
      const response = await axios.get(
        `http://127.0.0.1:8000/schedule/task/list/?team_id=${teamId}`,
        { withCredentials: true }
      );
      console.log("📌 불러온 팀 작업 데이터:", response.data);

      const formattedTasks = {};
      response.data.forEach((task) => {
        // start_date_due_date 필드를 'YYYY-MM-DD' 형식으로 변환
        const formattedDate = new Date(task.end_date_due_date)
          .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
          .replace(/\. /g, "-")
          .replace(/\./g, "");
        if (!formattedTasks[formattedDate]) {
          formattedTasks[formattedDate] = [];
        }
        formattedTasks[formattedDate].push({ id: task.task_id, name: task.task_name });
      });

      setTasks(formattedTasks);
    } catch (error) {
      console.error("📌 팀 작업 불러오기 실패:", error);
    }
  };

  useEffect(() => {
    fetchTeamTasks();
  }, [teamId]);

  // 날짜 셀 클릭 시 해당 날짜 작업 모달 열기
  const handleDayClick = (value) => {
    const formattedDate = value
      .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
      .replace(/\. /g, "-")
      .replace(/\./g, "");
      setSelectedDate(formattedDate);
    if (tasks[formattedDate]) {
      setSelectedDateTasks(tasks[formattedDate]);
      setModalIsOpen(true);
    }
  };

  return (
    <section className="TeamCalendar_container custom-schedule">
      <div style={{ height: "20vh" }}></div>

      {/* 캘린더 */}
      <Calendar
        onChange={setDate}
        value={date}
        locale="ko-KR"
        calendarType="gregory"
        onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)}
        onClickDay={handleDayClick}
        tileClassName={({ date }) => {
          if (date.getMonth() !== activeStartDate.getMonth()) {
            return "neighboring-month";
          }
          const day = date.getDay();
          if (day === 0) return "sunday";
          if (day === 6) return "saturday";
          return "";
        }}
        tileContent={({ date }) => {
          const formattedDate = date
            .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
            .replace(/\. /g, "-")
            .replace(/\./g, "");
          if (tasks[formattedDate]) {
            const tasksForDate = tasks[formattedDate];
            return (
              <div className="event-marker">
                <span style={{ display: "block", fontWeight: "bold" }}>
                  {tasksForDate[0].name}
                </span>
                {tasksForDate.length > 1 && (
                  <span style={{ display: "block", fontWeight: "bold" }}>
                    +{tasksForDate.length - 1}
                  </span>
                )}
              </div>
            );
          }
          return null;
        }}
      />

      {/* 모달: 해당 날짜의 작업 목록 표시 */}
      <ScheduleModal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="일정 상세보기"
        style={{
          content: {
            width: "30vw",
            height: "30vh",
            top: "0%",
            left: "0%",
          }
        }}
      >
        <button
          className="Invite_close_btn"
          onClick={() => {
            setModalIsOpen(false);
            setSelectedDate(null);
          }}
        >
          ✖
        </button>
        <div className="MySchedule-Text">
            <h3>{selectedDate} 일정</h3>
        </div>
        {selectedDateTasks.map((task) => (
          <div key={task.id} className="schedule-teamitem">
          <span className="schedule-dot team"></span>
          <span className="schedule-title">{task.name}</span>
        </div>

          
        ))}
      </ScheduleModal>
    </section>
  );
}

export default TeamSchedule;
