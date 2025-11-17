import React, { useState, useEffect , useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaArrowUp, FaSyncAlt, FaCalendarAlt } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ProjectCreation.css';
import Invite from './Invite';
import Loading from '../components/Loading';

function ProjectCreation() {
  const [userName, setUserName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [techStack, setTechStack] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/users/name/', { withCredentials: true });
        setUserName(response.data.name);
      } catch (error) {
        alert('사용자 이름을 가져오는 데 실패했습니다.');
      }
    };
    fetchUserName();
  }, []);

  const handleTeamMembersUpdate = () => {
    try {
      const storedTeamMembers = sessionStorage.getItem('team_member');
      if (storedTeamMembers) {
        setTeamMembers(JSON.parse(storedTeamMembers));
      }
    } catch (error) {
      console.error('팀원 정보 업데이트 중 오류:', error);
    }
  };

  useEffect(() => {
    const storedTeamMembers = sessionStorage.getItem('team_member');
    if (storedTeamMembers) {
      setTeamMembers(JSON.parse(storedTeamMembers));
    }

    window.addEventListener('teamMembersUpdated', handleTeamMembersUpdate);
    return () => {
      window.removeEventListener('teamMembersUpdated', handleTeamMembersUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      handleTeamMembersUpdate();
    }
  }, [isModalOpen]);

  const handleCreateTasks = async (e) => {
    e.preventDefault();
    if (!projectName) return alert('프로젝트 이름을 입력해주세요.');
    if (!startDate || !endDate) return alert('시작일과 마감일을 선택해주세요.');

    sessionStorage.setItem('project_name', projectName);

    const storedTeamMembers = sessionStorage.getItem('team_member');
    const teamData = storedTeamMembers ? JSON.parse(storedTeamMembers) : [];
    const selectedUserIds = teamData.map((member) => member.user_id);

    if (selectedUserIds.length === 0) return alert('최소 한 명 이상 초대해야 합니다.');

    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      setLoading(true);

      const response = await axios.post('http://127.0.0.1:8000/gptapi/generate_high_level_tasks/', {
        project_topic: projectName,
        project_description: projectDescription,
        project_goal: projectGoal,
        tech_stack: techStack,
        selected_users: selectedUserIds,
        project_start_date: startStr,
        project_end_date: endStr
      });

      setTasks(response.data.tasks);
      setLoading(false);
      navigate('/project-detail', {
        state: {
          projectName: response.data.project_name || projectName,
          projectId: null,
          tasks: response.data.tasks,
          selectedUsers: selectedUserIds,
          start_date: startStr,
          end_date: endStr,
          project_description: projectDescription,   // ✅ 추가
          project_goal: projectGoal,                 // ✅ 추가
          tech_stack: techStack                      // ✅ 추가
        }
      });      
    } catch (error) {
      setLoading(false);
    
      if (error.response?.status === 400 && error.response.data?.invalid_fields) {
        const fields = error.response.data.invalid_fields;
        const fieldLabels = {
          "프로젝트 이름": "프로젝트 이름",
          "설명": "프로젝트 설명",
          "목표": "프로젝트 목표 및 산출물"
        };
    
        const fieldNames = fields.map(f => fieldLabels[f] || f);
        alert(`입력한 내용 중 문제가 있는 항목이 있습니다:\n\n- ${fieldNames.join('\n- ')}\n\n내용을 다시 확인해주세요.`);
      } else {
        alert('GPT로부터 업무 생성에 실패했습니다.');
        console.error(error);
      }
    }
  };


  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => handleTeamMembersUpdate(), 100);
  };

  const availableTech = [
    'React',
    'Vue.js',
    'Django',
    'FastAPI',
    'Node.js',
    'Spring Boot',
    'Firebase',
    'MySQL',
    'MongoDB',
    'Figma',
    'AWS',
    'Docker',
  ];

  return (
    <div >
      {loading && <Loading message="업무를 생성하고 있습니다." />}

      <div className="ProjectContainer">
        <h1 className="ProjectTitle">새 프로젝트</h1>

        <div className="DateAndTeamRow">
          <div className="DatePickers">
            <div className="DatePickerContainer">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="시작 날짜"
                className="DateInput"
                minDate={new Date()}
              />
              <FaCalendarAlt className="CalendarIcon" />
            </div>
            <div className="DatePickerContainer">
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                placeholderText="마감 날짜"
                className="DateInput"
                minDate={startDate || new Date()}
              />
              <FaCalendarAlt className="CalendarIcon" />
            </div>
          </div>

          <div className="TeamProfiles">
            {teamMembers.map((member) => (
              <div key={member.user_id} className="ProfileCircle">
                {member.name}
              </div>
            ))}
          </div>
        </div>

        <form ref={formRef} className="ProjectForm" onSubmit={handleCreateTasks}>
          <label className="ProjectLabel">프로젝트 이름</label>
          <div className="ProjectInputWrapper">
            <input
              type="text"
              className="ProjectInput"
              placeholder="예: 학내 커뮤니티 기반 중고마켓 앱 개발"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <button type="submit" className="ProjectSubmitButton">
              <FaArrowUp />
            </button>
          </div>
        </form>
        <div className="ProjectFormGroup">
          <label className="ProjectLabel">프로젝트 설명</label>
          <textarea
            className="ProjectTextArea"
            placeholder="예: 학내 구성원 간 커뮤니티 기반으로 중고 물품을 거래할 수 있는 온라인 플랫폼을 개발합니다.
                        커뮤니티 인증 시스템과 실시간 채팅 기능, 거래 이력 추적 기능을 포함하여 사용자 간 안전한 거래 환경을 제공합니다."
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />

          <label className="ProjectLabel">프로젝트 목표 및 산출물</label>
          <textarea
            className="ProjectTextArea"
            placeholder="예: 주요 목표는 모바일과 웹 환경에서 모두 사용할 수 있는 반응형 중고마켓 앱을 완성하는 것입니다.
                        산출물로는 서비스 시나리오에 따른 기능 설계서, 데이터베이스 ERD,
                        디자인(Figma), 기능 구현 코드 및 발표자료(PPT)와 시연 영상이 포함됩니다."
            value={projectGoal}
            onChange={(e) => setProjectGoal(e.target.value)}
          />

          <label className="ProjectLabel">사용 기술 스택 (선택 사항)</label>
          <div className="TechStackContainer">
            {availableTech.map((tech) => (
              <label key={tech} className="TechCheckbox">
                <input
                  type="checkbox"
                  value={tech}
                  checked={techStack.includes(tech)}
                  onChange={(e) =>
                    setTechStack((prev) =>
                      e.target.checked ? [...prev, tech] : prev.filter((t) => t !== tech)
                    )
                  }
                />
                {tech}
              </label>
            ))}
          </div>
          <div className='ProjectCreation_footer'>
            <button
              type="button"
              className='ProjectCreation_footer_btn'
              disabled={loading}
              onClick={() => formRef.current?.requestSubmit()} // HTML5 표준
            >
              생성하기
            </button>   
          </div>
        </div>

      </div>

      {isModalOpen && <Invite onClose={handleModalClose} />}
    </div>
  );
}

export default ProjectCreation;
