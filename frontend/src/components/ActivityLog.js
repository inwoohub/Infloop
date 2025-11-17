import React from 'react';
import './ActivityLog.css';

function ActivityLog() {
  return (
    <section className="ActivityLog_container">
      <span className="activity-log-title">활동 기록</span>
      <div className="activity-log-content">
        <ul className="activity-log-list">
          <li>오늘 - 오해원 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>어제 - 권지용 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>그저께 - 오해원 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>오늘 - 오해원 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>어제 - 권지용 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>그저께 - 오해원 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>오늘 - 오해원 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>어제 - 권지용 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
          <li>그저께 - 오해원 댓글 등록 / 파이썬 기초 학습 / 18:20:34</li>
        </ul>
        <div style={{display:"flex",justifyContent:"center",marginTop:"1vh"}}>
          <button className="activity-log-btn" >전체 로그 보기</button>
        </div>
      </div>
    </section>
  );
}

export default ActivityLog;
