// src/components/Schedule.js
/* eslint-disable */
// 노란 글씨 워닝 안보기
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Schedule.css';
import ScheduleModal from "./ScheduleModal";

// 날짜 포맷 통일을 위한 헬퍼 함수
const formatDate = (dateInput) => {
  const dateObj = new Date(dateInput);
  return dateObj
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, "-")
    .replace(/\./g, "");
};

function Schedule() {
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [teamSchedules, setTeamSchedules] = useState([]);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [teamId, setTeamId] = useState(null); // 팀 ID 상태 추가

  // 팀 일정 페이지네이션 상태
  const [teamPage, setTeamPage] = useState(0);
  const itemsPerPage = 10;

  // selectedDate가 변경되면 팀 일정 페이지 초기화
  useEffect(() => {
    setTeamPage(0);
  }, [selectedDate]);

  // 사용자 데이터 가져오기 (팀 ID도 함께 받아온다고 가정)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/name/", {
          withCredentials: true,
        });
        console.log("User data:", response.data);
        setUserName(response.data.name);
        setUserId(response.data.user_id);
        if(response.data.team_id) {
          setTeamId(response.data.team_id);
        }
      } catch (error) {
        console.error("사용자 데이터를 불러오지 못했습니다:", error);
        alert("사용자 정보를 가져오는 데 실패했습니다. 다시 시도해주세요.");
      }
    };
    fetchUserData();
  }, []);

  // 개인 일정 데이터 가져오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/schedule/list/", {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => setSchedules(data))
      .catch(error => console.error("Error fetching schedule:", error));
  }, []);

  // 팀 일정 데이터 가져오기
  useEffect(() => {
    axios.get(`http://127.0.0.1:8000/schedule/api/tasks/`, { withCredentials: true })
      .then(response => {
        console.log("Team schedules:", response.data);
        setTeamSchedules(response.data);
      })
      .catch(error => console.error("Error fetching team schedule:", error));
  }, []); // dependency를 빈 배열로 설정

  // userId를 기반으로 내 일정 필터링 (개인 일정은 start_time 기준)
  const mySchedules = userId 
    ? schedules.filter(schedule => String(schedule.user) === String(userId))
    : [];

  const handleDateClick = (value) => {
    if (value.getMonth() !== activeStartDate.getMonth()) return;
    const formatted = formatDate(value);
    setSelectedDate(formatted);
  };

  // 선택된 날짜의 개인 일정과 팀 일정을 합쳐서 반환  
  // 팀 일정은 end_date_due_date를 사용 (API 데이터에 따르면 모두 동일한 날짜임)
  const combinedEventsForDay = (formattedDate) => {
    const personalEvents = mySchedules.filter(schedule => schedule.start_time === formattedDate);
    const teamEvents = teamSchedules.filter(schedule => {
      const formattedTeamEndDate = formatDate(schedule.end_date_due_date);
      return formattedTeamEndDate === formattedDate;
    });
    return { personal: personalEvents, team: teamEvents };
  };

  return (
    <section className="Schedule_container custom-mainschedule">
      {/* 캘린더 */}
      <Calendar
        onChange={setDate}
        value={date}
        onClickDay={handleDateClick}
        locale="ko-KR"
        calendarType="gregory"
        onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)}
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
          const formatted = formatDate(date);
          const { personal, team } = combinedEventsForDay(formatted);
          if (personal.length > 0 || team.length > 0) {
            return (
              <div className="event-marker">
                {personal.length > 0 && <span className="dot personal"></span>}
                {team.length > 0 && <span className="dot team"></span>}
              </div>
            );
          }
          return null;
        }}
      />

      {/* 모달: 선택한 날짜의 일정 상세보기 */}
      <ScheduleModal
        isOpen={selectedDate !== null}
        onRequestClose={() => setSelectedDate(null)}
        contentLabel="일정 수정/추가"
        style={{
          content: {
            width: "30vw",
            height: "50vh",
            top: "0%",
            left: "0%",
          }
        }}
      >
        <button
          className="Invite_close_btn"
          onClick={() => setSelectedDate(null)}
        >
          ✖
        </button>
        <div className="MySchedule-Text">
          <h3>{selectedDate} 일정</h3>
        </div>
        <div className="schedule-group">
          <h4 className="schedule-group-header">내 일정 :</h4>
          {mySchedules.filter(schedule => schedule.start_time === selectedDate).length > 0 ? (
            mySchedules
              .filter(schedule => schedule.start_time === selectedDate)
              .map(schedule => (
                <div key={schedule.schedule_id} className="schedule-item">
                  <span className="schedule-dot personal"></span>
                  <span className="schedule-title">{schedule.title}</span>
                </div>
              ))
          ) : (
            <p>등록된 내일정이 없습니다.</p>
          )}
        </div>
        <div className="schedule-group">
          <h4 className="schedule-group-header">팀 일정 :</h4>
          {teamSchedules.filter(schedule => {
            const formattedTeamDate = formatDate(schedule.end_date_due_date);
            return formattedTeamDate === selectedDate;
          }).length > 0 ? (
            <div className="schedule-teamcontainer">
              {(() => {
                // 필터링된 팀 일정 목록
                const filteredTeamSchedules = teamSchedules.filter(schedule => {
                  const formattedTeamDate = formatDate(schedule.end_date_due_date);
                  return formattedTeamDate === selectedDate;
                });
                const pageCount = Math.ceil(filteredTeamSchedules.length / itemsPerPage);
                const displayedTeamSchedules = filteredTeamSchedules.slice(teamPage * itemsPerPage, (teamPage + 1) * itemsPerPage);
                return (
                  <>
                    {displayedTeamSchedules.map(schedule => (
                      <div key={schedule.task_id} className="schedule-teamitem">
                        <span className="schedule-dot team"></span>
                        <span className="schedule-title">{schedule.task_name}</span>
                      </div>
                    ))}
                    <div className="pagination">
                      {teamPage > 0 && (
                        <button onClick={() => setTeamPage(teamPage - 1)} className="Schedule_button">이전</button>
                      )}
                      {teamPage < pageCount - 1 && (
                        <button onClick={() => setTeamPage(teamPage + 1)} className="Schedule_button">다음</button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p>등록된 팀 일정이 없습니다.</p>
          )}
        </div>
      </ScheduleModal>
    </section>
  );
}

export default Schedule;
