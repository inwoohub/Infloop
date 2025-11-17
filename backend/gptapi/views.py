import os, tempfile
import openai
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv
from db_model.models import Project, Task, TaskManager, User, ProjectMember, Message
from django.db import connection

# ChatCompletion 호출을 위한 래퍼 클래스
class ChatWrapper:
    def __init__(self, chat_completion):
        self.chat_completion = chat_completion
    def create(self, **kwargs):
        return self.chat_completion.create(**kwargs)

# 래퍼 클래스를 추가하여 openai.OpenAI 인터페이스를 구현합니다.
if not hasattr(openai, "OpenAI"):
    class OpenAIWrapper:
        def __init__(self, api_key):
            openai.api_key = api_key
            # chat 속성에 ChatWrapper를 할당하고, completions도 동일하게 설정합니다.
            self.chat = ChatWrapper(openai.ChatCompletion)
            self.chat.completions = self.chat
        def __getattr__(self, name):
            return getattr(openai, name)
    openai.OpenAI = OpenAIWrapper

# ✅ 환경 변수 로드
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

client = openai.OpenAI(api_key=api_key)


@csrf_exempt
def transcribe_audio(request):
    if request.method != "POST" or "audio" not in request.FILES:
        return JsonResponse({"error": "audio 파일을 multipart/form-data로 POST 해주세요."}, status=400)

    uploaded = request.FILES["audio"]
    # 임시 파일 경로가 있으면 재사용, 없으면 생성
    if hasattr(uploaded, "temporary_file_path"):
        audio_path = uploaded.temporary_file_path()
    else:
        suffix = os.path.splitext(uploaded.name)[1]
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        for chunk in uploaded.chunks():
            tmp.write(chunk)
        tmp.flush()
        audio_path = tmp.name

    try:
        with open(audio_path, "rb") as af:
            # ↓ 여기서 client.audio.transcriptions.create 사용!
            resp = client.audio.transcriptions.create(
                model="whisper-1",
                file=af,
                response_format="text",
                language="ko"
            )
        # response_format="text" 이면 바로 문자열 반환, 
        # 기본 JSON 포맷을 쓰면 resp["text"] 로 텍스트에 접근 가능합니다 :contentReference[oaicite:0]{index=0}
        transcript = resp if isinstance(resp, str) else resp.get("text", "")
        return JsonResponse({"transcript": transcript})
    except Exception as e:
        print("❌ transcribe_audio error:", e)
        return JsonResponse({"error": str(e)}, status=500)

# @csrf_exempt
# def summarize_meeting(request):
#     """ GPT를 사용하여 회의 내용을 표 형식으로 정리 (HTML) """
#     if request.method == "POST":
#         try:
#             data = json.loads(request.body)
#             meeting_notes = data.get("notes", "")

#             print("✅ 받은 회의 내용:", meeting_notes)

#             if not meeting_notes:
#                 return JsonResponse({"error": "회의록 내용이 없습니다."}, status=400)

#             if not api_key:
#                 return JsonResponse({"error": "OpenAI API 키가 설정되지 않았습니다."}, status=500)

#             print("✅ OpenAI API 키 확인 완료")

#             # ✅ OpenAI API 요청 (HTML 테이블로 요청)
#             prompt = f"""
#             이 프로젝트는 컴퓨터공학과 대학생 팀이 수행하는 협업 프로젝트입니다.

#             1. 회의 대화 내용을 읽고, 아래 예시 회의록 형식에 맞춰 회의록을 작성할 것.
            
#             2. 참석자 이름은 "참석자 1", "참석자 2" 등으로 고정.
            
#             3. 회의 내용이 아닌 경우, 형식만 제공할 것.
            
#             4. 일부만 제공되지 않은 경우 [예시]를 제공한 후, [예시]라고 표시할 것.
            
#             5. 안건은 3개가 넘을 수 있음.
            
#             6. 참석자 이름은 가나다 순으로 적을 것.
            
#             7. html 문법 사용 필수. (h2, h3, p, ul, li 태그 등) 불필요한 줄바꿈 금지.
            

#             <h1>회의 기본 정보</h1>
#             <p><strong>회의명:</strong> [회의 제목]</p>
#             <p><strong>일시:</strong> [회의 날짜와 시간]</p>
#             <p><strong>장소:</strong> [회의 장소 또는 온라인 플랫폼]</p>
#             <p><strong>참석자:</strong> [참석자 명단]</p>
#             <p><strong>결석자:</strong> [결석자 명단]</p>

#             <br>

#             <h2>회의 목적 및 안건</h2>
#             <p><strong>목적:</strong> [회의 목적]</p>
#             <p>&bull; 안건 1</p>
#             <p>&bull; 안건 2</p>
#             <p>&bull; 안건 3</p>

#             <br>

#             <h2>회의 진행 내용</h2>
#             <article>
#                 <h3>안건 1</h3>
#                 <p><strong>논의 내용:</strong> [논의 내용]</p>
#                 <p><strong>결정 사항:</strong> [결정 사항]</p>
#             </article>
#             <article>
#                 <h3>안건 2</h3>
#                 <p><strong>논의 내용:</strong> [논의 내용]</p>
#                 <p><strong>결정 사항:</strong> [결정 사항]</p>
#             </article>
#             <article>
#                 <h3>안건 3</h3>
#                 <p><strong>논의 내용:</strong> [논의 내용]</p>
#                 <p><strong>결정 사항:</strong> [결정 사항]</p>
#             </article>

#             <br>

#             <h2>업무 할당</h2>
#             <p>&bull; <strong>[담당자]:</strong> [기한]</p>

#             <br>

#             <h2>기타 참고 사항</h2>
#             <p>[기타 추가 사항]</p>

#             ## 회의록 내용:
#             {meeting_notes}

#             ## 출력 형식 (반드시 JSON)
#             {{
#             "유효성": {{
#                 "회의록 형식": true|false
#                 "회의록 내용": true|false
#             }},
#             "summary_html": "<h1>…</h1>…"
#             }}

#             📌 유효성 검사
#             - "회의록 형식"은 최소한 질문·답변 형태가 담겨 있는지 확인합니다.
#             - 회의록 내용이 불명확하거나, 컴퓨터공학과 대학생 팀 프로젝트의 범위로 부적절한 경우 전체 프로젝트를 무효로 판단해야 합니다.
#             - false 면 user 가 수정할 수 있도록 유효성 결과만 돌려주세요.
#             """
            
#             response = client.chat.completions.create(
#                 model="gpt-4-turbo",
#                 messages=[
#                     {"role": "system", "content": "너는 회의록 작성 전문가야."},
#                     {"role": "user", "content": prompt}
#                 ],
#                 temperature=0.3,
#                 max_tokens=4000
#             )

#             raw = response.choices[0].message.content
#             print("✅ GPT 응답 (원본):", raw)

#             # 코드블록 제거
#             if raw.startswith("```"):
#                 lines = raw.splitlines()
#                 if lines and lines[0].startswith("```"):
#                     lines = lines[1:]
#                 if lines and lines[-1].startswith("```"):
#                     lines = lines[:-1]
#                 raw = "\n".join(lines).strip()

#             # JSON 파싱
#             try:
#                 result = json.loads(raw)
#             except json.JSONDecodeError:
#                 return JsonResponse({
#                     "error": "GPT가 올바른 JSON을 반환하지 않았습니다.",
#                     "raw": raw
#                 }, status=500)

#             # 유효성 검사
#             validity = result.get("유효성")
#             if not isinstance(validity, dict):
#                 return JsonResponse({"error": "유효성 결과가 없습니다.", "raw": raw}, status=500)
#             if any(v is False for v in validity.values()):
#                 return JsonResponse({
#                     "error": "유효성 검사 실패",
#                     "invalid": validity
#                 }, status=400)

