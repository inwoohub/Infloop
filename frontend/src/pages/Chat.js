import React, { useState, useEffect, useRef } from "react";
import ChatList from "./ChatList"; // 좌측 채팅방 목록 컴포넌트
import "./Chat.css"; // CSS 파일 추가

const Chat = ({ onClose, initTab = "project", initRoomId = null, initPartner = "" }) => {
  const [userId, setUserId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectName, setProjectName] = useState(""); // ✅ 프로젝트 이름 상태 추가
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const chatMessagesRef = useRef(null); // ✅ 스크롤 조작을 위한 ref
  const wsRef = useRef(null);
  const connectedRef = useRef(false);

  // ★ 추가: 개인 채팅(DM) 탭 관련 상태
  const [activeTab, setActiveTab] = useState("project");      // "project" or "dm"
  const [selectedDmRoomId, setSelectedDmRoomId] = useState(null);
  const [dmPartnerName, setDmPartnerName] = useState("");     // DM 상대 이름
  const isComposing = (e) =>
    e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229;

  // ↑ 컴포넌트 상단에 유틸 하나
const toDate = (m) => {
  if (m?.timestampDate instanceof Date) return m.timestampDate;
  if (m?.timestamp_iso) {
    const d = new Date(m.timestamp_iso);
    if (!isNaN(d)) return d;
  }
  if (typeof m?.timestamp === "string") {
    const parts = m.timestamp.match(/^(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2})$/);
    if (parts) {
      const [, M, D, H, Min] = parts;
      const y = new Date().getFullYear();
      const d = new Date(`${y}-${String(M).padStart(2,"0")}-${String(D).padStart(2,"0")}T${String(H).padStart(2,"0")}:${Min}:00+09:00`);
      if (!isNaN(d)) return d;
    }
  }
  return new Date(); // 최후의 안전망
};

const normalize = (raw) => ({
  ...raw,
  timestampDate: toDate(raw),
});


  useEffect(() => {
    if (initTab === "dm" && initRoomId) {
      setActiveTab("dm");
      setSelectedDmRoomId(initRoomId);
      if (initPartner) setDmPartnerName(initPartner);
    }
    if (initTab === "project" && initRoomId) {
      setActiveTab("project");
      setSelectedProjectId(initRoomId);
    }
  }, []);   // ← 처음 한 번만 실행


  // 시간 포맷
const formatTime = (tsDate) => {
  const d = tsDate instanceof Date ? tsDate : new Date(tsDate);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric", hour12: true });
};

