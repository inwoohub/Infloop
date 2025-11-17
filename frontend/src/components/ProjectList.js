import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import './ProjectList.css';

// 접근성 설정 (App의 루트 엘리먼트를 지정)
Modal.setAppElement('#root');
// Modal을 ProjectListModal이라는 이름으로 alias 처리
const ProjectListModal = Modal;

function ProjectList({ userId }) {
  const [projects, setProjects] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) {
        console.log('ProjectList: userId is not provided yet.');
        return;
      }
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/user/${userId}/projects/`,
          { withCredentials: true }
        );
        if (response.data.projects) {
          const projectsWithFavorite = response.data.projects.map(p => ({
            ...p,
            is_favorite: p.is_favorite ?? false,
          }));
          const projectsWithProgress = await Promise.all(
            projectsWithFavorite.map(async (p) => {
              try {
                const progressResponse = await axios.get(
                  `http://127.0.0.1:8000/api/user/${userId}/projects/${p.project_id}/progress/`,
                  { withCredentials: true }
                );
                return { ...p, progress: progressResponse.data.progress };
              } catch (error) {
                console.error(`Error fetching progress for project ${p.project_id}`, error);
                return { ...p, progress: 0 };
              }
            })
          );
          setProjects(projectsWithProgress);
        }
      } catch (error) {
        console.error('ProjectList: Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [userId]);

  // 프로젝트 클릭 시 상세 페이지로 이동
  const handleProjectClick = (projectId) => {
    fetch("http://127.0.0.1:8000/api/users/projects/set/", {
      method: "POST",
      credentials: "include", // 쿠키(세션 정보)를 포함합니다.
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        project_id: projectId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data.message);
        // 새로운 프로젝트가 선택되었으므로 세션이 업데이트 됩니다.
        navigate(`/project/${projectId}/task`);
      })
      .catch((err) => console.error("Error setting project ID:", err));
  };

  const handleFavoriteToggle = async (projectId, isFavorite) => {
    const effectiveIsFavorite = isFavorite ?? false;
    if (!effectiveIsFavorite) {
      const currentFavorites = projects.filter(p => p.is_favorite);
      if (currentFavorites.length >= 3) {
        alert('최대 3개의 즐겨찾기를 등록할 수 있습니다.');
        return;
      }
    }

    const url = `http://127.0.0.1:8000/api/user/${userId}/projects/${projectId}/favorite/`;
    const method = effectiveIsFavorite ? 'delete' : 'post';

    try {
      await axios({
        method: method,
        url: url,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.project_id === projectId
            ? { ...project, is_favorite: !effectiveIsFavorite }
            : project
        )
      );
    } catch (error) {
      console.error('ProjectList: Error toggling favorite:', error);
    }
  };

  // 프로젝트 정렬
  const nonFavoriteProjects = projects
    .filter(p => !p.is_favorite)
    .sort((a, b) => {
      const aStartsWithDigit = /^\d/.test(a.project_name);
      const bStartsWithDigit = /^\d/.test(b.project_name);
      if (aStartsWithDigit && !bStartsWithDigit) return 1;
      if (!aStartsWithDigit && bStartsWithDigit) return -1;
      return a.project_name.localeCompare(b.project_name, 'ko', { sensitivity: 'base' });
    });
  const favoriteProjects = projects.filter(p => p.is_favorite);
  const orderedProjects = [...favoriteProjects, ...nonFavoriteProjects];

  return (
    <div className="ProjectList_page">
      <div style={{ marginLeft: '1vw', marginTop: '1vh' }}>
        <div style={{display:"flex"}}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'black' }}>
            내 프로젝트
          </span>

          <button
              onClick={() => setModalIsOpen(true)}
              className="ProjectList-all-btn"
            >
              프로젝트 전체 보기
          </button>
        </div>
        
        {/* 스크롤 가능한 컨테이너 */}
        <div style={{ maxHeight: '18vh', overflowY: 'auto' }}>
          <ul>
            {orderedProjects.map(project => (
              <li
                key={project.project_id}
                style={{ marginTop: '1.5vh', display: 'flex', alignItems: 'center' }}
              >
                <div
                  className={`ProjectList_starbutton ${project.is_favorite ? "starred" : ""}`}
                  onClick={() => handleFavoriteToggle(project.project_id, project.is_favorite)}
                  style={{ cursor: 'pointer' }}
                ></div>
                <div style={{ width: "10vw" }}>
                <span 
                  className="ProjectList_text" 
                  style={{ marginLeft: '1vw', cursor: 'pointer' }}
                  onClick={() => handleProjectClick(project.project_id)}
                >
                  {project.project_name.length > 10
                    ? project.project_name.slice(0, 10) + ".."
                    : project.project_name}
                </span>
                </div>
                <div className="progress-bar" style={{ marginLeft: '2vw' }}>
                  <div className="progress" style={{ width: `${project.progress}%` }}></div>
                </div>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: "bold", marginLeft: "1vw" }}>
                    {project.progress}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* 전체 프로젝트 목록 모달 */}
      <ProjectListModal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        overlayClassName="ProjectListModal"
        className="ProjectListModalContent"
        contentLabel="전체 프로젝트 목록"
      >
        <button
          className="Invite_close_btn"
          onClick={() => setModalIsOpen(false)}
          style={{
            marginBottom: '10px',
            border: 'none',
            background: 'transparent',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#333'
          }}
        >
          ✖
        </button>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "3vh", fontSize: "24px", fontWeight: "bold" }}>
          <span>전체 프로젝트 목록</span>
        </div>
        <ul>
          {orderedProjects.map(project => (
            <li
              key={project.project_id}
              style={{ marginTop: '0.5vh', display: 'flex', alignItems: 'center' }}
            >
              <div
                className={`ProjectList_starbutton ${project.is_favorite ? "starred" : ""}`}
                onClick={() => handleFavoriteToggle(project.project_id, project.is_favorite)}
                style={{ cursor: 'pointer' }}
              ></div>
              <div style={{ width: "10vw", marginRight: "1vw" }}>
              <span 
                className="ProjectList_text" 
                style={{ marginLeft: '1vw', cursor: 'pointer' }}
                onClick={() => handleProjectClick(project.project_id)}
              >
                {project.project_name.length > 9
                  ? project.project_name.slice(0, 9) + ".."
                  : project.project_name}
              </span>
              </div>
              <div className="progress-bar2">
                <div className="progress" style={{ width: `${project.progress}%` }}></div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "bold", marginLeft: "1vw", marginRight: "8vw" }}>
                {project.progress}%
              </span>
            </li>
          ))}
        </ul>
        <div style={{ marginBottom: "1vh" }}>
          <div>
            <span style={{ display: "flex", justifyContent: "center", fontSize: "12px", fontWeight: "bold", marginTop: "3vh" }}>
              * 최대 3개의 즐겨찾기를 등록할 수 있습니다. *
            </span>
          </div>
        </div>
      </ProjectListModal>
    </div>
  );
}

export default ProjectList;