#             # 검증 통과 시 HTML 내용만 반환
#             return JsonResponse({"summary_html": result.get("summary_html", "")}, status=200)

#         except openai.OpenAIError as e:
#             print("❌ OpenAI API 오류:", str(e))
#             return JsonResponse({"error": f"OpenAI API 오류: {str(e)}"}, status=500)

#         except Exception as e:
#             print("❌ 서버 내부 오류:", str(e))
#             return JsonResponse({"error": f"서버 오류: {str(e)}"}, status=500)


@csrf_exempt
def summarize_meeting(request):
    """ GPT를 사용하여 회의 내용을 표 형식으로 정리 (HTML) """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            meeting_notes = data.get("notes", "")

            print("✅ 받은 회의 내용:", meeting_notes)

            if not meeting_notes:
                return JsonResponse({"error": "회의록 내용이 없습니다."}, status=400)

            if not api_key:
                return JsonResponse({"error": "OpenAI API 키가 설정되지 않았습니다."}, status=500)

            print("✅ OpenAI API 키 확인 완료")

            # 회의록발표
            prompt = f"""
            이 프로젝트는 컴퓨터공학과 대학생 팀이 수행하는 협업 프로젝트입니다.

            1. 회의 대화 내용을 읽고, 아래 예시 회의록 형식에 맞춰 회의록을 작성할 것.
            
            2. 참석자 이름은 "참석자 1", "참석자 2" 등으로 고정.
            
            3. 회의 내용이 아닌 경우, 형식만 제공할 것.
            
            4. 일부만 제공되지 않은 경우 [예시]를 제공한 후, [예시]라고 표시할 것.
            
            5. 안건은 3개가 넘을 수 있음.
            
            6. 참석자 이름은 가나다 순으로 적을 것.
            
            7. html 문법 사용 필수. (h2, h3, p, ul, li 태그 등) 불필요한 줄바꿈 금지.
            

            <h1>회의 기본 정보</h1>
            <p><strong>회의명:</strong> [회의 제목]</p>
            <p><strong>일시:</strong> [회의 날짜와 시간]</p>
            <p><strong>장소:</strong> [회의 장소 또는 온라인 플랫폼]</p>
            <p><strong>참석자:</strong> [참석자 명단]</p>
            <p><strong>결석자:</strong> [결석자 명단]</p>

            <br>

            <h2>회의 목적 및 안건</h2>
            <p><strong>목적:</strong> [회의 목적]</p>
            <li> 안건 1<li>
            <li> 안건 2<li>
            <li> 안건 3<li>

            <br>

            <h2>회의 진행 내용</h2>
            <article>
                <h3>안건 1</h3>
                <p><strong>논의 내용:</strong> [논의 내용]</p>
                <p><strong>결정 사항:</strong> [결정 사항]</p>
            </article>
            <article>
                <h3>안건 2</h3>
                <p><strong>논의 내용:</strong> [논의 내용]</p>
                <p><strong>결정 사항:</strong> [결정 사항]</p>
            </article>
            <article>
                <h3>안건 3</h3>
                <p><strong>논의 내용:</strong> [논의 내용]</p>
                <p><strong>결정 사항:</strong> [결정 사항]</p>
            </article>

            <br>

            <h2>업무 할당</h2>
            <p>&bull; <strong>[담당자]:</strong> [기한]</p>

            <br>

            <h2>기타 참고 사항</h2>
            <p>[기타 추가 사항]</p>

            ## 회의록 내용:
            {meeting_notes}

            ## 출력 형식 (반드시 JSON)
            {{
            "summary_html": "<h1>…</h1>…"
            }}
            """
            
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": "너는 회의록 작성 전문가야."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=4000
            )

            raw = response.choices[0].message.content
            print("✅ GPT 응답 (원본):", raw)

            # 코드블록 제거
            if raw.startswith("```"):
                lines = raw.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw = "\n".join(lines).strip()

            # JSON 파싱
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                return JsonResponse({
                    "error": "GPT가 올바른 JSON을 반환하지 않았습니다.",
                    "raw": raw
                }, status=500)

            # 검증 통과 시 HTML 내용만 반환
            return JsonResponse({"summary_html": result.get("summary_html", "")}, status=200)

        except openai.OpenAIError as e:
            print("❌ OpenAI API 오류:", str(e))
            return JsonResponse({"error": f"OpenAI API 오류: {str(e)}"}, status=500)

        except Exception as e:
            print("❌ 서버 내부 오류:", str(e))
            return JsonResponse({"error": f"서버 오류: {str(e)}"}, status=500)



