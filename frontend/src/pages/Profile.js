import React, { useState, useEffect, useRef } from "react";
import "./Profile.css"; // ✅ 스타일 파일
import { FaUserCircle, FaCamera } from "react-icons/fa"; // ✅ 아이콘 추가

const Profile = ({ onClose }) => {
  const [user, setUser] = useState(null); // ✅ 사용자 정보 저장
  const [loading, setLoading] = useState(true); // ✅ 로딩 상태
  const [skill, setSkill] = useState(""); // ✅ 기술 스택 상태 추가
  const [isEditing, setIsEditing] = useState(false); // ✅ 수정 모드 여부
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState(null); // ✅ 프로필 이미지 상태
  const fileInputRef = useRef(null); // ✅ 파일 input ref

  useEffect(() => {
    // ✅ 백엔드에서 사용자 정보 불러오기
    fetch("http://127.0.0.1:8000/api/users/profile/", {
      method: "GET",
      credentials: "include", // ✅ 세션 유지 (로그인한 사용자 정보 가져오기)
    })
      .then((res) => {
        if (!res.ok) throw new Error("사용자 정보를 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setSkill(data.skill || ""); // ✅ 기술 스택 상태 업데이트
        // ✅ 프로필 이미지 경로 처리 (상대 경로를 절대 경로로 변환)
        if (data.profile_image) {
          const imageUrl = data.profile_image.startsWith('http') 
            ? data.profile_image 
            : `http://127.0.0.1:8000${data.profile_image}`;
          setProfileImage(imageUrl);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("사용자 정보 가져오기 실패:", err);
        setLoading(false);
      });
  }, []);

  // ✅ 프로필 이미지 클릭 핸들러
  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  // ✅ 프로필 이미지 변경 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 이미지 미리보기
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);

    // 서버에 업로드
    const formData = new FormData();
    formData.append("profile_image", file);

    fetch("http://127.0.0.1:8000/api/users/upload-profile-image/", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("프로필 이미지 업로드 실패");
        return res.json();
      })
      .then((data) => {
        alert("프로필 이미지가 업데이트되었습니다!");
        // ✅ 서버에서 받은 이미지 URL을 절대 경로로 변환
        const imageUrl = data.profile_image.startsWith('http') 
          ? data.profile_image 
          : `http://127.0.0.1:8000${data.profile_image}`;
        setProfileImage(imageUrl);
      })
      .catch((err) => {
        console.error("프로필 이미지 업로드 실패:", err);
        alert("프로필 이미지 업로드에 실패했습니다.");
      });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ✅ 기술 스택 업데이트 함수
  const updateSkill = () => {
    if (!user) return;
    
    fetch("http://127.0.0.1:8000/api/users/update-skill/", {
      method: "PATCH",  // ✅ 수정 요청 (PATCH)
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✅ 세션 유지
      body: JSON.stringify({ skill }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("기술 스택 업데이트 실패");
        return res.json();
      })
      .then((data) => {
        alert("기술 스택이 업데이트되었습니다!"); // ✅ 사용자 알림
        setIsEditing(false); // ✅ 수정 모드 종료
      })
      .catch((err) => {
        console.error("기술 스택 업데이트 실패:", err);
        alert("기술 스택 업데이트에 실패했습니다.");
      });
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
  
    if (newPassword !== confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
  
    fetch("http://127.0.0.1:8000/api/users/change-password/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },  // ✅ JSON 데이터임을 명확히 설정
      credentials: "include",  // ✅ 세션 인증 유지
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert("오류: " + data.error);
        } else {
          alert("비밀번호가 성공적으로 변경되었습니다!");
          setShowPasswordForm(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      })
      .catch((err) => {
        console.error("비밀번호 변경 실패:", err);
        alert("비밀번호 변경에 실패했습니다.");
      });
  };

  return (
        <div className="Invite_overlay" onClick={onClose}>
            <div className="Invite_modal" onClick={(e) => e.stopPropagation()} >
                <button className="Invite_close_btn" onClick={onClose}>✖</button>
                <div className="Invite_app">
                    <div className="profile_page">
                        <div className="Invite_page2">
                            <div className="profile_header">
                                <h1>내 프로필</h1>
                            </div>
                            {loading ? (
                              <div style={{ textAlign: "center", padding: "20px" }}>
                                <p>로딩 중...</p>
                              </div>
                            ) : !user ? (
                              <div style={{ textAlign: "center", padding: "20px" }}>
                                <p>사용자 정보를 가져오지 못했습니다.</p>
                              </div>
                            ) : (
                            <div className="profile-container">
                                {/* ✅ 왼쪽 섹션 (아이콘 + 비밀번호 변경) */}
                                <div className="profile-left">
                                    <div className="profile-image-container" onClick={handleImageClick} style={{ cursor: "pointer", position: "relative", width: "150px", height: "150px" }}>
                                      {profileImage ? (
                                        <img 
                                          src={profileImage} 
                                          alt="프로필" 
                                          style={{ 
                                            width: "150px", 
                                            height: "150px", 
                                            borderRadius: "50%", 
                                            objectFit: "cover",
                                            display: "block"
                                          }}
                                          onError={(e) => {
                                            console.error("이미지 로드 실패:", profileImage);
                                            setProfileImage(null);
                                          }}
                                        />
                                      ) : (
                                        <FaUserCircle style={{ fontSize: "150px", width: "150px", height: "150px" }} />
                                      )}
                                      <div className="camera-overlay" style={{
                                        position: "absolute",
                                        bottom: "10px",
                                        right: "10px",
                                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                                        borderRadius: "50%",
                                        padding: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                      }}>
                                        <FaCamera style={{ color: "white", fontSize: "20px" }} />
                                      </div>
                                    </div>
                                    <input 
                                      type="file" 
                                      ref={fileInputRef} 
                                      onChange={handleImageChange} 
                                      accept="image/*"
                                      style={{ display: "none" }}
                                    />
                                    <p onClick={() => setShowPasswordForm(true)} style={{ cursor: "pointer", marginTop: "20px" }}>
                                      <strong>🔒 비밀번호 변경</strong>
                                    </p>
                                    {!showPasswordForm ? null : (
                                      <div className="password-form">
                                        <input
                                          type="password"
                                          placeholder="현재 비밀번호"
                                          value={currentPassword}
                                          onChange={(e) => setCurrentPassword(e.target.value)}
                                          className="password-input"
                                        />
                                        <input
                                          type="password"
                                          placeholder="새 비밀번호"
                                          value={newPassword}
                                          onChange={(e) => setNewPassword(e.target.value)}
                                          className="password-input"
                                        />
                                        <input
                                          type="password"
                                          placeholder="새 비밀번호 확인"
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          className="password-input"
                                        />
                                        <div className="password-btn-container">
                                          <button onClick={handlePasswordChange} className="save-button">저장</button>
                                          <button onClick={() => setShowPasswordForm(false)} className="cancel-button">취소</button>
                                        </div>
                                      </div>
                                    )}

                                    
                                </div>

                                {/* ✅ 오른쪽 섹션 (이름, 학번, 이메일, 기술 스택) */}
                                <div className="profile-right">
                                    <div className="profile-card">
                                        <div className="profile-info">
                                            <p style={{ marginBottom: "3vh" }}><strong>👤 이름 :</strong> {user.name}</p>
                                            <p style={{ marginBottom: "3vh" }}><strong>📌 학번 :</strong> {user.user_id}</p>
                                            <p style={{ marginBottom: "2vh" }}><strong>📧 이메일 :</strong> {user.email}</p>

                                            {/* ✅ 기술 스택 수정 가능하도록 변경 */}
                                            <div className="skill-container">
                                                <p><strong>🛠 기술 스택 :</strong> {isEditing ? null : skill || "기술스택을 입력해주세요. ex)python, java, 프론트엔드, 리더십 등"}</p>
                                                {isEditing ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            value={skill}
                                                            onChange={(e) => setSkill(e.target.value)}
                                                            className="skill-input"
                                                        />
                                                        <button onClick={updateSkill} className="save-button">저장</button>
                                                        <button onClick={() => setIsEditing(false)} className="cancel-button">취소</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setIsEditing(true)} className="edit-button">수정</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
  );
};

export default Profile;