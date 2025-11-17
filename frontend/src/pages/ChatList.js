import React, { useState, useEffect } from "react";
import "./ChatList.css"; // CSS 파일 추가

const ChatList = ({
  setSelectedProjectId,
  selectedProjectId,
  activeTab,              // ★ 추가: 현재 활성 탭 (“project” or “dm”)
  setActiveTab,           // ★ 추가: 탭 변경 함수
  selectedDmRoomId,       // ★ 추가: 선택된 DM 방 ID
  setSelectedDmRoomId,    // ★ 추가: DM 방 선택 함수
  setDmPartnerName        // ★ 추가: DM 상대 이름 설정 함수
}) => {
  const [userId, setUserId] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [dmRooms, setDmRooms] = useState([]); // ★ 추가: DM 방 목록 상태

  // ✅ 로그인된 사용자 ID 가져오기 (기존 로직)
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/users/name/", {
      method: "GET",
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user_id) {
          setUserId(parseInt(data.user_id));
        }
      })
      .catch((err) => console.error("🚨 사용자 정보를 불러오지 못했습니다.", err));
  }, []);

  // ✅ 프로젝트 목록 불러오기 (기존 로직)
  useEffect(() => {
    if (!userId) return;

    const fetchProjects = () => {
      fetch(`http://127.0.0.1:8000/chat/api/user/${userId}/projects/`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.projects) {
            console.error("🚨 'projects' 키가 응답에 없습니다!", data);
            return;
          }
          const sorted = [...data.projects].sort((a, b) => {
            const tA = a.latest_message_time ? new Date(a.latest_message_time).getTime() : 0;
            const tB = b.latest_message_time ? new Date(b.latest_message_time).getTime() : 0;
            return tB - tA;
          });
          setProjectList(sorted);
        })
        .catch((err) => console.error("🚨 프로젝트 목록을 가져오는 중 오류 발생:", err));
    };

    fetchProjects();
    const intervalId = setInterval(fetchProjects, 10000);
    return () => clearInterval(intervalId);
  }, [userId]);

  // ★ 추가: DM 방 목록 불러오기
  useEffect(() => {
    if (!userId) return;

    fetch(`http://127.0.0.1:8000/chat/api/user/${userId}/dm_rooms/`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.dm_rooms) {
          console.error("🚨 'dm_rooms' 키가 응답에 없습니다!", data);
          return;
        }
        const sorted = [...data.dm_rooms].sort((a, b) => {
          const tA = a.latest_message_time ? new Date(a.latest_message_time).getTime() : 0;
          const tB = b.latest_message_time ? new Date(b.latest_message_time).getTime() : 0;
          return tB - tA;
        });
        setDmRooms(sorted);
      })
      .catch((err) => console.error("🚨 DM 목록을 가져오는 중 오류 발생:", err));
  }, [userId]);

  return (
    <div className="chatlist-container">
      {/* 탭 헤더 (★ 추가) */}
      <div className="chatlist-header">
        <button
          className={`tab-button ${activeTab === "project" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("project");
            // 프로젝트 탭으로 전환 시 DM 선택 해제
            setSelectedDmRoomId(null);
          }}
        >
          프로젝트
        </button>
        <button
          className={`tab-button ${activeTab === "dm" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("dm");
            // DM 탭으로 전환 시 프로젝트 선택 해제
            setSelectedProjectId(null);
          }}
        >
          개인 채팅
        </button>
      </div>

      <text className="chatlist-text">정렬 기준 : 최신</text>

      {/* 프로젝트 or DM 목록 분기 */}
      {activeTab === "project" ? (
        <ul className="chat-list">
          {projectList.map((project) => (
            <li
              key={project.project_id}
              onClick={() => {
                setSelectedProjectId(project.project_id);
              }}
              className={selectedProjectId === project.project_id ? "selected" : ""}
            >
              {project.project_name}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="chat-list">
          {dmRooms.map((room) => (
            <li
              key={room.room_id}
              onClick={() => {
                setSelectedDmRoomId(room.room_id);
                setDmPartnerName(room.partner_name);
              }}
              className={selectedDmRoomId === room.room_id ? "selected" : ""}
            >
              {room.partner_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
