# AI 협업툴 🤖


**공과대학(특히 컴퓨터공학과) 저학년 학생들이   쉽게 팀을 꾸리고, 업무를 나누고, 프로젝트를 끝까지 가져갈 수 있도록 돕는  AI 기반 협업 웹 서비스입니다.**

---




## 1. 🗂️ 프로젝트 개요
### 1.1 소개
> **팀프로젝트 경험이 적은 학생도 부담 없이 사용할 수 있는 협업툴 이며,**
> **프로젝트 주제만 입력하면 AI가 업무를 자동 생성 & 할당, 팀 매칭, 업무 관리, **
> **회의록, 일정, 채팅, 파일, 보고서까지  한 플랫폼에서 통합 관리 하는 것을 목표이다.**<br> 

### 1.2 배경 
> * 공과대학에서는 팀 프로젝트 중심 교육이 활발하지만, 기존 협업툴은 기능이 너무 방대하고 복잡하여 저학년 학생에게는 진입 장벽이 높다.<br>
> * 소극적인 학생들은 오프라인에서 팀을 직접 구하는 것에 부담을 느끼고 팀 구성 단계에서부터 프로젝트 참여가 어려워지는 문제가 있다.


### 1.3 개발 목표
> * 팀 매칭 기능<br>
> * AI 기반 업무 생성 & 자동 할당<br>
> * 회의록 자동 작성 기능<br>
> * 프로젝트 가이드라인 및 자료 추천 기능<br>
> * 통합 협업 환경 제공<br>



### 1.4 기대효과
> - 팀 프로젝트 관리 효율성 향상
> - 사용자 편의성 증대
> - 팀워크와 소통 강화
> - 개인 맞춤형 프로젝트 경험

## 2. 💁🏻‍♂️ 팀원 소개
 
