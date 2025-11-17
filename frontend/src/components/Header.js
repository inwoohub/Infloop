import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import Chat from "../pages/Chat";
import Profile from "../pages/Profile";

// 아이콘 컴포넌트들
const LayoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const TeamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

function Header({ nameInitials, currentDateTime }) {
  const navigate = useNavigate();

  // 기본 상태들
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [showMyProjects, setShowMyProjects] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifBoxRef = useRef(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // ★ Chat 모달 초기화 상태
  const [chatInit, setChatInit] = useState(null);

  // 🔎 검색 상태
  const [query, setQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchBoxRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ 부트스트랩: 프로필 + 내 프로젝트 + 알림을 한 번에
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/api/users/notifications/?full=1",
          { method: "GET", credentials: "include" }
        );
        if (!res.ok) throw new Error("boot load failed");
        const data = await res.json();

        // user
        if (data.user?.user_id) {
          setUserId(Number(data.user.user_id));
          setUserName(data.user.name || "사용자");
          if (data.user.profile_image) {
            const url = data.user.profile_image.startsWith("http")
              ? data.user.profile_image
              : `http://127.0.0.1:8000${data.user.profile_image}`;
            setProfileImage(url);
          }
        }

        // projects
        setMyProjects(Array.isArray(data.my_projects) ? data.my_projects : []);

        // notifications
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setHasNotifications((data.notifications?.length || 0) > 0);
      } catch (e) {
        console.error("🚨 초기 데이터 로드 실패:", e);
      }
    })();
  }, []);


  // 한글 정렬(숫자 시작은 뒤로)
  const sortKorean = (a, b) => {
    const an = /^\d/.test(a.project_name || "");
    const bn = /^\d/.test(b.project_name || "");
    if (an && !bn) return 1;
    if (!an && bn) return -1;
    return (a.project_name || "").localeCompare(b.project_name || "", "ko", {
      sensitivity: "base",
    });
  };

  // 검색 필터링 (검색어 없으면 전체 가/나/다/라 정렬)
  const filteredProjects = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const base = q
      ? myProjects.filter((p) =>
          (p.project_name || "").toLowerCase().includes(q)
        )
      : myProjects.slice();
    const sorted = base.sort(sortKorean);
    return sorted.slice(0, 50);
  }, [query, myProjects]);

  // 현재 프로젝트 설정 + 이동 + 검색 초기화
  const handleSelectProject = (projectId) => {
    fetch("http://127.0.0.1:8000/api/users/projects/set/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ project_id: projectId }),
    })
      .then((res) => res.json())
      .then(() => {
        setQuery("");
        setShowSearchResults(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        navigate(`/project/${projectId}/task`);
      })
      .catch((err) => console.error("Error setting project ID:", err));
  };

  // 키보드 네비게이션
  const onSearchKeyDown = (e) => {
    if (!showSearchResults && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setShowSearchResults(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= filteredProjects.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? filteredProjects.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (!filteredProjects.length) return;
      const index = activeIndex >= 0 ? activeIndex : 0;
      const target = filteredProjects[index];
      handleSelectProject(target.project_id);
    } else if (e.key === "Escape") {
      setQuery("");
      setShowSearchResults(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  // 검색영역 밖 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchResults(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 상단 드롭다운("내 프로젝트") 클릭 시
  const handleProjectClick = (projectId) => {
    handleSelectProject(projectId);
  };

  const fetchNotifications = () => {
    fetch("http://127.0.0.1:8000/api/users/notifications/", {
      method: "GET",
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data.items) ? data.items : []);
        setHasNotifications(false); // 열면 dot 제거
      })
      .catch(err => console.error("🚨 알림을 불러오지 못했습니다.", err));
  };

  // 벨 클릭
  const onClickBell = () => {
    const next = !showNotifPanel;
    setShowNotifPanel(next);
    if (next) setHasNotifications(false);
  };

  // 패널 바깥 클릭 시 닫기
  useEffect(() => {
    const onDocClick = (e) => {
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // 공통: 프로젝트 세팅 후 이동
  const openProject = (projectId) => {
    fetch("http://127.0.0.1:8000/api/users/projects/set/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        project_id: projectId,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setShowNotifPanel(false);
        navigate(`/project/${projectId}/task`);
      })
      .catch((err) => console.error("Error setting project ID:", err));
  };

  // DM 열기
  const openDM = (roomId, partnerName) => {
    setChatInit({ tab: "dm", roomId, partnerName });
    setIsChatOpen(true);
    setShowNotifPanel(false);
  };

  // 프로젝트 채팅 열기
  const openProjectChat = async (projectId, projectName) => {
    try {
      await fetch("http://127.0.0.1:8000/api/users/projects/set/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ project_id: projectId }),
      });
    } catch (e) {
      console.error("프로젝트 세션 설정 실패:", e);
    }
    setChatInit({ tab: "project", projectId, projectName });
    setIsChatOpen(true);
    setShowNotifPanel(false);
  };

  return (
    <header className="Header_header">
      <div className="Header_left">
        <div className="Header_logo-area" onClick={() => navigate("/main")}>
          <div className="Header_logo-icon">
            <img src="/testlogo.png" alt="InfLoop 로고" />
          </div>
          <h1 className="Header_logo-text">InfLoop</h1>
        </div>

        <nav className="Header_nav">
          <ul>
            <li className="Header_nav-item" onClick={() => navigate("/create-project")}>
              <PlusIcon />
              <span>새 프로젝트</span>
            </li>

            {/* 내 프로젝트 드롭다운 */}
            <li className="Header_dropdown">
              <div
                className="dropdown-container"
                onMouseEnter={() => setShowMyProjects(true)}
                onMouseLeave={() => setShowMyProjects(false)}
              >
                <div className="Header_nav-item">
                  <LayoutIcon />
                  <span>내 프로젝트</span>
                </div>
                {showMyProjects && (
                  <ul className="Header_dropdown-content">
                    {myProjects.length > 0 ? (
                      myProjects.map((project) => (
                        <li
                          key={project.project_id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleProjectClick(project.project_id);
                          }}
                        >
                          {project.project_name}
                        </li>
                      ))
                    ) : (
                      <li className="no-projects">프로젝트가 없습니다.</li>
                    )}
                  </ul>
                )}
              </div>
            </li>

            <li className="Header_nav-item" onClick={() => navigate("/calendar")}>
              <CalendarIcon />
              <span>캘린더</span>
            </li>

            <li className="Header_nav-item" onClick={() => navigate("/team-finder")}>
              <TeamIcon />
              <span>팀구하기</span>
            </li>
          </ul>
        </nav>
      </div>

      <div className="Header_right">
        {/* 현재 시간 표시 */}
        <span className="Header_current-time">
          {currentDateTime?.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}{" "}
          {currentDateTime?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>

        {/* 검색창 */}
        <div className="Header_search-container" ref={searchBoxRef}>
          <div className={`Header_search-box ${isSearchFocused ? "focused" : ""}`}>
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              className="Header_search-input"
              placeholder="검색..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => {
                setIsSearchFocused(true);
                setShowSearchResults(true);
              }}
              onBlur={() => setIsSearchFocused(false)}
              onKeyDown={onSearchKeyDown}
            />
          </div>

          {/* 드롭다운 결과 */}
          {showSearchResults && filteredProjects.length > 0 && (
            <ul className="Header_search-results">
              {filteredProjects.map((p, idx) => (
                <li
                  key={p.project_id}
                  className={`Header_search-item ${idx === activeIndex ? "active" : ""}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectProject(p.project_id);
                  }}
                >
                  <span className="Header_search-name">{p.project_name}</span>
                </li>
              ))}
            </ul>
          )}

          {/* 검색어는 있는데 결과가 없을 때 */}
          {showSearchResults && query.trim() && filteredProjects.length === 0 && (
            <div className="Header_search-noresult">일치하는 프로젝트가 없습니다.</div>
          )}
        </div>

        {/* 알림 버튼 */}
        <button className="Header_notification-btn" onClick={onClickBell}>
          <BellIcon />
          {hasNotifications && <span className="Header_notification-dot"></span>}
        </button>
        {showNotifPanel && (
          <div className="Header_notif-panel" ref={notifBoxRef}>
            <div className="Header_notif-header">
              <span>최근 알림</span>
            </div>

            {notifications.length === 0 ? (
              <div className="Header_notif-empty">최근 알림이 없습니다.</div>
            ) : (
              <ul className="Header_notif-list">
              {notifications.map((n) => {
                if (n.type === "urgent_task") {
                  return (
                    <li
                      key={`u-${n.id}`}
                      className="notif-item urgent"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (n.project_id) openProject(n.project_id);
                      }}
                    >
                      <span className="notif-badge">긴급</span>
                      <div className="notif-text">
                        <div className="notif-title">📁 {n.project_name} / {n.title}</div>
                        <div className="notif-sub">마감: {new Date(n.due).toLocaleString("ko-KR")}</div>
                      </div>
                    </li>
                  );
                } else if (n.type === "comment") {
                  return (
                    <li
                      key={`c-${n.id}`}
                      className="notif-item comment"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (n.project_id) openProject(n.project_id);
                      }}
                    >
                      <span className="notif-badge">댓글</span>
                      <div className="notif-text">
                        <div className="notif-title">🗂 {n.project_name} / {n.task_name}</div>
                        <div className="notif-sub">{n.author_name}: {n.content}</div>
                      </div>
                    </li>
                  );
                } else if (n.type === "dm") {
                  return (
                    <li
                      key={`d-${n.id}`}
                      className="notif-item dm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        openDM(n.room_id, n.from_name);
                      }}
                    >
                      <span className="notif-badge">DM</span>
                      <div className="notif-text">
                        <div className="notif-title">💬 {n.from_name}</div>
                        <div className="notif-sub">{n.content}</div>
                      </div>
                    </li>
                  );
                } else if (n.type === "group_message") {
                  return (
                    <li
                      key={`g-${n.id}`}
                      className="notif-item group"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        openProjectChat(n.project_id, n.project_name);
                      }}
                    >
                      <span className="notif-badge">그룹</span>
                      <div className="notif-text">
                        <div className="notif-title">#{n.project_name}</div>
                        <div className="notif-sub">{n.from_name}: {n.content}</div>
                      </div>
                    </li>
                  );
                }
                return null;
              })}
              </ul>
            )}
          </div>
        )}

        {/* 채팅 버튼 */}
        <button className="Header_icon-btn" onClick={() => setIsChatOpen(true)}>
          <MessageIcon />
        </button>
        {isChatOpen && (
          <Chat
            onClose={() => { setIsChatOpen(false); setChatInit(null); }}
            initTab={chatInit?.tab}
            initRoomId={chatInit?.roomId}
            initPartner={chatInit?.partnerName}
            initProjectId={chatInit?.projectId}
            initProjectName={chatInit?.projectName}
          />
        )}

        {/* 프로필 영역 (사진 + 이름 + 드롭다운) */}
        <div
          className="Header_user-section"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <div className="Header_user-info">
            {profileImage ? (
              <img
                src={profileImage}
                alt="프로필"
                className="Header_user-avatar-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div className="Header_user-avatar" style={{ display: profileImage ? "none" : "flex" }}>
              <span>{nameInitials}</span>
            </div>
            <div className="Header_user-details">
              <span className="Header_user-name">{userName}</span>
              <span className="Header_user-role">멤버</span>
            </div>
            <ChevronDownIcon />
          </div>

          {/* 드롭다운 메뉴 */}
          {showUserMenu && (
            <div className="Header_user-menu">
              <div className="Header_user-menu-item" onClick={() => setIsProfileOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>프로필 설정</span>
              </div>
              <div className="Header_user-menu-divider"></div>
              <div
                className="Header_user-menu-item logout"
                onClick={() => {
                  navigate("/");
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>로그아웃</span>
              </div>
            </div>
          )}
        </div>
        {isProfileOpen && <Profile onClose={() => setIsProfileOpen(false)} />}
      </div>
    </header>
  );
}

export default Header;