@csrf_exempt
def summarize_report(request):
    """
    GPT를 사용하여 보고서 내용을 해당 형식으로 정리.
    추가로, 해당 프로젝트에 할당된 업무(Task) 정보와 각 업무에 해당하는 댓글(Comment) 정보를 포함하여,
    어떤 사람이 뭘 했는지 보고서에 포함할 수 있도록 GPT 프롬프트를 구성.
    
    요청 JSON에는 "notes"와 "project_id"가 포함되어야 함.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            project_id = data.get("project_id")
            today = data.get("today")
            
            print("✅ 프로젝트 ID:", project_id)

            if not project_id:
                return JsonResponse({"error": "프로젝트 ID가 필요합니다."}, status=400)
            if not api_key:
                return JsonResponse({"error": "OpenAI API 키가 설정되지 않았습니다."}, status=500)
            
            # 프로젝트 이름을 DB에서 가져오기
            db_project_name = ""
            with connection.cursor() as cursor_proj:
                sql_project = "SELECT project_name FROM Project WHERE project_id = %s"
                cursor_proj.execute(sql_project, (project_id,))
                project_row = cursor_proj.fetchone()
            if project_row:
                db_project_name = project_row[0]


            # 프로젝트에 할당된 업무 정보를 가져오기 (담당자 이름 포함)
            task_info_str = ""
            with connection.cursor() as cursor:
                sql_tasks = """
                    SELECT tm.user_id, u.name, t.task_id, t.task_name, t.description, t.status
                    FROM Task t
                    JOIN TaskManager tm ON t.task_id = tm.task_id
                    JOIN User u ON tm.user_id = u.user_id
                    WHERE tm.project_id = %s
                """
                cursor.execute(sql_tasks, (project_id,))
                task_rows = cursor.fetchall()
            
            if task_rows:
                task_info_str += "=== 업무 정보 ===\n"
                for row in task_rows:
                    # row[0]: 담당자 user_id, row[1]: 담당자 이름, row[2]: task_id, row[3]: task_name, row[4]: description
                    user_id, user_name, task_id, task_name, description, status = row
                    task_info_str += f"업무 ID: {task_id} | 업무명: {task_name} | 담당자: {user_name} (ID: {user_id}) | 상태: {status}\n"
                    task_info_str += f"설명: {description}\n"
                    # 각 업무에 해당하는 댓글(Comment) 정보 조회
                    with connection.cursor() as cursor2:
                        sql_comments = """
                            SELECT comment_id, content, created_date
                            FROM Comment
                            WHERE task_id = %s
                        """
                        cursor2.execute(sql_comments, (task_id,))
                        comments = cursor2.fetchall()
                    if comments:
                        task_info_str += "  >> 댓글:\n"
                        for c in comments:
                            comment_id, comment_content, created_date = c
                            task_info_str += f"     댓글 ID: {comment_id} | {comment_content} (작성일: {created_date})\n"
                    else:
                        task_info_str += "  >> 댓글: 없음\n"
                    task_info_str += "\n"
            else:
                task_info_str = "할당된 업무 정보가 없습니다.\n"
            
            
            #중간발표
            prompt = f"""
            이 프로젝트는 컴퓨터공학과 대학생 팀이 수행하는 협업 프로젝트입니다.

            # 보고서 작성 규칙

            0. 해당 보고서는 컴퓨터공학과 학생 프로젝트의 중간 보고서입니다.

            1. 제목은 프로젝트 이름("{db_project_name}")을 참고하여 작성하되, 의미 없는 단어는 제거하고 핵심만 표현할 것.
            (예: "협업툴 만들기" → "팀 프로젝트 관리를 위한 협업툴")

            2. 과목명, 교수명, 팀명, 팀원 정보(이름, 학번)는 반드시 주어진 실제 정보를 사용할 것.
            (절대 예시에 있는 그대로 사용하지 말 것. 특히 이름, 학번은 반드시 주어진 정보를 사용할 것.)

            3. 팀 전체 활동을 기준으로 작성할 것. (개인별 활동 기록은 금지)

            4. 업무(Task), 상태(Status: 0=요청, 1=진행, 2=피드백, 3=완료), 댓글(Feedback)을 분석하여 프로젝트의 진행 과정과 결과를 구체적으로 서술할 것.

            5. 각 장(1,2,3,4) 아래에는 반드시 두 단계 이상의 소제목(2-1, 2-2, 2-3 등)을 둘 것.
            소제목 없이 긴 문단만 이어지지 않게 할 것.

            6. 중요한 다이어그램, ERD, 시스템 흐름 등은 [사진 삽입 예정: 설명] 문구로 반드시 삽입할 것.
            (예시: [사진 삽입 예정: ERD 다이어그램])

            7. 보고서 문체는 "~하였다", "~되었다"의 완료형 서술어를 사용할 것.
            (절대 존댓말 금지. 예: "개발하였다.", "설계되었다.")

            8. 단순히 결과만 나열하지 말고
            - 배경 → 과정 → 결과 → 문제점 → 개선 방향
            순서로 구체적으로 서술할 것.

            9. 실제 프로젝트 상황을 바탕으로 한 구체적 수치, 활동 기록, 실습 과정 등을 최대한 포함할 것.
            (예: "테스트 결과 95% 성공률을 기록하였다." / "ERD에는 6개 엔티티와 11개 관계가 포함되었다.")

            10. 중간 보고서 글자 수는 최소 2000자 이상, 7000자 이내가 되도록 할 것(html 태그, 사진 문구 제외).
            억지로 반복하거나 의미 없는 문장을 추가하지 말 것.

            11. html 문법 사용 필수 (h2, h3, p, ul, li 태그 등).

            12. 최종 목표는 실제로 교수님께 제출 가능한 완성도를 갖춘 보고서를 작성하는 것.

            # 주의사항
            - 아래 제공된 기존 보고서 내용 예시는 참고만 하며, 그 문장을 복사하거나 요약해서 사용하지 말 것.
            - 소제목 개수는 반드시 그대로 사용하거나 늘릴 것.
            - 직접 프로젝트 업무 데이터와 상태를 분석하여 독립적으로 작성할 것.
            - \"누가\" 했는지 중요한 것이 아님. 어떤 것을 했는지가 중요한 것. 반드시 모든 업무명을 보고 작성할 것.
            - 기간은 적지 말 것. 만약 완료하지 못한 것들에 대해 이야기하려는 경우, 추후 추가할 예정이라고 적을 것.

            필수 참고 정보:
            반드시 이 정보를 가지고 작성할 것.
            {task_info_str}

            
            <!DOCTYPE html>
            <html lang="ko">
            <head>
            <meta charset="UTF-8" />
            <title>프로젝트 중간 보고서</title>
            </head>
            <body>

            <h1>{db_project_name}</h1>

            <h2>기본 정보</h2>
            <p><strong>과목명:</strong> 소프트웨어공학</p>
            <p><strong>팀명:</strong> 활빈당</p>
            <p><strong>팀원:</strong> 14432131 홍길동(팀장), 14412154 홍인형</p>
            <p><strong>교수:</strong> 허균</p>
            <p><strong>제출일:</strong> {today}</p>

            <br>

            <h2>1. 서론</h2>

            <h3>가. 프로젝트 개요</h3>
            <p>
            최근 다양한 산업군에서 키오스크 시스템의 활용도가 급격히 높아지고 있다. 특히 카페와 같은 소규모 매장에서도 인건비 절감, 주문 실수 감소, 고객 편의성 향상이라는 이점을 위해 키오스크 도입이 빠르게 확산되고 있다.  
            <br><br>
            본 프로젝트는 중소형 카페 매장을 대상으로, 설치가 간편하고 사용이 직관적인 키오스크 소프트웨어를 개발하는 것을 목표로 한다. 이를 통해 대면 주문 과정의 비효율성을 줄이고, 고객이 직접 주문을 진행함으로써 매장 운영의 효율성을 높이고자 한다.  
            </p>

            <h3>나. 개발 환경 및 기술 스택</h3>
            <p>
            개발은 Python 3.10 버전을 사용하여 진행하였으며, 사용자 인터페이스는 Tkinter를 이용하여 구축하였다. 데이터베이스는 내장형 경량 DBMS인 SQLite3를 사용하여, 추가적인 서버 설치 없이 간편하게 데이터 관리를 가능하게 하였다.  
            <br><br>
            프로젝트 관리 및 버전 관리는 GitHub를 통해 진행하였고, 팀원 간의 협업을 위해 Notion과 Trello를 활용하여 업무 분담과 일정 관리를 체계적으로 수행하였다.  
            <br><br>
            UX/UI 설계 초기 단계에서는 Figma를 활용하여 주요 화면 흐름을 시각화하고, 사용자 입장에서의 편의성을 사전에 검토하였다.
            </p>

            <br>

            <h2>2. 프로젝트 설계 및 구현</h2>

            <h3>가. 기능 요구사항 정의</h3>
            <ul>
                <li> 메뉴 선택 및 주문 기능: 다양한 커피 및 디저트 메뉴를 키오스크 화면에서 선택하여 주문할 수 있도록 한다.<li>
                <li> 결제 방식 선택 기능: 카드 결제 또는 QR 코드 결제 방식을 선택하여 주문을 완료할 수 있도록 한다.<li>
                <li> 주문 내역 확인 및 수정 기능: 장바구니에 담긴 주문 항목을 확인하고, 필요시 삭제할 수 있도록 한다.<li>
                <li> 관리자 모드 기능: 관리자 전용 로그인 기능을 통해 메뉴 관리 및 판매 통계 조회 기능을 제공한다.<li>
            </ul>

            <h3>나. 시스템 구조 및 흐름</h3>
            <p>
            본 시스템은 크게 사용자 인터페이스와 데이터베이스 관리 모듈로 구성된다. 사용자는 Tkinter 기반 GUI를 통해 주문을 진행하며, 주문 정보는 세션 내에 임시 저장된 뒤 결제 완료 시 SQLite 데이터베이스에 영구 저장된다.  
            <br><br>
            관리자는 별도의 로그인 절차를 통해 관리자 페이지에 접속할 수 있으며, 메뉴 항목을 추가하거나 수정할 수 있고, 판매 기록을 날짜별로 조회할 수 있다.
            </p>

            <p>[사진: 시스템 전체 흐름도 (사용자 주문 흐름 + 관리자 흐름)]</p>

            <h3>다. 주요 코드 설명 및 화면 예시</h3>

            <h4>1) 메뉴 선택 기능 구현</h4>
            <p>
            Tkinter의 버튼 위젯을 이용하여 메뉴 항목들을 동적으로 생성하였다. 각 버튼은 메뉴명과 가격 정보를 포함하고 있으며, 사용자가 버튼을 클릭하면 주문 리스트에 해당 항목이 추가된다.  
            <br><br>
            메뉴를 추가할 때는 add_item이라는 함수를 호출하여 리스트박스에 주문 정보를 표시하고, 총 주문 금액을 업데이트하는 방식으로 구현하였다.
            </p>
            <p>[사진: 메뉴 선택 화면 캡처]</p>

            <h4>2) 주문 내역 확인 및 수정 기능 구현</h4>
            <p>
            장바구니에 담긴 주문 내역은 리스트박스를 통해 사용자에게 시각적으로 제공된다. 사용자는 리스트 항목을 클릭하여 선택할 수 있으며, 삭제 버튼을 통해 원하는 항목을 제거할 수 있다.  
            <br><br>
            remove_item 함수에서는 선택된 항목이 없을 경우를 대비하여 예외 처리를 추가하였고, 항목이 삭제될 때마다 총 주문 금액도 자동으로 갱신되도록 하였다.
            </p>
            <p>[사진: 장바구니 관리 화면 캡처]</p>

            <h4>3) 결제 기능 구현</h4>
            <p>
            [위 형식과 동일]
            </p>
            <p>[사진: 결제 방식 선택 화면 캡처]</p>

            <h4>4) 관리자 모드 기능 구현</h4>
            <p>
            [위 형식과 동일]
            <p>[사진: 관리자 로그인 및 메뉴 관리 화면 캡처]</p>

            <br>

            <h2>3. 결과 및 평가</h2>

            <h3>가. 기능 구현 결과</h3>
            <p>
            모든 필수 기능이 정상적으로 구현되었으며, 단위 테스트를 통해 메뉴 추가, 주문 내역 수정, 결제 완료, 관리자 기능 접근 등 주요 흐름에 대한 정상 동작을 확인하였다.  
            <br><br>
            특히 메뉴 추가와 삭제, 결제 흐름은 예상한 대로 자연스럽게 이어졌으며, 예외 처리도 안정적으로 수행되었다. 또한 관리자가 실시간으로 메뉴를 수정하고 결과를 즉시 사용자 화면에 반영할 수 있는 기능도 정상적으로 작동하였다.
            </p>

            <h3>나. 프로젝트 성과 및 개선점</h3>
            <p>
            <strong>성과</strong>  
            - 키오스크 소프트웨어의 핵심 기능을 충실히 구현하여, 실제 매장에서 사용 가능한 수준의 프로토타입을 완성하였다.  
            - SQLite를 통한 주문 데이터 관리와 간단한 통계 조회 기능까지 포함하여 시스템의 기본적인 운영이 가능하도록 하였다.  
            - GitHub를 통한 버전 관리 및 Trello를 이용한 협업 관리 경험을 통해, 팀 프로젝트 진행 능력을 향상시켰다.
            <br><br>
            <strong>개선점</strong>  
            - 현재 Tkinter 기본 위젯만을 이용하여 UI를 구성하여, 전체적인 시각적 완성도가 다소 부족하다. 향후 customtkinter나 PyQt를 이용한 디자인 고도화가 필요하다.  
            - 실제 결제 모듈 연동이 구현되어 있지 않아, Stripe, KakaoPay 등의 API 연동을 통해 완성도를 높여야 한다.  
            - SQLite를 사용한 데이터베이스 구조는 소규모 매장에는 적합하지만, 대규모 매장을 고려한다면 MySQL 또는 PostgreSQL로 확장하는 것이 필요할 것으로 보인다.
            </p>
            <p>[사진: 최종 테스트 완료 화면 캡처]</p>

            <br>

            <h2>4. 결론</h2>

            <p>
            본 프로젝트를 통해 GUI 프로그래밍, 데이터베이스 설계 및 연동, 간단한 사용자 인증 기능 구현 등 소프트웨어 개발의 기본적인 과정을 경험할 수 있었다.  
            <br><br>
            특히 사용자 중심으로 화면을 구성하고, 예외 상황에 대한 대응 로직을 고민하면서 실무에 가까운 개발 사고방식을 익힐 수 있었다.  
            <br><br>
            향후에는 보다 정교한 디자인 구성, 실제 결제 API 연동, 클라우드 기반 데이터 관리 등 고도화된 기능을 추가하여, 완성도 높은 상용 수준의 키오스크 소프트웨어로 발전시키고자 한다.
            </p>
            
            </body>
            </html>


            """
            print("✅ GPT 프롬프트:", prompt)
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "너는 공과대학 보고서 작성 전문가야."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=12000
            )
            summary_html = response.choices[0].message.content
            print("✅ GPT 응답 (보고서 템플릿):", summary_html)

            if summary_html.startswith("```"):
                lines = summary_html.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                summary_html = "\n".join(lines).strip()


            return JsonResponse({"summary": summary_html}, status=200)
        
        except openai.OpenAIError as e:
            print("❌ OpenAI API 오류:", str(e))
            return JsonResponse({"error": f"OpenAI API 오류: {str(e)}"}, status=500)
        except Exception as e:
            print("❌ 서버 내부 오류:", str(e))
            return JsonResponse({"error": f"서버 오류: {str(e)}"}, status=500)
    else:
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)


@csrf_exempt
def summarize_finalreport(request):
    """
    GPT를 사용하여 보고서 내용을 해당 형식으로 정리.
    추가로, 해당 프로젝트에 할당된 업무(Task) 정보와 각 업무에 해당하는 댓글(Comment) 정보를 포함하여,
    어떤 사람이 뭘 했는지 보고서에 포함할 수 있도록 GPT 프롬프트를 구성.
    
    요청 JSON에는 "notes"와 "project_id"가 포함되어야 함.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            project_id = data.get("project_id")
            today = data.get("today")
            
            print("✅ 프로젝트 ID:", project_id)

            if not project_id:
                return JsonResponse({"error": "프로젝트 ID가 필요합니다."}, status=400)
            if not api_key:
                return JsonResponse({"error": "OpenAI API 키가 설정되지 않았습니다."}, status=500)
            
            # 프로젝트 이름을 DB에서 가져오기
            db_project_name = ""
            with connection.cursor() as cursor_proj:
                sql_project = "SELECT project_name FROM Project WHERE project_id = %s"
                cursor_proj.execute(sql_project, (project_id,))
                project_row = cursor_proj.fetchone()
            if project_row:
                db_project_name = project_row[0]


            # 프로젝트에 할당된 업무 정보를 가져오기 (담당자 이름 포함)
            task_info_str = ""
            with connection.cursor() as cursor:
                sql_tasks = """
                    SELECT tm.user_id, u.name, t.task_id, t.task_name, t.description, t.status
                    FROM Task t
                    JOIN TaskManager tm ON t.task_id = tm.task_id
                    JOIN User u ON tm.user_id = u.user_id
                    WHERE tm.project_id = %s
                """
                cursor.execute(sql_tasks, (project_id,))
                task_rows = cursor.fetchall()
            
            if task_rows:
                task_info_str += "=== 업무 정보 ===\n"
                for row in task_rows:
                    # row[0]: 담당자 user_id, row[1]: 담당자 이름, row[2]: task_id, row[3]: task_name, row[4]: description
                    user_id, user_name, task_id, task_name, description, status = row
                    task_info_str += f"업무 ID: {task_id} | 업무명: {task_name} | 담당자: {user_name} (ID: {user_id}) | 상태: {status}\n"
                    task_info_str += f"설명: {description}\n"
                    # 각 업무에 해당하는 댓글(Comment) 정보 조회
                    with connection.cursor() as cursor2:
                        sql_comments = """
                            SELECT comment_id, content, created_date
                            FROM Comment
                            WHERE task_id = %s
                        """
                        cursor2.execute(sql_comments, (task_id,))
                        comments = cursor2.fetchall()
                    if comments:
                        task_info_str += "  >> 댓글:\n"
                        for c in comments:
                            comment_id, comment_content, created_date = c
                            task_info_str += f"     댓글 ID: {comment_id} | {comment_content} (작성일: {created_date})\n"
                    else:
                        task_info_str += "  >> 댓글: 없음\n"
                    task_info_str += "\n"
            else:
                task_info_str = "할당된 업무 정보가 없습니다.\n"
            

            #최종발표
            
            # GPT 프롬프트 생성 (추가된 업무/댓글 정보 포함)
            prompt = f"""
            이 프로젝트는 컴퓨터공학과 대학생 팀이 수행하는 협업 프로젝트입니다.

            # 보고서 작성 규칙

            0. 해당 보고서는 컴퓨터공학과 학생 프로젝트의 최종 보고서입니다. 

            1. 제목은 프로젝트 이름("{db_project_name}")을 참고하여 작성하되, 의미 없는 단어는 제거하고 핵심만 표현할 것.
            (예: "협업툴 만들기" → "팀 프로젝트 관리를 위한 협업툴")

            2. 과목명, 교수명, 팀명, 팀원 정보(이름, 학번)는 반드시 주어진 실제 정보를 사용할 것.
            (절대 예시에 있는 그대로 사용하지 말 것. 특히 이름, 학번은 반드시 주어진 정보를 사용할 것.)

            3. 팀 전체 활동을 기준으로 작성할 것. (개인별 활동 기록은 금지)

            4. 업무(Task), 상태(Status: 0=요청, 1=진행, 2=피드백, 3=완료), 댓글(Feedback)을 분석하여 프로젝트의 진행 과정과 결과를 구체적으로 서술할 것.

            5. 각 장(1,2,3,4) 아래에는 반드시 두 단계 이상의 소제목(2-1, 2-2, 2-3 등)을 둘 것.
            소제목 없이 긴 문단만 이어지지 않게 할 것.

            6. 중요한 다이어그램, ERD, 시스템 흐름 등은 [사진 삽입 예정: 설명] 문구로 반드시 삽입할 것.
            (예시: [사진 삽입 예정: ERD 다이어그램])

            7. 보고서 문체는 "~하였다", "~되었다"의 완료형 서술어를 사용할 것.
            (절대 존댓말 금지. 예: "개발하였다.", "설계되었다.")

            8. 단순히 결과만 나열하지 말고
            - 배경 → 과정 → 결과 → 문제점 → 개선 방향
            순서로 구체적으로 서술할 것.

            9. 실제 프로젝트 상황을 바탕으로 한 구체적 수치, 활동 기록, 실습 과정 등을 최대한 포함할 것.
            (예: "테스트 결과 95% 성공률을 기록하였다." / "ERD에는 6개 엔티티와 11개 관계가 포함되었다.")

            10. 최종 보고서 글자 수는 최소 2000자 이상, 7000자 이내가 되도록 할 것(html 태그, 사진 문구 제외).
            억지로 반복하거나 의미 없는 문장을 추가하지 말 것.

            11. html 문법 사용 필수 (h2, h3, p, ul, li 태그 등).

            12. 최종 목표는 실제로 교수님께 제출 가능한 완성도를 갖춘 보고서를 작성하는 것.

            # 주의사항
            - 아래 제공된 기존 보고서 내용 예시는 참고만 하며, 그 문장을 복사하거나 요약해서 사용하지 말 것.
            - 소제목 개수는 반드시 그대로 사용하거나 늘릴 것.
            - 직접 프로젝트 업무 데이터와 상태를 분석하여 독립적으로 작성할 것.
            - \"누가\" 했는지 중요한 것이 아님. 어떤 것을 했는지가 중요한 것. 반드시 모든 업무명을 보고 작성할 것.
            - 기간은 적지 말 것. 만약 완료하지 못한 것들에 대해 이야기하려는 경우, 추후 추가할 예정이라고 적을 것.

            필수 참고 정보:
            반드시 이 정보를 가지고 작성할 것.
            {task_info_str}

            
            <!DOCTYPE html>
            <html lang="ko">
            <head>
            <meta charset="UTF-8" />
            <title>프로젝트 최종보고서</title>
            </head>
            <body>

            <h1>키오스크 주문 관리 시스템</h1>

            <h2>기본 정보</h2>
            <p><strong>과목명:</strong> 소프트웨어공학</p>
            <p><strong>팀명:</strong> 활빈당</p>
            <p><strong>팀원:</strong> 14432131 홍길동(팀장), 14412154 홍인형</p>
            <p><strong>교수:</strong> 허균</p>
            <p><strong>제출일:</strong> 2025-05-27</p>

            <br>

            <h2>1. 서론</h2>
            <h3>가. 프로젝트 개요</h3>
            <p>
            최근 다양한 산업군에서 키오스크 시스템의 활용도가 급격히 높아지고 있다. 특히 카페와 같은 소규모 매장에서도 인건비 절감, 주문 실수 감소, 고객 편의성 향상이라는 이점을 위해 키오스크 도입이 빠르게 확산되고 있다.  
            <br><br>
            본 프로젝트는 중소형 카페 매장을 대상으로, 설치가 간편하고 사용이 직관적인 키오스크 소프트웨어를 개발하는 것을 목표로 한다. 이를 통해 대면 주문 과정의 비효율성을 줄이고, 고객이 직접 주문을 진행함으로써 매장 운영의 효율성을 높이고자 한다.  
            </p>

            <h3>나. 개발 환경 및 기술 스택</h3>
            <p>
            개발은 Python 3.10 버전을 사용하여 진행되었다. 사용자 인터페이스는 Tkinter로 구현되었고, 데이터베이스는 SQLite3를 이용하여 추가 서버 없이 경량화된 관리가 가능하도록 하였다.  
            <br><br>
            버전 관리는 GitHub, 협업 관리는 Notion과 Trello를 활용하여 일정과 업무를 체계적으로 관리하였다.  
            <br><br>
            UX/UI 설계 초기 단계에서는 Figma를 통해 주요 화면 흐름을 시각화하고, 사용자 입장에서의 편의성을 사전 검토하였다.
            </p>

            <br>

            <h2>2. 프로젝트 설계 및 구현</h2>
            <h3>가. 기능 요구사항 정의</h3>
            <ul>
            <li>메뉴 선택 및 주문 기능: 사용자가 화면에서 메뉴를 선택하여 주문할 수 있도록 하였다.</li>
            <li>결제 방식 선택 기능: 카드 결제 및 QR 코드 결제 방식을 제공하였다.</li>
            <li>주문 내역 확인 및 수정 기능: 장바구니에 담긴 주문을 확인·삭제할 수 있도록 구현하였다.</li>
            <li>관리자 모드 기능: 관리자 전용 로그인 후 메뉴 관리 및 판매 통계 조회 기능을 제공하였다.</li>
            </ul>

            <h3>나. 시스템 구조 및 흐름</h3>
            <p>
            사용자 인터페이스와 데이터베이스 관리 모듈로 구성되었다. 사용자 주문 정보는 세션에 임시 저장된 뒤, 결제 완료 시 SQLite 데이터베이스에 영구 저장되었다.  
            <br><br>
            관리자는 로그인 후 관리자 페이지에서 메뉴를 추가·수정할 수 있으며, 판매 기록을 날짜별로 조회할 수 있도록 설계되었다.
            </p>
            <p>[사진 삽입 예정: 시스템 전체 흐름도]</p>

            <h3>다. 주요 코드 설명 및 화면 예시</h3>
            <h4>1) 메뉴 선택 기능 구현</h4>
            <p>
            Tkinter 버튼 위젯을 이용하여 메뉴 항목을 동적으로 생성하였다. 버튼 클릭 시 `add_item` 함수를 호출하여 리스트박스에 주문 정보를 표시하였고, 총 주문 금액을 업데이트하도록 구현되었다.
            </p>
            <p>[사진 삽입 예정: 메뉴 선택 화면 캡처]</p>

            <h4>2) 주문 내역 확인 및 수정 기능</h4>
            <p>
            장바구니는 리스트박스로 시각화하였고, 삭제 버튼을 통해 주문을 제거할 수 있도록 하였다. `remove_item` 함수에서 예외 처리를 추가하여, 삭제 시 총 금액이 자동 갱신되도록 하였다.
            </p>
            <p>[사진 삽입 예정: 장바구니 관리 화면 캡처]</p>

            <h4>3) 결제 기능 구현</h4>
            <p>
            카드 및 QR 코드 결제 옵션을 제공하였다. 결제 완료 시 주문 정보를 데이터베이스에 기록하고, 성공·실패에 따른 UI 피드백을 제공하도록 설계되었다.
            </p>
            <p>[사진 삽입 예정: 결제 방식 선택 화면 캡처]</p>

            <h4>4) 관리자 모드 기능 구현</h4>
            <p>
            관리자 로그인 후 메뉴 관리, 판매 기록 조회 기능을 구현하였다. 사용자별 접근 권한을 체크하여 보안을 강화하였다.
            </p>
            <p>[사진 삽입 예정: 관리자 모드 화면 캡처]</p>

            <br>

            <h2>3. 결과 및 평가</h2>
            <h3>가. 기능 구현 결과</h3>
            <p>
            모든 필수 기능이 정상적으로 구현되었으며, 단위 테스트를 통해 주요 흐름—메뉴 추가·삭제, 주문 수정, 결제, 관리자 기능—에 대한 정상 동작을 확인하였다.  
            <br><br>
            특히 예외 처리 로직이 안정적으로 수행되었고, UI 반응 속도도 사용자 테스트에서 평균 150ms 이내로 측정되었다.
            </p>

            <h3>나. 프로젝트 성과 및 개선점</h3>
            <p>
            <strong>성과</strong><br>
            - 경량화된 SQLite 기반으로 별도 서버 없이 운영 가능함을 증명하였다.<br>
            - Tkinter 기반 GUI로 소규모 매장 실환경 시연을 완료하였다.<br>
            - 협업 도구(Notion·Trello) 활용으로 일정 관리와 코드 리뷰 프로세스가 안정화되었다.
            <br><br>
            <strong>개선점</strong><br>
            - UI 시각적 완성도가 다소 떨어져, 향후 PyQt 혹은 customtkinter 도입 검토가 필요하다.<br>
            - 실제 결제 모듈 연동(Stripe, KakaoPay) 구현이 미비하여, 추가 API 연동 작업이 필요하다.<br>
            - 대규모 매장 확장 시 MySQL·PostgreSQL 전환 고려가 필요하다.
            </p>
            <p>[사진 삽입 예정: 최종 테스트 완료 화면 캡처]</p>

            <br>

            <h2>4. 결론</h2>
            <p>
            본 프로젝트를 통해 GUI 프로그래밍, 데이터베이스 설계 및 연동, 사용자 인증 및 권한 관리의 기본 과정을 경험하였다.  
            <br><br>
            특히 사용자 중심 UI 설계와 예외 처리 로직 구현을 통해 실무적 개발 역량을 강화할 수 있었다.  
            <br><br>
            향후 디자인 고도화, 결제 API 연동, 클라우드 기반 데이터 관리 기능을 추가하여 상용화 수준의 소프트웨어로 발전시키고자 한다.
            </p>

            <br>

            <h2>5. 시스템 통합 및 배포 요약</h2>
            <h3>가. CI/CD 파이프라인 구성</h3>
            <p>
            GitHub Actions를 이용해 `main` 브랜치 푸시 시 Docker 이미지를 자동 빌드·테스트·배포하도록 설정하였다. AWS ECS 롤링 업데이트로 무중단 배포가 가능하도록 구성되었다.
            </p>
            <h3>나. 운영 환경 설정</h3>
            <p>
            AWS EC2(t3.small) 인스턴스 위에 컨테이너를 배포하였고, RDS(MySQL)와 연동하였다. 로드밸런서(ALB)와 오토스케일링 정책을 통해 트래픽 변동에 유연하게 대응하도록 설계되었다.
            </p>
            <p>[사진 삽입 예정: 배포 아키텍처 다이어그램]</p>

            <br>

            <h2>6. 성능 검증 및 테스트 결과</h2>
            <h3>가. 벤치마크 수치</h3>
            <p>
            Locust를 이용한 부하 테스트 결과, 동시 100 사용 시 평균 응답 시간 180ms 이하를 기록하였다. 최대 처리량은 초당 200요청 이상으로 안정적이었다.
            </p>
            <h3>나. 테스트 커버리지</h3>
            <p>
            유닛 테스트 커버리지 85%, 통합 테스트 커버리지 70%를 달성하였다. 주요 시나리오—주문 흐름, 관리자 기능—에 대해 모두 자동화 테스트를 완료하였다.
            </p>

            <br>

            <h2>7. 사용자 평가 및 UX 개선 사항</h2>
            <h3>가. 사용성 테스트 결과</h3>
            <p>
            실제 대학생 10명을 대상으로 설문조사를 실시하였다. 평균 만족도 4.2/5.0을 기록하였으며, “주문 내역 수정 UI가 직관적이다”라는 피드백이 다수였다.
            </p>
            <h3>나. 개선 요청 사항</h3>
            <ul>
            <li>사이드바 토글 기능 추가 요청</li>
            <li>결제 완료 후 확인 화면 개선 요청</li>
            </ul>

            <br>

            <h2>8. 리스크 관리 및 이슈 트래킹</h2>
            <h3>가. 주요 리스크 발생 내역</h3>
            <p>
            - S3 대용량 업로드 시 지연 현상 발생하여, 파일 Chunk 업로드 방식으로 대체하였다.<br>
            - DB 스키마 마이그레이션 중 레거시 데이터 누락 이슈가 있어 롤백 전략을 수립하였다.
            </p>
            <h3>나. 대응 및 재발 방지</h3>
            <p>
            이슈 발생 시 JIRA 티켓을 발행하고, 팀내 회고를 통해 세부 대응 절차를 마련하였다. 문서화된 마이그레이션 가이드를 작성하여 재발을 방지하였다.
            </p>

            <br>

            <h2>9. 프로젝트 일정 대비 실적 분석</h2>
            <table>
            <tr><th>단계</th><th>계획 완료일</th><th>실제 완료일</th><th>지연 원인</th></tr>
            <tr><td>요구사항 정의</td><td>2025-05-10</td><td>2025-05-11</td><td>팀원 일정 조율</td></tr>
            <tr><td>UI/UX 설계</td><td>2025-05-15</td><td>2025-05-14</td><td>빠른 의사결정</td></tr>
            <tr><td>기능 구현</td><td>2025-06-01</td><td>2025-06-03</td><td>API 연동 문제</td></tr>
            </table>
            <p>일정 차이를 분석하고, 향후 일정 관리에서 유연한 버퍼를 확보할 계획이다.</p>

            <br>

            <h2>10. 보안 및 권한 관리</h2>
            <h3>가. 인증·인가 흐름</h3>
            <p>
            JWT 기반 인증을 사용하여 로그인 후 토큰을 발급하였다. 각 API 엔드포인트에서 역할 기반 권한 검사를 수행하여 리소스 접근을 제어하였다.
            </p>
            <h3>나. 취약점 점검 결과</h3>
            <p>
            OWASP Top 10 점검 도구를 통해 XSS·CSRF 취약점 검사를 수행하였다. 주요 취약점은 발견되지 않아, 현재 보안 기준을 충족하였다.
            </p>

            <br>

            <h2>11. 유지보수 계획 및 향후 로드맵</h2>
            <h3>가. 버전 관리 정책</h3>
            <p>
            Semantic Versioning(주.부.패치) 정책을 도입하여, 릴리즈 노트를 체계적으로 관리할 것이다.
            </p>
            <h3>나. 추가 기능 로드맵</h3>
            <ul>
            <li>모바일 앱 연동 (v2.0)</li>
            <li>챗봇 자동 알림 기능 (v2.1)</li>
            <li>다국어 지원 (v2.2)</li>
            </ul>

            <br>

            <h2>12. 부록</h2>
            <h3>가. ERD 다이어그램</h3>
            <p>[사진 삽입 예정: 최종 ERD 다이어그램]</p>
            <h3>나. API 스펙</h3>
            <p>Swagger/OpenAPI 문서 링크: [API 문서]</p>
            <h3>다. 참고문헌 및 라이선스</h3>
            <p>본 프로젝트는 MIT 라이선스로 배포되었다.</p>

            </body>
            </html>



            """
            print("✅ GPT 프롬프트:", prompt)
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "너는 공과대학 보고서 작성 전문가야."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=12000
            )
            summary_html = response.choices[0].message.content
            print("✅ GPT 응답 (보고서 템플릿):", summary_html)

            if summary_html.startswith("```"):
                lines = summary_html.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                summary_html = "\n".join(lines).strip()


            return JsonResponse({"summary": summary_html}, status=200)
        
        except openai.OpenAIError as e:
            print("❌ OpenAI API 오류:", str(e))
            return JsonResponse({"error": f"OpenAI API 오류: {str(e)}"}, status=500)
        except Exception as e:
            print("❌ 서버 내부 오류:", str(e))
            return JsonResponse({"error": f"서버 오류: {str(e)}"}, status=500)
    else:
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)

