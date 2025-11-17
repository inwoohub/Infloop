// import React, { useState, useEffect } from "react";
// import "./Invite.css";

// const Invite = ({ onClose, userId }) => {
//   const [currentUserId, setCurrentUserId] = useState(userId); // ✅ 로그인된 사용자 ID 저장
//   const [users, setUsers] = useState([]); // 전체 사용자 목록
//   const [selectedUsers, setSelectedUsers] = useState([]); // 초대한 사용자 목록
//   const [searchTerm, setSearchTerm] = useState(""); // 검색어 상태
//   const [teamLeader, setTeamLeader] = useState(null); // ✅ 팀장 정보 저장
//   const [projectId, setProjectId] = useState(null); // ✅ 프로젝트 ID 저장

//   // ✅ 1️⃣ 로그인된 사용자 정보 가져오기
//   useEffect(() => {
//     if (!currentUserId) {
//       fetch("http://127.0.0.1:8000/api/users/name/", {
//         method: "GET",
//         credentials: "include", // ✅ 세션 유지 필수!
//       })
//         .then((res) => {
//           if (!res.ok) throw new Error("Unauthorized");
//           return res.json();
//         })
//         .then((data) => {
//           if (data.user_id) {
//             setCurrentUserId(data.user_id);
//             setTeamLeader(data.user_id); // ✅ 팀장 설정
//           } else {
//             console.error("로그인 정보 없음");
//           }
//         })
//         .catch((err) => console.error("사용자 정보를 불러오지 못했습니다.", err));
//     }
//   }, [currentUserId]);

//   // ✅ 2️⃣ 백엔드에서 사용자 목록 가져오기
//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/api/users/userslist/")
//       .then((res) => res.json())
//       .then((data) => setUsers(data))
//       .catch((err) => console.error("사용자 목록을 불러오지 못했습니다.", err));
//   }, []);

//   // ✅ 사용자를 클릭하면 초대 목록에 추가 / 제거 (팀장은 고정)
//   const handleUserClick = (id) => {
//     if (id === teamLeader) return; // ✅ 팀장은 추가/제거 불가능

//     setSelectedUsers((prev) =>
//       prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
//     );
//   };

//   // ✅ 3️⃣ 프로젝트 ID를 서버로 전송
//   const sendProjectIdToServer = (newProjectId) => {
//     if (!newProjectId) {
//       console.error("⚠️ project_id가 없습니다.");
//       return;
//     }

//     const requestData = { project_id: newProjectId };

//     fetch("http://127.0.0.1:8000/api/users/project/data/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",},
//       credentials: "include", // ✅ 세션 유지 필수!
//       body: JSON.stringify(requestData),
//     })
//       .then((res) => {
//         if (!res.ok) {
//           throw new Error(`HTTP error! Status: ${res.status}`);
//         }
//         return res.json();
//       })
//       .then((data) => console.log("✅ 서버 응답:", data))
//       .catch((err) => console.error("❌ 전송 실패:", err));
//   };

//   const createProject = () => {
//     if (selectedUsers.length === 0) {
//       alert("최소 한 명 이상 초대해야 합니다.");
//       return;
//     }
  
//     if (!currentUserId) {
//       alert("로그인된 사용자 정보를 불러올 수 없습니다.");
//       return;
//     }
  
//     // ✅ 기존 프로젝트 ID 삭제 (새 프로젝트 만들기 전에)
//     sessionStorage.removeItem("project_id");
  
//     // ✅ 팀원 저장
//     sessionStorage.setItem("selected_team_members", JSON.stringify(selectedUsers));
  
//     const requestData = {
//       user_id: currentUserId, // ✅ 로그인된 사용자 ID
//       members: selectedUsers, // ✅ 초대한 사용자 목록 (팀장은 제외됨)
//     };
  
//     console.log("📡 보내는 데이터:", requestData);
  
//     fetch("http://127.0.0.1:8000/api/users/create_project/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include", // ✅ 세션 유지 필수!
//       body: JSON.stringify(requestData),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.project_id) {
//           alert(`프로젝트가 생성되었습니다! (ID: ${data.project_id})`);
          
//           sessionStorage.setItem("project_id", data.project_id); // ✅ 프로젝트 ID 저장
//           sessionStorage.setItem("selected_users", JSON.stringify(selectedUsers));  // ✅ 팀원 정보 저장
//           setProjectId(data.project_id); // ✅ 상태값 업데이트
//           setTimeout(() => {
//             console.log("🔄 모달 닫기 실행");
//             onClose();
//           }, 500);
//         } else {
//           alert("프로젝트 생성에 실패했습니다.");
//         }
//       })
//       .catch((err) => console.error("❌ 프로젝트 생성 실패:", err));
//   };
  

