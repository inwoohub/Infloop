import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom"; // ★ URL 파라미터 사용
import axios from "axios";
import "./Topbarst.css";

function Topbarst() {
  // 라우트 파라미터에서 projectId 읽기 (ex: /project/281/task → routeProjectId=281)
  const { projectId: routeProjectId } = useParams();

  // 즐겨찾기 상태
  const [isStarred, setIsStarred] = useState(false);

  // 현재 표시할 프로젝트 이름, 실제 ID
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState(null);

  // ▼ 이전(직전) 프로젝트 이름을 저장하는 ref
  const previousProjectNameRef = useRef("");

  // 사용자 정보
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  // 1) 사용자 정보 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/users/name/", {
          withCredentials: true
        });
        setUserName(res.data.name);
        setUserId(res.data.user_id);
      } catch (error) {
        alert("사용자 정보를 가져오는 데 실패했습니다.");
      }
    };
    fetchUserData();
  }, []);

  // 2) 사용자 ID와 라우트 파라미터가 있으면,
  //    해당 사용자의 '프로젝트 목록'을 불러와 routeProjectId에 해당하는 프로젝트를 찾는다.
  useEffect(() => {
    if (!userId || !routeProjectId) return;

    const fetchProjectByRouteParam = async () => {
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/user/${userId}/projects/`,
          { withCredentials: true }
        );

        if (res.data && res.data.projects) {
          // routeProjectId와 일치하는 프로젝트를 찾는다
          const matched = res.data.projects.find(
            (p) => p.project_id === Number(routeProjectId)
          );
          if (matched) {
            setProjectId(matched.project_id);
            setProjectName(matched.project_name || "");
            setIsStarred(Boolean(Number(matched.is_favorite)));
          } else {
            // 매칭되는 프로젝트가 없다면, 기존 이름 그대로 유지 (혹은 원하는 처리)
            // setProjectName("해당 프로젝트를 찾을 수 없습니다.");  // → 필요하다면 안내만
          }
        }
      } catch (err) {
        console.error("프로젝트 목록 불러오기 실패:", err);
      }
    };

    fetchProjectByRouteParam();
  }, [userId, routeProjectId]);

  // 3) projectName이 바뀔 때마다, 이전 projectName을 ref로 저장해둔다.
  useEffect(() => {
    if (projectName) {
      previousProjectNameRef.current = projectName;
    }
  }, [projectName]);

  // 즐겨찾기 토글
  const handleFavoriteToggle = async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다.");
      return;
    }
    try {
      const url = `http://127.0.0.1:8000/api/user/${userId}/projects/${projectId}/favorite/`;
      const method = isStarred ? "delete" : "post";

      await axios({
        method,
        url,
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
        data: { favorite: !isStarred }
      });

      setIsStarred(!isStarred);
      console.log(!isStarred ? "즐겨찾기 추가" : "즐겨찾기 해제");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("최대 3개의 즐겨찾기를 등록할 수 있습니다.");
    }
  };

  // 리스트 아이콘 클릭 (추가 기능이 필요하면 구현)
  const handleListClick = () => {
    console.log("프로젝트 리스트 클릭");
  };

  // 프로젝트 이름 표시 로직:
  //   - 현재 projectName이 비어있다면 이전 projectName을 표시
  //   - 그렇지 않으면 현재 projectName을 표시
  const displayedProjectName = projectName || previousProjectNameRef.current;

  return (
    <header className="Topbarst_header">
      <div className="Topbarst_profile_button"></div>
      {/* 즐겨찾기 버튼 */}
      <div
        className={`Topbarst_profile_starbutton ${isStarred ? "starred" : ""}`}
        onClick={handleFavoriteToggle}
      />
      <img
        className="Topbarst_listlogo"
        alt="listlogo"
        src="/listlogo.jpg"
        onClick={handleListClick}
      />
      {/* 프로젝트 이름 동적 표시 */}
      <h1>{displayedProjectName}</h1>
    </header>
  );
}

export default Topbarst;