| (팀장) 정세준 | 김진성 | 황인우 |
| --- | --- | --- |
| <img width="163" height="166" alt="Image" src="https://github.com/user-attachments/assets/c51d27d7-d945-4fc8-b532-1c8453ffad06" /> | <img width="163" height="166" alt="Image" src="https://github.com/user-attachments/assets/63ab470b-508e-41b8-86db-9998ea15fb0e" /> | <img width="163" height="166" alt="Image" src="https://github.com/user-attachments/assets/2d624078-df82-469e-abf3-7398485608fa" /> |
| [Github](https://github.com/gazxxni) | [Github](https://github.com/gwoninduk) | [Github](https://github.com/inwoohub) |
| BE & FE | BE & FE | BE & FE |
| 업무 생성 및 배정,<br>파일 관리 | 회의록, 보고서,<br>로그, 팀매칭, 알림 | 세션 관리,<br>인증&인가,<br>프로필 수정,<br>채팅, 팀매칭, 캘린더 |


## 3.  ⚒️  기술 스택
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=Python&logoColor=white"> <img src="https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=whilte"> <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=JavaScript&logoColor=white"> <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=HTML5&logoColor=white">  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=CSS3&logoColor=white"> <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=React&logoColor=white"> <img src="https://img.shields.io/badge/Amazon%20S3-569A31?style=for-the-badge&logo=Amazon%20S3&logoColor=white"> <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=MySQL&logoColor=white">



## 4. 🌐 아키텍처 & 데이터베이스

### 4.1 전체 구조
<img width="1280" height="720" alt="Image" src="https://github.com/user-attachments/assets/1a4cbd28-5913-4c40-9812-cb680b587aac" />

### 4.2 데이터베이스
<img width="1250" height="1250" alt="Image" src="https://github.com/user-attachments/assets/7f3159a0-8ad2-480f-bca1-4b42b474d3bf" />

## 5. 📁 프로젝트 구조 

```text
├── backend
│   ├── chat
│   ├── comments
│   ├── config
│   ├── db_model
│   ├── file
│   ├── gptapi
│   ├── Log
│   ├── manage.py
│   ├── schedule
│   ├── tasks
│   └── users
├── frontend
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── public
│   ├── README.md
│   ├── src
│   └── tailwind.config.js
├── package-lock.json
├── package.json
├── README.md
```





## 6.  🖥️ 화면 구성

### 로그인 화면
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/f5d03a8c-ca79-45db-8e7b-0fda10e96b41" /><br>


### 메인 화면
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/fca88e63-479e-4f11-a833-1219df525e43" /><br>
> * 진행 중인 프로젝트 리스트 및 진척도 <br>
> * 내 일정, 내 업무, 알림, 채팅 진입 등 대시보드 역할 <br>

### 팀 매칭 화면
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/6817c7a3-cd63-445b-a8b2-350e3d01079f" /><br>
> * 과목별 팀 구하기 게시판<br>
> * 팀 모집 글 작성 및 참여 의사 표시<br>

### 프로젝트 생성
> <img width="2936" height="1486" alt="Image" src="https://github.com/user-attachments/assets/12f8bfab-882c-48dd-9ede-bf0db3a1fe4a" /><br>
> * 함께할 팀원 선택/제거<br>
> * 프로젝트 초기 팀 구성 화면<br>
> * 프로젝트 이름, 설명, 목표, 산출물, 사용 기술 스택, 기간 설정<br>
> * AI가 생성한 업무 가이드라인을 단계별로 보여주는 화면<br>
> * 프로젝트 전체 진행 흐름 미리 확인<br>

### 업무 목록
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/cfbfa0c6-e36f-4c3b-a9a8-ce4b9a6eeffb" /><br>
> * 업무명, 담당자, 상태, 시작일, 마감일 목록<br>
> * 필터/정렬을 통한 업무 관리<br>

### 업무 상세 화면
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/7297188f-112f-408f-942d-ff3d8b494329" /><br>
> * 업무 상태/담당자 변경<br>
> * 댓글 작성 및 파일 첨부<br>
> * 진행 상황 기록<br>

### 회의록 작성/목록 화면
> <img width="2936" height="743" alt="Image" src="https://github.com/user-attachments/assets/957391f9-385b-44fd-8a0f-21f743520f84" /><br>
> * 회의록 직접 작성 또는 음성→텍스트 변환 후 자동 회의록 생성<br>
> * 저장된 회의록 목록 확인 및 열람<br>

### 보고서 작성 화면
<img alt="Image" width="1468" height="743" src="https://private-user-images.githubusercontent.com/169428018/514995412-564e719c-b210-461e-b7be-c6012b73df29.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjMzNTgxMTEsIm5iZiI6MTc2MzM1NzgxMSwicGF0aCI6Ii8xNjk0MjgwMTgvNTE0OTk1NDEyLTU2NGU3MTljLWIyMTAtNDYxZS1iN2JlLWM2MDEyYjczZGYyOS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUxMTE3JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MTExN1QwNTM2NTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jZDBlMGFiOTNjMzFmZDM0ZWEzOWFhMDMxYzUzMzJiMDI5MmIwOThkMDRkMTVlNWI5OWRiZGVhNTA0OTViNWExJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.CxUoR-mWHMPcJr5g1KV29-x8CEShr5xEaQh7Em2f2Kc"><br>
> * 중간 / 최종 보고서 작성 기능<br>

### 채팅 화면
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/643bc31b-5658-4a64-bc1a-53470184831f" /><br>
> * 프로젝트별 그룹 채팅<br>
> * 팀원 간 실시간 커뮤니케이션<br>

### 캘린더 화면
> <img width="1468" height="743" alt="Image" src="https://github.com/user-attachments/assets/33cc2107-e1be-4025-93f0-10fcc561601e" /><br>
> * 업무/일정이 달력 위에 표시<br>
> * 마감일/회의 일정 한눈에 확인<br>

## 7. 📌 주요 기능
> 온라인 팀 매칭
> * 과목별 팀 구하기 게시판
> * 같은 과목 수강생만 접근 가능
> * 게시글 작성 및 참여 의사 표시(채팅 연계)

> 프로젝트 생성 & AI 업무 자동 생성/할당
> * 프로젝트 주제, 기술 스택, 팀원 정보 입력
> * AI가 업무 리스트 자동 생성
> * 팀원별 기술 스택/선호 역할 기반 자동 배정

> 업무 관리 
> * 상위/하위 업무 구조
> * 상태(진행 중, 완료 등), 시작일/마감일, 우선순위 관리
> * 담당자 지정 및 변경
> * 업무별 댓글, 파일, 활동 로그 연동

> 회의록 관리 & 자동 회의록 생성
> * 회의록 작성/수정/삭제
> * 음성/텍스트 기반 회의 내용을 AI로 요약
> * Word 형태로 다운로드(보고용)

> 실시간 채팅 & DM
> * 프로젝트 생성 시 프로젝트별 채팅방 자동 생성
> * 별도의 1:1 Direct Message 방도 지원

> 일정 관리 & Gantt 차트
> * 프로젝트/개인 일정 생성·수정·삭제
> * 일정 참석자 관리
> * Gantt 차트 기반 시각적 일정/진행률 관리

> 알림(Notification)
> * 댓글/파일 업로드/업무 변경 시 알림

> 파일 관리
> * 업무/회의록/댓글 등에 파일 첨부
> * 파일 업로드/다운로드/삭제
> * 버전/변경 내역 추적

> 프로필 관리
> * 기술 스택, 희망 역할, 관심 분야, 프로필 이미지 등
> * 팀 매칭 및 업무 자동 할당에 활용

> 활동 로그 & 보고서
> * 댓글 작성, 업무 변경, 파일 업로드 등 모든 주요 이벤트 기록

> 로그 검색/필터링
> * 프로젝트 활동 기반 자동 보고서 생성 및 Word 다운로드

















# Infloop