// 날짜 구분
const shouldShowDate = (cur, prev) => {
  if (!prev) return true;
  const c = cur.timestampDate, p = prev.timestampDate;
  if (!(c instanceof Date) || isNaN(c) || !(p instanceof Date) || isNaN(p)) return false;
  const cd = c.toLocaleDateString("ko-KR", { year:"numeric", month:"numeric", day:"numeric" });
  const pd = p.toLocaleDateString("ko-KR", { year:"numeric", month:"numeric", day:"numeric" });
  return cd !== pd;
};

  
  // ✅ 로그인된 사용자 ID 가져오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/users/name/", {
      method: "GET", credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user_id) {
          setUserId(parseInt(data.user_id));
        }
      })
      .catch((err) => console.error("🚨 사용자 정보를 불러오지 못했습니다.", err));
  }, []);
  
  // ✅ 프로젝트 이름 or DM 상대 이름 가져오기
  useEffect(() => {
    if (activeTab !== "project") {
      // DM 탭일 때 프로젝트 이름 로직 스킵
      return;
    }
    if (!selectedProjectId && !selectedDmRoomId) {
      setProjectName("선택된 채팅방 없음");
      setDmPartnerName("선택된 채팅방 없음")
      return;
    }
    if (connectedRef.current) return;       
    fetch(`http://127.0.0.1:8000/chat/api/project/${selectedProjectId}/name/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project_name) {
          setProjectName(data.project_name);
        } else {
          setProjectName("알 수 없는 프로젝트");
        }
      })
      .catch((err) => {
        console.error("🚨 프로젝트 이름을 불러오지 못했습니다.", err);
        setProjectName("프로젝트 로드 실패");
      });
  }, [selectedProjectId, activeTab]); // ✅ activeTab 추가
  
  // ✅ 선택한 프로젝트 또는 DM 방의 기존 메시지 불러오기
  useEffect(() => {
    if (userId === null) return;
  
    if (activeTab === "project") {
      if (!selectedProjectId) return;
      fetch(`http://127.0.0.1:8000/chat/api/project/${selectedProjectId}/messages/`)
        .then(res => res.json())
        .then(data => setMessages(data.messages.map(normalize)));

    } else {
      // DM 메시지 로드
      if (!selectedDmRoomId) return;
      fetch(`http://127.0.0.1:8000/chat/api/dm_rooms/${selectedDmRoomId}/messages/`)
        .then(res => res.json())
        .then(data => setMessages(data.messages.map(m => normalize({ ...m, isMine: m.user_id === userId }))));

    }
  }, [selectedProjectId, selectedDmRoomId, userId, activeTab]); // ✅ selectedDmRoomId, activeTab 추가
  
  // ✅ WebSocket 연결 관리 (프로젝트 / DM 분기)
  useEffect(() => {
    if (socket) {
      socket.close();
    }
  
    let wsUrl = null;
    if (activeTab === "project") {
      if (!selectedProjectId) return;
      wsUrl = `ws://localhost:8000/chat/ws/chat/${selectedProjectId}/`;
    } else {
      if (!selectedDmRoomId) return;
      wsUrl = `ws://localhost:8000/chat/ws/chat/dm/${selectedDmRoomId}/`;
    }
  
    const newSocket = new WebSocket(wsUrl);
    newSocket.onopen = () => console.log("✅ WebSocket 연결 성공!", wsUrl);
    newSocket.onerror = (error) => console.error("🚨 WebSocket 오류 발생:", error);
    newSocket.onclose = () => console.log("❌ WebSocket 연결이 닫혔습니다.");
  
    newSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const msg = normalize(data); // ← 여기서 표준화
    setMessages((prev) => {
    // 1) 서버가 돌려준 temp_id가 있으면, 그 temp_id로 낙관적 메시지 교체
    if (msg.temp_id) {
      const idx = prev.findIndex(m => m.message_id === msg.temp_id);
      if (idx !== -1) {
        const copy = [...prev];
        // 기존 낙관적 메시지를 서버 확정 데이터로 교체
        copy[idx] = { ...copy[idx], ...msg, pending: false };
        return copy;
      }
    }
    // 2) 같은 message_id 이미 있으면 무시
    if (msg.message_id && prev.some(m => m.message_id === msg.message_id)) return prev;
    // 3) 일반적인 경우는 뒤에 추가
    return [...prev, msg];
      });
    };
  
    setSocket(newSocket);
    return () => {
      if (newSocket) newSocket.close();
    };
  }, [selectedProjectId, selectedDmRoomId, activeTab]); // ✅ selectedDmRoomId, activeTab 추가
  
  // 시간 파싱 함수 (생략: 기존 parseTimestamp 로직)
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    const amPmMatch = timestamp.match(/(오전|오후) (\d+):(\d+)/);
    if (amPmMatch) {
      let hour = parseInt(amPmMatch[2], 10);
      const minute = amPmMatch[3];
      if (amPmMatch[1] === "오후" && hour !== 12) hour += 12;
      else if (amPmMatch[1] === "오전" && hour === 12) hour = 0;
      const now = new Date();
      const formattedDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute
      );
      if (!isNaN(formattedDate.getTime())) return formattedDate;
    }
    const parts = timestamp.match(/(\d+)\/(\d+) (\d+):(\d+)/);
    if (parts) {
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      const hour = parts[3].padStart(2, "0");
      const minute = parts[4].padStart(2, "0");
      const year = new Date().getFullYear();
      const formattedDate = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:00+09:00`
      );
      if (!isNaN(formattedDate.getTime())) return formattedDate;
    }
    console.warn("🚨 알 수 없는 타임스탬프 형식:", timestamp);
    return new Date();
  };
  
  // ✅ 메시지 전송
  const sendMessage = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (!message.trim()) return;

  const tempId = `local-${Date.now()}`;
  const mine = {
    message_id: tempId,
    message,
    user_id: userId,
    username: "(나)",
    timestampDate: new Date(),  // ← 임시 시간(화면 표시용)
    pending: true,              // ← 임시 표시 플래그
  };

  // 1) 화면에 먼저 추가(낙관적 렌더)
  setMessages((prev) => [...prev, mine]);

  // 2) 서버로 보낼 페이로드 (시간은 서버가 결정 → 보내지 말 것 권장)
  const payload = { message, user_id: userId, temp_id: tempId };
  socket.send(JSON.stringify(payload));
  setMessage("");
};

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  
  // ✅ 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="Invite_overlay" onClick={onClose}>
      <div className="Invite_modal" onClick={(e) => e.stopPropagation()} >
        <button className="Invite_close_btn" onClick={onClose}>
          ✖
        </button>
        <div className="Invite_app">
          <div className="Invite_page">
            <div className="Chat_page2">
              <div className="chat-container">

                {/* ✅ 좌측: 선택한 채팅방 메시지 화면 */}
                <div className="chat-box">
                  <div className="chat-header">
                    <h3>
                      🔔{" "}
                      {activeTab === "project" ? projectName : dmPartnerName}
                    </h3>
                  </div>

                  <div className="chat-messages" ref={chatMessagesRef}>
                    {messages.map((msg, index) => {
                      const prev = index > 0 ? messages[index - 1] : null;
                      const showDate = shouldShowDate(msg, prev);
                      return (
                        <React.Fragment key={msg.message_id || index}>
                          {showDate && (
                            <div className="chat-date-divider">
                              {msg.timestampDate.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                            </div>
                          )}
                          <div className={`chat-message ${msg.user_id === userId ? "mine" : "other"}`}>
                            {msg.user_id !== userId && <div className="chat-username">{msg.username}</div>}
                            <div className="chat-bubble">{msg.message}</div>
                            <span className="chat-timestamp">{formatTime(msg.timestampDate)}</span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {/* ✅ 메시지 입력창 */}
                  <div className="chat-input">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        // Shift+Enter는 줄바꿈으로 남겨두고 싶으면 아래 조건 유지
                        if (e.key === "Enter" && !e.shiftKey && !isComposing(e)) {
                          e.preventDefault(); // 브라우저 기본 제출/클릭 연쇄 방지
                          sendMessage();
                        }
                      }}
                    />
                    <button type="button" onClick={sendMessage}>전송</button>
                  </div>
                </div>

                {/* 우측: 프로젝트/DM 탭 구분 목록 */}
                <ChatList
                  setSelectedProjectId={setSelectedProjectId}
                  selectedProjectId={selectedProjectId}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setSelectedDmRoomId={setSelectedDmRoomId}
                  setDmPartnerName={setDmPartnerName}
                  selectedDmRoomId={selectedDmRoomId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
