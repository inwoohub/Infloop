// App.js
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';  
import Login from './pages/Login';
import MainPage from './pages/MainPage';
import Calendar from './pages/Calendar';
import ProjectCreation from './pages/ProjectCreation';
import Header from './components/Header';
import Invite from './pages/Invite';
import Minutes from "./pages/Minutes"; 
import Report from "./pages/Report"; 
import Chat from "./pages/Chat"; 
import ProjectDetail from './pages/ProjectDetail';
import Profile from './pages/Profile'; 
import TaskPage from './pages/TaskPage';
import Files from './pages/Files';
import axios from "axios";
import ProjectCalendar from './pages/ProjectCalendar';
import ProjectFile from './pages/ProjectFile';
import ProjectActivity from './pages/ProjectActivity';
import TeamFinder from './pages/TeamFinder';
import ScrollToTop from './components/ScrollToTop';


function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // 1) "/main"에서만 사용자 정보 호출
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") return;
    if (path !== "/main" && !/^\/project\/\d+\/task$/.test(path)) return;

    const fetchUserData = async () => {
      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/api/users/name/",
          { withCredentials: true }
        );
        setUserName(response.data.name);
        setUserId(response.data.user_id);
      } catch (error) {
        alert("사용자 정보를 가져오는 데 실패했습니다.");
      }
    };
    fetchUserData();
  }, [location.pathname]);

  // 2) userId가 생기면 "현재 프로젝트" 정보를 가져오는데,
  //    URL에 "/project/"가 있으면 덮어쓰지 않도록 조건을 준다.
  useEffect(() => {
    if (!userId) return;

    // 🟨🟨 핵심: "URL이 /project/..." 형태라면, 전역 currentProjectId를 덮어쓰지 않는다.
    if (location.pathname.startsWith("/project/")) {
      return;
    }

    const fetchProjectData = async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:8000/api/users/projects/get/",
          { withCredentials: true }
        );
        if (res.data && res.data.project_id) {
          setCurrentProjectId(res.data.project_id);
        }
      } catch (error) {
        console.error("프로젝트 정보를 가져오는 데 실패했습니다.", error);
      }
    };
    fetchProjectData();
  }, [userId, location.pathname]);

  const userInitials = userName ? userName.slice(-2) : "";

  // 특정 페이지에서는 헤더를 숨김
  const hideHeaderOnRoutes = ["/", "/Invite", "/Chat", "/profile"];
  const showHeader = !hideHeaderOnRoutes.includes(location.pathname);

  return (
    <>
      {showHeader && (
        <Header
          nameInitials={userInitials}
          currentProjectId={currentProjectId}
        />
      )}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/main" element={ <MainPage userId={userId} userName={userName} nameInitials={userInitials}/>}/>
        
        
        
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/team-finder" element={<TeamFinder />} />
        <Route
          path="/create-project"
          element={<ProjectCreation nameInitials={userInitials} />}
        />
        <Route path="/invite" element={<Invite />} />
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/project-detail"
          element={<ProjectDetail nameInitials={userInitials} />}
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/files" element={<Files />} />
        <Route
          path="/project/:projectId/minutes"
          element={<Minutes nameInitials={userInitials} />}
        />
        <Route
          path="/project/:projectId/report"
          element={<Report nameInitials={userInitials} />}
        />
        <Route
          path="/project/:projectId/task"
          element={<TaskPage nameInitials={userInitials} />}
        />
        <Route
          path="/project/:projectId/file"
          element={<ProjectFile nameInitials={userInitials}/>}
        />
        <Route
          path="/project/:projectId/calendar"
          element={<ProjectCalendar />}
        />
        <Route
          path="/project/:projectId/activity"
          element={<ProjectActivity />}
        />
        
      </Routes>
    </>
  );
}

export default App;