//   // ✅ 검색된 사용자 목록 필터링 (팀장은 초대 목록에서 제외)
//   const filteredUsers = users
//     .filter((user) => !selectedUsers.includes(user.user_id) && user.user_id !== teamLeader)
//     .filter((user) =>
//       searchTerm === "" ||
//       user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       String(user.user_id).includes(searchTerm)
//     );

//   // ✅ 5️⃣ 프로젝트 ID가 변경되면 자동으로 서버로 전송
//   useEffect(() => {
//     if (projectId) {
//       sendProjectIdToServer(projectId);
//     }
//   }, [projectId]); 


//   return (
//     <div className="Invite_overlay">
//       <div className="Invite_modal">
//         <button className="Invite_close_btn" onClick={onClose}>✖</button>
//         <div className="Invite_app">
//           <div className="Invite_page">
//             <div className="Invite_page2">
//               <div className="Invite_top">
//                 <div className="Invite_header">
//                   <h1>추가 가능</h1>
//                   <h1>참여자</h1>
//                 </div>
//               </div>

//               <div className="Invite_lists">
//                 <div className="Invite_user_list">
//                   <input
//                     type="text"
//                     className="Invite_search-bar"
//                     placeholder="이름 또는 학번 검색"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                   />
//                   <ul>
//                     {filteredUsers.map((user) => (
//                       <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
//                         {user.name} ({user.user_id})
//                       </li>
//                     ))}
//                   </ul>
//                 </div>

//                 <div className="Invite_selected_users">
//                   <ul>
//                     {/* ✅ 팀장을 최상단에 고정 */}
//                     {teamLeader && (
//                       <li key={teamLeader} className="team-leader">
//                         <strong>👑 나 {users.find((u) => u.user_id === teamLeader)?.name} ({teamLeader})</strong>
//                       </li>
//                     )}
//                     {selectedUsers.map((userId) => {
//                       const user = users.find((u) => u.user_id === userId);
//                       return user ? (
//                         <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
//                           {user.name} ({user.user_id}) ✖
//                         </li>
//                       ) : null;
//                     })}
//                   </ul>
//                 </div>
//               </div>

//               <div className="Invite_button_container">
//                 <button className="Invite_Invitebut" onClick={createProject}>
//                   초대 하기
//                 </button>
//               </div>

//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Invite;




// --------------------------------------------
// --------------------------------------------

// 25-03-04  20:34

// import React, { useState, useEffect } from "react";
// import "./Invite.css";

// const Invite = ({ onClose, userId }) => {
//   const [currentUserId, setCurrentUserId] = useState(userId); // 로그인된 사용자 ID 저장
//   const [currentUserName, setCurrentUserName] = useState(""); 
//   const [users, setUsers] = useState([]); // 전체 사용자 목록
//   const [selectedUsers, setSelectedUsers] = useState([]); // 초대한 사용자 목록 (사용자 ID 배열)
//   const [searchTerm, setSearchTerm] = useState(""); // 검색어 상태
//   const [teamLeader, setTeamLeader] = useState(null); // 팀장 정보 저장
//   const [projectId, setProjectId] = useState(null); // 프로젝트 ID 저장

//   // 1️⃣ 로그인된 사용자 정보 가져오기
//   useEffect(() => {
//     if (!currentUserId) {
//       fetch("http://127.0.0.1:8000/api/users/name/", {
//         method: "GET",
//         credentials: "include", // 세션 유지 필수!
//       })
//         .then((res) => {
//           if (!res.ok) throw new Error("Unauthorized");
//           return res.json();
//         })
//         .then((data) => {
//           if (data.user_id) {
//             setCurrentUserId(data.user_id);
//             setTeamLeader(data.user_id); // 팀장 설정
//             setCurrentUserName(data.name);     // 팀장(로그인 사용자) 이름 설정
//           } else {
//             console.error("로그인 정보 없음");
//           }
//         })
//         .catch((err) => console.error("사용자 정보를 불러오지 못했습니다.", err));
//     }
//   }, [currentUserId]);

//   // 2️⃣ 백엔드에서 사용자 목록 가져오기
//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/api/users/userslist/")
//       .then((res) => res.json())
//       .then((data) => setUsers(data))
//       .catch((err) => console.error("사용자 목록을 불러오지 못했습니다.", err));
//   }, []);

