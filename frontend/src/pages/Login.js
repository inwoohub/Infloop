/* eslint-disable */
// 노란 글씨 워닝 안보기
import React, { useState } from 'react'; // useState import
import axios from 'axios'; // axios import
import { useNavigate } from 'react-router-dom'; // useNavigate import
import './Login.css';

function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // 페이지 이동을 위한 useNavigate 사용

  // 로그인 관리 API
  const handleSubmit = async (e) => {
    e.preventDefault(); // 페이지 리로드 방지

    const payload = {
      user_id: userId,
      password: password,
    };

    console.log("Payload being sent to the server:", payload); // 전송 데이터 출력

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/login/',
      payload,
      {
        withCredentials: true   
      }); //세션 쿠키 포함
      console.log("Server Response:", response.data); // 서버 응답 출력
      alert(response.data.message); // 로그인 성공 메시지 팝업

      // 로그인 성공 시 메인 페이지로 이동
      navigate('/main');
    } catch (error) {
      if (error.response) {
        console.error("Error Response from server:", error.response.data); // 에러 응답 출력
        alert(error.response.data.message); // 에러 메시지 팝업
      } else {
        console.error("Error:", error.message); // 기타 에러 출력
        alert("An error occurred"); // 네트워크 또는 기타 오류
      }
    }

    
  };

  return (
    <div className="App">
      <div className="Login_page">
        <div className="Login_page1">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '5px',
            }}
          ></div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="Login_container">
              <img className="Login_logoimage" alt="teamlogo" src="/testlogo.png"  style={{ "--dur": "2.8s" }} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="Login_input">
                <input
                  type="text"
                  className="Login_userId"
                  id="userId"
                  placeholder="아이디"
                  autoFocus
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
                <input
                  type="password"
                  className="Login_password"
                  id="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                ></input>
                <button id="Login_loginBut">로그인</button>
              </div>
            </form>
            <div
              className="Login_link"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                display: 'flex',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  marginTop: '60px',
                }}
              >
                회사명: (주)무한루프 | 대표: 정세준 | 대표 번호: 010-1234-1234 | 메일 문의:
                jeongsejan@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; // export default 추가
