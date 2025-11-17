/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Topbar from "../components/Topbar";
import Topbarst from "../components/Topbarst";
import "./ProjectActivity.css";
import { useParams } from "react-router-dom";

function ProjectActivity() {
  const { projectId } = useParams();
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState([]);

  // ✅ 유저 캐시: byId, byName 두 가지 키로 조회 가능
  const [userCache, setUserCache] = useState({
    byId: {},   // { "20221374": { name, profile_image } }
    byName: {}, // { "김진성": { user_id, profile_image } }
  });

  // ✅ 상대 경로 → 절대 경로 보정
  const toAbs = (url) =>
    url?.startsWith("http") ? url : url ? `http://127.0.0.1:8000${url}` : null;

  // ✅ 이니셜 생성 (헤더 기본 아바타와 동일 컨셉)
  const getInitials = (name = "") => {
    const t = name.trim();
    if (!t) return "🙂";
    // 공백으로 나뉜 영문 이름: 앞 2글자 결합, 한글/단일어: 앞 2글자
    const parts = t.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return t.length >= 2 ? t.slice(0, 2) : t[0];
  };

  /* ────────────────────────────────
     [task_id=2266] 업무명  업무가 삭제됨
     [task_id=2267] 업무명  업무 생성
     문자열을 파싱해 id·업무명·verb(꼬리표) 반환
  ────────────────────────────────*/
  const parseSnapshot = (content = "") => {
    const m = content.match(
      /^\[task_id=(\d+)\]\s*(.*?)\s*(업무가\s*삭제됨|업무\s*생성)?$/u
    );
    if (!m) return { id: null, name: content.trim(), verb: "" };
    return { id: m[1], name: m[2].trim(), verb: (m[3] || "").trim() };
  };

  /* ────────────────────────────────
     1) 프로젝트 로그 가져오기
  ────────────────────────────────*/
  useEffect(() => {
    axios
      .get(`http://127.0.0.1:8000/api/projects/${projectId}/logs/`)
      .then((res) => setLogs(res.data))
      .catch((err) => console.error("로그 불러오기 실패:", err));
  }, [projectId]);

  /* ────────────────────────────────
     2) 유저 목록(+프로필 이미지) 캐시
  ────────────────────────────────*/
  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/users/userslist/")
      .then((res) => {
        const byId = {};
        const byName = {};
        (res.data || []).forEach((u) => {
          const uid = String(u.user_id);
          const img = toAbs(u.profile_image);
          byId[uid] = { name: u.name, profile_image: img };
          if (u.name) byName[u.name.trim()] = { user_id: uid, profile_image: img };
        });
        setUserCache({ byId, byName });
      })
      .catch((err) => console.error("유저 목록 불러오기 실패:", err));
  }, []);

  /* ────────────────────────────────
     3) 라벨 색상 매핑
  ────────────────────────────────*/
  const labelClass = (action) =>
    ({
      "댓글 등록": "action-댓글등록",
      "업무 상태 변경": "action-업무상태변경",
      "담당자 변경": "action-담당자변경",
      "상위 업무 생성": "action-업무생성",
      "하위 업무 생성": "action-업무생성",
      "상위 업무 삭제": "action-업무삭제",
      "하위 업무 삭제": "action-업무삭제",
      "파일 업로드": "action-파일업로드",
    }[action] || "");

  /* ────────────────────────────────
     4) 검색(작성자)
  ────────────────────────────────*/
  const shown = logs.filter((l) =>
    (l.user_name || l.user || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ────────────────────────────────
     5) 렌더링
  ────────────────────────────────*/
  return (
    <div className="ProjectActivity_wrapper">
      <Topbarst />
      <Topbar />

      <div className="ProjectActivity_main">
        {/* 검색창 */}
        <div className="ProjectActivity_content">
          <div className="ProjectActivity_searchRow">
            <input
              type="text"
              className="ActivitySearchInput"
              placeholder="작성자 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 로그 목록 */}
          <div className="ActivityList">
            {shown.map((log, idx) => {
              // 백엔드에서 내려오는 키 네임 정규화
              const userName = (log.user_name || log.user || "알 수 없음").trim();
              const createdAt = log.created_date || log.date;
              const taskObj = log.task_name || log.task || null;

              // 스냅샷 파싱
              const snap = parseSnapshot(log.content || "");
              const taskName = taskObj || snap.name;

              // 내용(verb 없는 일반 로그는 task_id 부분 제거)
              const bodyText =
                snap.verb ||
                (log.content || "").replace(/^\[task_id=\d+\]\s*/u, "");

              // ✅ 가능하면 user_id로, 없으면 이름으로 캐시 조회
              const uidRaw = log.user_id ?? log.author_id ?? "";
              const uid = uidRaw !== null && uidRaw !== undefined ? String(uidRaw) : "";
              const fromId = uid && userCache.byId[uid];
              const fromName = !fromId && userCache.byName[userName];

              const avatarSrc =
                (fromId?.profile_image || fromName?.profile_image) || null;

              return (
                <div className="ActivityItem" key={idx}>
                  <div className="ActivityAvatar">
                    {/* 이미지가 있으면 시도 */}
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="user"
                        onError={(e) => {
                          // 이미지 로드 실패 시, 이미지 숨기고 기본 아바타(헤더 스타일) 노출
                          e.currentTarget.classList.add("is-hidden");
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove("is-hidden");
                        }}
                      />
                    ) : null}

                    {/* 기본값: 헤더와 동일한 클래스 사용해서 스타일 재사용 */}
                    <div
                      className={`Header_user-avatar ${avatarSrc ? "is-hidden" : ""}`}
                      // 헤더 CSS 재사용: 원형 그레이 배경 + 이니셜
                      // (is-hidden은 CSS에서 display:none 처리됨)
                    >
                      <span>{getInitials(userName)}</span>
                    </div>
                  </div>

                  <div className="ActivityContent">
                    {/* 작성자 + 액션 */}
                    <p>
                      <strong>{userName}</strong> 님의&nbsp;
                      <span className={`action-label ${labelClass(log.action)}`}>
                        {log.action}
                      </span>
                    </p>

                    {/* 업무명 */}
                    {taskName && (
                      <p className="ActivityTask">
                        업무명:&nbsp;<span>{taskName}</span>
                      </p>
                    )}

                    {/* 내용 */}
                    {bodyText && (
                      <p className="ActivityDetail">
                        내용:&nbsp;<span>{bodyText}</span>
                      </p>
                    )}

                    {/* 날짜 */}
                    <p className="ActivityDate">
                      {createdAt && new Date(createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectActivity;