//   // 사용자를 클릭하면 초대 목록에 추가/제거 (팀장은 고정)
//   const handleUserClick = (id) => {
//     if (id === teamLeader) return; // 팀장은 추가/제거 불가능

//     setSelectedUsers((prev) =>
//       prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
//     );
//   };

//   // 3️⃣ 프로젝트 ID를 서버로 전송
//   const sendProjectIdToServer = (newProjectId) => {
//     if (!newProjectId) {
//       console.error("⚠️ project_id가 없습니다.");
//       return;
//     }

//     const requestData = { project_id: newProjectId };

//     fetch("http://127.0.0.1:8000/api/users/project/data/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       credentials: "include", // 세션 유지 필수!
//       body: JSON.stringify(requestData),
//     })
//       .then((res) => {
//         if (!res.ok) {
//           throw new Error(`HTTP error! Status: ${res.status}`);
//         }
//         return res.json();
//       })
//       .then((data) => console.log("✅ 서버 응답:", data))
//       .catch((err) => console.error("❌ 전송 실패:", err));
//   };

//   // 프로젝트 생성 함수
//   const createProject = () => {
//     if (selectedUsers.length === 0) {
//       alert("최소 한 명 이상 초대해야 합니다.");
//       return;
//     }

//     if (!currentUserId) {
//       alert("로그인된 사용자 정보를 불러올 수 없습니다.");
//       return;
//     }

//     // 새 프로젝트 만들기 전에 기존 project_id 삭제
//     sessionStorage.removeItem("project_id");

//     // 백엔드에 전송할 데이터는 로그인 사용자와 초대된 사용자들의 ID 배열 (팀장은 별도 처리)
//     const requestData = {
//       user_id: currentUserId, // 로그인된 사용자 ID
//       members: selectedUsers, // 초대한 사용자 목록 (팀장은 제외됨)
//     };

//     // 팀장 + 초대한 사용자들의 전체 정보를 객체 배열로 구성하여 "team_member"에 저장
//     const allTeamMemberIds = [teamLeader, ...selectedUsers];
//     const selectedUserObjects = allTeamMemberIds.map((id) => {
//       if (id === teamLeader) {
//         // 팀장일 경우, currentUserName을 사용
//         return { user_id: teamLeader, name: currentUserName };
//       }
//       // 팀장이 아니면 users 배열에서 찾는다
//       const user = users.find((u) => u.user_id === id);
//       return user
//         ? { user_id: user.user_id, name: user.name }
//         : { user_id: id, name: "이름없음" };
//     });

//     // 세션 스토리지에 팀원 전체 정보 저장 (키: "team_member")
//     sessionStorage.setItem("team_member", JSON.stringify(selectedUserObjects));

//     console.log("📡 보내는 데이터:", requestData);

//     fetch("http://127.0.0.1:8000/api/users/create_project/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include", // 세션 유지 필수!
//       body: JSON.stringify(requestData),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.project_id) {
//           alert(`프로젝트가 생성되었습니다! (ID: ${data.project_id})`);
//           sessionStorage.setItem("project_id", data.project_id); // 프로젝트 ID 저장
//           setProjectId(data.project_id); // 상태값 업데이트
//           setTimeout(() => {
//             console.log("🔄 모달 닫기 실행");
//             onClose();
//           }, 500);
//         } else {
//           alert("프로젝트 생성에 실패했습니다.");
//         }
//       })
//       .catch((err) => console.error("❌ 프로젝트 생성 실패:", err));
//   };

//   // 검색어에 따른 사용자 목록 필터링 (팀장은 제외)
//   const filteredUsers = users
//     .filter((user) => !selectedUsers.includes(user.user_id) && user.user_id !== teamLeader)
//     .filter(
//       (user) =>
//         searchTerm === "" ||
//         user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         String(user.user_id).includes(searchTerm)
//     );

//   // 프로젝트 ID가 변경되면 자동으로 서버로 전송
//   useEffect(() => {
//     if (projectId) {
//       sendProjectIdToServer(projectId);
//     }
//   }, [projectId]);