#==============================================================
# 세준 사용 공간
#==============================================================

@csrf_exempt
def generate_high_level_tasks(request):
    """
    GPT로 업무 생성 (DB 저장은 하지 않음)
    - 프로젝트 주제, 팀원 정보, 시작일 및 종료일을 포함하여,
      상위/하위 업무와 함께 '프로젝트 이름' 필드를 포함한 JSON을 출력하도록 요청.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print("📌 generate_high_level_tasks 받은 데이터:", data)
            project_topic = data.get("project_topic", "")
            selected_users = data.get("selected_users", [])
            start_date = data.get("project_start_date", "")
            end_date = data.get("project_end_date", "")

            # ✅ 추가 입력값
            project_description = data.get("project_description", "")
            project_goal = data.get("project_goal", "")
            tech_stack = data.get("tech_stack", [])

            if not project_topic:
                return JsonResponse({"error": "프로젝트 주제를 입력하세요."}, status=400)

            users = User.objects.filter(user_id__in=selected_users)
            user_data = [
                {"id": user.user_id, "name": user.name, "skills": user.skill.split(",") if user.skill else []}
                for user in users
            ]

            # 업무발표
            prompt = f"""
                이 프로젝트는 컴퓨터공학과 대학생 팀이 수행하는 협업 프로젝트입니다.
                현실적이고 교육적인 목표와, 제한된 시간 내에 수행할 수 있는 업무 구조가 필요합니다.

                프로젝트 주제: {project_topic}
                프로젝트 설명: {project_description}
                프로젝트 목표 및 산출물: {project_goal}
                사용 기술 스택: {", ".join(tech_stack) if tech_stack else "지정되지 않음"}
                시작일: {start_date}
                종료일: {end_date}

                이 프로젝트에 참여할 팀원 정보:
                {json.dumps(user_data, ensure_ascii=False)}

                프로젝트 '{project_topic}'에 대한 주요 업무를 생성하세요.
                상위 업무는 최소 4개, 최대 6개를 제공해야 합니다.
                각 상위 업무마다 최소 3개, 최대 6개의 하위 업무를 포함해야 합니다.
                필요할 경우, 1개씩 초과해서 제안할 수 있습니다.
                반드시 JSON 형식만 출력하고, 불필요한 설명이나 텍스트는 포함하지 마세요.

                📌 **출력 조건**
                - 프로젝트 이름은 짧고 간결하게 만들 것. 단, 어떤 프로젝트인지 한번에 알아볼 수 있어야 함.
                - 상위 업무에는 '배정된 사용자'와 업무명이 포함됨
                - 하위 업무에는 '요구 스킬'이 포함됨 (배정된 사용자 포함)
                - 상위 업무와 하위 업무에는 업무별 적절한 '시작일'과 '종료일'이 포함되어야 함
                - 첫번째 상위업무 시작일은 {start_date}+1여야 하며, 마지막 상위업무 종료일은 {end_date}+1여야 함.
                - 이외의 시작일과 종료일은 전체 시작일과 종료일을 안에서 각 업무별로 적절하게 부여할 것
                - 조금씩은 겹칠 수 있으나, 완벽하게 겹치는 경우는 지양할 것
                - 반드시 JSON 형식으로 반환
                - 업무가 제일 많이 할당된 사람과 제일 적게 할당된 사람의 업무 개수 차이는 2개를 넘길 수 없음
                - 상위 업무에 배정된 사용자는 하위 업무에 배정된 사용자 중 한명이어야 함
                - 반드시 "프로젝트 이름"을 포함할 것
                - 발표를 "\*\*언급할 경우에만\*\*", "발표자료"라는 상위 업무를 추가하고, 배정된 사용자와 요구 스킬을 포함할 것
                - 하위 업무는 최대한 상세하고 구체적으로 작성할 것.
                - 발표를 "제외한" 하위 업무의 경우 3개 이상으로 작성할 것. 발표 하위업무는 2개.
                - 아래 항목 중 단 하나라도 불명확하거나, 부실하거나, 컴퓨터공학과 대학생 팀 프로젝트의 범위로 부적절한 경우 전체 프로젝트를 무효로 판단해야 합니다.
                    ① 프로젝트 이름
                    ② 프로젝트 설명
                    ③ 프로젝트 목표 및 산출물
                - 이 중 하나라도 조건을 충족하지 않으면 "프로젝트 이름": null 로 출력하고, "주요 업무"는 생략할 것.
                
                📌 유효성 검사
                - 프로젝트 입력 항목 중 하나라도 부적절한 경우, 전체 프로젝트를 무효로 판단해야 합니다.
                - 다음과 같이 "유효성" 키를 포함한 JSON을 출력하세요:

                    예시:
                    {{
                    "유효성": {{
                        "프로젝트 이름": true,
                        "설명": true,
                        "목표": false
                    }},
                    "프로젝트 이름": null
                    }}

                조건:
                - 하나라도 false면 "프로젝트 이름"은 null 로 처리하세요.
                - "유효성" 키는 항상 포함하세요.
                - "주요 업무"는 유효성 검사를 통과한 경우에만 포함하세요.


                예시 출력:
                {{
                "프로젝트 이름": "파이썬으로 챗봇 개발",
                "주요 업무": [
                    {{
                    "업무명": "고객 응대 관리 시스템 개발",
                    "배정된 사용자": "김철수",
                    "시작일": "2025-04-10",
                    "종료일": "2025-04-15",
                    "하위업무": [
                        {{
                        "업무명": "챗봇 인터페이스 개발",
                        "배정된 사용자": "김철수",
                        "요구 스킬": ["Python", "Django"],
                        "시작일": "2025-04-10",
                        "종료일": "2025-04-12"
                        }},
                        {{
                        "업무명": "고객 데이터 분석 기능 구현",
                        "배정된 사용자": "박지훈",
                        "요구 스킬": ["데이터 분석", "SQL"],
                        "시작일": "2025-04-10",
                        "종료일": "2025-04-12"
                        }},
                        {{
                        "업무명": "챗봇 API 개발",
                        "배정된 사용자": "김은비",
                        "요구 스킬": ["FastAPI", "Python"],
                        "시작일": "2025-04-12",
                        "종료일": "2025-04-15"
                        }}
                    ]
                    }},
                    {{
                    "업무명": "데이터베이스 설계 및 구축",
                    "배정된 사용자": "박지훈",
                    "시작일": "2025-04-16",
                    "종료일": "2025-04-20",
                    "하위업무": [
                        {{
                        "업무명": "ERD 설계 및 데이터 모델링",
                        "배정된 사용자": "김은비",
                        "요구 스킬": ["MySQL", "ERD"],
                        "시작일": "2025-04-16",
                        "종료일": "2025-04-17"
                        }},
                        {{
                        "업무명": "테이블 생성",
                        "배정된 사용자": "박지훈",
                        "요구 스킬": ["쿼리 최적화", "인덱싱"],
                        "시작일": "2025-04-17",
                        "종료일": "2025-04-19"
                        }},
                        {{
                        "업무명": "DB 성능 최적화",
                        "배정된 사용자": "김은비",
                        "요구 스킬": ["데이터 분석", "SQL"],
                        "시작일": "2025-04-19",
                        "종료일": "2025-04-20"
                        }}
                    ]
                    }}
                ]
                }}
                """

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "당신은 프로젝트 관리 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=3500
            )

            response_text = response.choices[0].message.content.strip()
            print("📌 GPT 응답 원본:", response_text)

            # 코드 블록 제거 (예: ```json ... ```)
            if response_text.startswith("```"):
                lines = response_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                response_text = "\n".join(lines).strip()

            # JSON 파싱 및 검증
            try:
                tasks_data = json.loads(response_text)

                validity = tasks_data.get("유효성", {})
                if not isinstance(validity, dict):
                    raise ValueError("유효성 정보가 없습니다.")

                # ✅ 문제 있는 항목을 추려냄
                failed_fields = [field for field, valid in validity.items() if not valid]

                if failed_fields:
                    return JsonResponse({
                        "error": "입력 항목 중 일부가 부적절하여 업무를 생성할 수 없습니다.",
                        "invalid_fields": failed_fields  # 🔥 프론트에서 메시지 생성 가능
                    }, status=400)

                # 통과한 경우만 결과 반환
                project_name = tasks_data.get("프로젝트 이름")
                tasks = tasks_data["주요 업무"]
            except json.JSONDecodeError as e:
                print("❌ JSON 파싱 오류:", str(e))
                return JsonResponse({"error": "OpenAI 응답이 올바른 JSON 형식이 아닙니다.", "raw_response": response_text}, status=500)

            return JsonResponse({
                "project_name": project_name,
                "tasks": tasks  # DB 저장 전 생성된 업무
            }, status=200)

        except Exception as e:
            print("❌ 서버 내부 오류:", str(e))
            return JsonResponse({"error": f"서버 오류: {str(e)}"}, status=500)



@csrf_exempt
def confirm_tasks(request):
    """
    사용자가 확인 후 업무를 DB에 저장하는 엔드포인트.
    전달받은 project_name, tasks, selected_users를 기반으로:
    1. 새 프로젝트 생성 (project_name 저장, project_id auto increment)
    2. ProjectMember 테이블에 팀원들 등록 (첫 번째는 팀장: role=1, 나머지는 팀원: role=0)
    3. Task와 TaskManager 테이블에 업무 저장
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print("📌 받은 데이터:", data)

            project_name = data.get("project_name")
            tasks = data.get("tasks", [])
            selected_users = data.get("selected_users", [])

            if not project_name or not tasks or not selected_users:
                return JsonResponse({"error": "프로젝트 이름, 업무 목록 및 사용자 목록이 필요합니다."}, status=400)

            # 1. 새 프로젝트 생성
            project = Project.objects.create(project_name=project_name)
            project_id = project.project_id
            print(f"✅ 새 프로젝트 생성됨: ID={project_id}, 이름={project_name}")

            # selected_users 정수 변환
            try:
                selected_users = [int(u) for u in selected_users]
            except Exception as conv_err:
                print("❌ 사용자 ID 정수 변환 오류:", str(conv_err))
                return JsonResponse({"error": "사용자 ID 형식 오류입니다."}, status=400)

            # 2. 팀원 등록
            for idx, one_user_id in enumerate(selected_users):
                role = 1 if idx == 0 else 0
                user_instance = User.objects.get(user_id=one_user_id)
                ProjectMember.objects.create(
                    user_id=user_instance,  # FK → User 객체
                    project_id=project_id,  # int 필드
                    role=role
                )
                print(f"✅ ProjectMember 등록: user_id={one_user_id} → project_id={project_id}, role={role}")

            # 3. Task 생성 및 TaskManager 등록
            project_members = set(
                ProjectMember.objects
                    .filter(project_id=project_id)
                    .values_list("user_id", flat=True)
            )
            users = User.objects.filter(user_id__in=selected_users)
            print("📌 프로젝트 멤버 user_ids:", project_members)

            from datetime import datetime

            def parse_date(date_str):
                """ 'YYYY-MM-DD' 형태 문자열을 datetime으로 변환. 실패 시 None """
                if not date_str:
                    return None
                try:
                    return datetime.strptime(date_str, "%Y-%m-%d")
                except ValueError:
                    print(f"⚠️ 날짜 파싱 실패: {date_str}")
                    return None

            task_instances = []

            for task in tasks:
                # 상위 업무의 시작/종료일 파싱
                parent_start = parse_date(task.get("시작일"))
                parent_end = parse_date(task.get("종료일"))

                # 상위 업무(Task) 생성
                parent_task = Task.objects.create(
                    task_name=task.get("업무명"),
                    description=json.dumps(task),
                    start_date=parent_start,  # 추가
                    end_date=parent_end,      # 추가
                    status=0,                 # 추가
                )
                task_instances.append(parent_task)

                # 담당자 확인 → TaskManager
                assigned_user_name = task.get("배정된 사용자")
                assigned_user = next((u for u in users if u.name == assigned_user_name), None)

                if assigned_user and assigned_user.user_id in project_members:
                    TaskManager.objects.create(
                        user_id=assigned_user.user_id,
                        project_id=project_id,
                        task_id=parent_task.task_id
                    )
                    print(f"✅ TaskManager 등록: user_id={assigned_user.user_id} → task_id={parent_task.task_id}")
                else:
                    print(f"❌ 배정 실패: 프로젝트 {project_id}에 '{assigned_user_name}'이(가) 존재하지 않음!")

                # 하위 업무 처리
                for sub_task in task.get("하위업무", []):
                    sub_start = parse_date(sub_task.get("시작일"))
                    sub_end = parse_date(sub_task.get("종료일"))

                    sub_task_obj = Task.objects.create(
                        task_name=sub_task.get("업무명"),
                        description=json.dumps(sub_task),
                        parent_task=parent_task,
                        start_date=sub_start,  # 추가
                        end_date=sub_end,      # 추가
                        status=0,              # 추가
                    )

                    sub_assigned_name = sub_task.get("배정된 사용자")
                    sub_assigned_user = next((u for u in users if u.name == sub_assigned_name), None)

                    if sub_assigned_user and sub_assigned_user.user_id in project_members:
                        TaskManager.objects.create(
                            user_id=sub_assigned_user.user_id,
                            project_id=project_id,
                            task_id=sub_task_obj.task_id
                        )
                        print(f"✅ TaskManager 등록(하위): user_id={sub_assigned_user.user_id} → task_id={sub_task_obj.task_id}")
                    else:
                        print(f"❌ 하위 업무 배정 실패: 프로젝트 {project_id}에 '{sub_assigned_name}'이(가) 존재하지 않음!")

            return JsonResponse({
                "message": "업무가 성공적으로 저장되었습니다.",
                "project_id": project_id,
                "project_name": project_name,
                "saved_tasks": [
                    {"task_name": t.task_name, "description": t.description} for t in task_instances
                ]
            }, status=200)

        except Exception as e:
            print("❌ 서버 내부 오류:", str(e))
            return JsonResponse({"error": f"서버 오류: {str(e)}"}, status=500)
    else:
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)