//   return (
//     <div className="Invite_overlay">
//       <div className="Invite_modal">
//         <button className="Invite_close_btn" onClick={onClose}>
//           ✖
//         </button>
//         <div className="Invite_app">
//           <div className="Invite_page">
//             <div className="Invite_page2">
//               <div className="Invite_top">
//                 <div className="Invite_header">
//                   <h1>추가 가능</h1>
//                   <h1>참여자</h1>
//                 </div>
//               </div>
//               <div className="Invite_lists">
//                 <div className="Invite_user_list">
//                   <input
//                     type="text"
//                     className="Invite_search-bar"
//                     placeholder="이름 또는 학번 검색"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                   />
//                   <ul>
//                     {filteredUsers.map((user) => (
//                       <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
//                         {user.name} ({user.user_id})
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//                 <div className="Invite_selected_users">
//                   <ul>
//                     {/* 팀장은 최상단에 고정 */}
//                     {teamLeader && (
//                       <li key={teamLeader} className="team-leader">
//                         <strong>
//                           👑 나 {users.find((u) => u.user_id === teamLeader)?.name} ({teamLeader})
//                         </strong>
//                       </li>
//                     )}
//                     {selectedUsers.map((userId) => {
//                       const user = users.find((u) => u.user_id === userId);
//                       return user ? (
//                         <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
//                           {user.name} ({user.user_id}) ✖
//                         </li>
//                       ) : null;
//                     })}
//                   </ul>
//                 </div>
//               </div>
//               <div className="Invite_button_container">
//                 <button className="Invite_Invitebut" onClick={createProject}>
//                   초대 하기
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Invite;



// ====================================================
// 04.02

// import React, { useState, useEffect } from "react";
// import "./Invite.css";

// const Invite = ({ onClose }) => {
//   const [currentUserId, setCurrentUserId] = useState(null);
//   const [currentUserName, setCurrentUserName] = useState("");
//   const [users, setUsers] = useState([]);
//   const [selectedUsers, setSelectedUsers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [teamLeader, setTeamLeader] = useState(null);

//   // 로그인된 사용자 정보 가져오기
//   useEffect(() => {
//     if (!currentUserId) {
//       fetch("http://127.0.0.1:8000/api/users/name/", {
//         method: "GET",
//         credentials: "include",
//       })
//         .then((res) => {
//           if (!res.ok) throw new Error("Unauthorized");
//           return res.json();
//         })
//         .then((data) => {
//           if (data.user_id) {
//             setCurrentUserId(data.user_id);
//             setTeamLeader(data.user_id); // 팀장은 로그인한 사용자
//             setCurrentUserName(data.name);
//           } else {
//             console.error("로그인 정보 없음");
//           }
//         })
//         .catch((err) => console.error("사용자 정보를 불러오지 못했습니다.", err));
//     }
//   }, [currentUserId]);

//   // 사용자 목록 가져오기
//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/api/users/userslist/")
//       .then((res) => res.json())
//       .then((data) => setUsers(data))
//       .catch((err) => console.error("사용자 목록을 불러오지 못했습니다.", err));
//   }, []);

//   // 사용자를 클릭하면 초대 목록에 추가/제거 (팀장은 고정)
//   const handleUserClick = (id) => {
//     if (id === teamLeader) return;
//     setSelectedUsers((prev) =>
//       prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
//     );
//   };

//   // 팀원 전체 정보를 세션에 저장 (팀장 + 선택된 사용자)
//   useEffect(() => {
//     if (currentUserId && users.length > 0) {
//       const allTeamMemberIds = [teamLeader, ...selectedUsers];
//       const selectedUserObjects = allTeamMemberIds.map((id) => {
//         if (id === teamLeader) {
//           return { user_id: teamLeader, name: currentUserName };
//         }
//         const user = users.find((u) => u.user_id === id);
//         return user ? { user_id: user.user_id, name: user.name } : { user_id: id, name: "이름없음" };
//       });
//       sessionStorage.setItem("team_member", JSON.stringify(selectedUserObjects));
//     }
//   }, [currentUserId, teamLeader, selectedUsers, users, currentUserName]);

//   // 검색어에 따른 사용자 필터링 (팀장은 제외)
//   const filteredUsers = users
//     .filter((user) => !selectedUsers.includes(user.user_id) && user.user_id !== teamLeader)
//     .filter(
//       (user) =>
//         searchTerm === "" ||
//         user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         String(user.user_id).includes(searchTerm)
//     );

//   return (
//     <div className="Invite_overlay">
//       <div className="Invite_modal">
//         <button className="Invite_close_btn" onClick={onClose}>
//           ✖
//         </button>
//         <div className="Invite_app">
//           <div className="Invite_page">
//             <div className="Invite_page2">
//               <div className="Invite_top">
//                 <div className="Invite_header">
//                   <h1>추가 가능</h1>
//                   <h1>참여자</h1>
//                 </div>
//               </div>
//               <div className="Invite_lists">
//                 <div className="Invite_user_list">
//                   <input
//                     type="text"
//                     className="Invite_search-bar"
//                     placeholder="이름 또는 학번 검색"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                   />
//                   <ul>
//                     {filteredUsers.map((user) => (
//                       <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
//                         {user.name} ({user.user_id})
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//                 <div className="Invite_selected_users">
//                   <ul>
//                     {teamLeader && (
//                       <li key={teamLeader} className="team-leader">
//                         <strong>👑 나 {users.find((u) => u.user_id === teamLeader)?.name} ({teamLeader})</strong>
//                       </li>
//                     )}
//                     {selectedUsers.map((userId) => {
//                       const user = users.find((u) => u.user_id === userId);
//                       return user ? (
//                         <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
//                           {user.name} ({user.user_id}) ✖
//                         </li>
//                       ) : null;
//                     })}
//                   </ul>
//                 </div>
//               </div>
//               {/* 초대 완료 후, 프로젝트 생성 API 호출 제거 */}
//               <div className="Invite_button_container">
//                 <button className="Invite_Invitebut" onClick={onClose}>
//                   초대 완료
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Invite;




import React, { useState, useEffect } from "react";
import "./Invite.css";

const Invite = ({ onClose }) => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamLeader, setTeamLeader] = useState(null);

  // 로그인된 사용자 정보 가져오기
  useEffect(() => {
    if (!currentUserId) {
      fetch("http://127.0.0.1:8000/api/users/name/", {
        method: "GET",
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((data) => {
          if (data.user_id) {
            setCurrentUserId(data.user_id);
            setTeamLeader(data.user_id); // 팀장은 로그인한 사용자
            setCurrentUserName(data.name);
          } else {
            console.error("로그인 정보 없음");
          }
        })
        .catch((err) => console.error("사용자 정보를 불러오지 못했습니다.", err));
    }
  }, [currentUserId]);

  // 사용자 목록 가져오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/users/userslist/")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("사용자 목록을 불러오지 못했습니다.", err));
  }, []);

  // 사용자를 클릭하면 초대 목록에 추가/제거 (팀장은 고정)
  const handleUserClick = (id) => {
    if (id === teamLeader) return;
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
    );
  };

  // 팀원 전체 정보를 세션에 저장 (팀장 + 선택된 사용자)
  useEffect(() => {
    if (currentUserId && users.length > 0) {
      const allTeamMemberIds = [teamLeader, ...selectedUsers];
      const selectedUserObjects = allTeamMemberIds.map((id) => {
        if (id === teamLeader) {
          return { user_id: teamLeader, name: currentUserName };
        }
        const user = users.find((u) => u.user_id === id);
        return user ? { user_id: user.user_id, name: user.name } : { user_id: id, name: "이름없음" };
      });
      sessionStorage.setItem("team_member", JSON.stringify(selectedUserObjects));
    }
  }, [currentUserId, teamLeader, selectedUsers, users, currentUserName]);

  // 검색어에 따른 사용자 필터링 (팀장은 제외)
  const filteredUsers = users
    .filter((user) => !selectedUsers.includes(user.user_id) && user.user_id !== teamLeader)
    .filter(
      (user) =>
        searchTerm === "" ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.user_id).includes(searchTerm)
    );

  return (
    <div className="Invite_overlay">
      <div className="Invite_modal">
        <button className="Invite_close_btn" onClick={onClose}>
          ✖
        </button>
        <div className="Invite_app">
          <div className="Invite_page">
            <div className="Invite_page2">
              <div className="Invite_top">
                <div className="Invite_header">
                  <h1>추가 가능</h1>
                  <h1>참여자</h1>
                </div>
              </div>
              <div className="Invite_lists">
                <div className="Invite_user_list">
                  <input
                    type="text"
                    className="Invite_search-bar"
                    placeholder="이름 또는 학번 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <ul>
                    {filteredUsers.map((user) => (
                      <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
                        {user.name} ({user.user_id})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="Invite_selected_users">
                  <ul>
                    {teamLeader && (
                      <li key={teamLeader} className="team-leader">
                        <strong>👑 나 {users.find((u) => u.user_id === teamLeader)?.name} ({teamLeader})</strong>
                      </li>
                    )}
                    {selectedUsers.map((userId) => {
                      const user = users.find((u) => u.user_id === userId);
                      return user ? (
                        <li key={user.user_id} onClick={() => handleUserClick(user.user_id)}>
                          {user.name} ({user.user_id}) ✖
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              </div>
              {/* 프로젝트 생성 API 호출 없음 – 단순히 초대 완료 */}
              <div className="Invite_button_container">
                <button className="Invite_Invitebut" onClick={onClose}>
                  초대 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invite;
