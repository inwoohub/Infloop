# Create your views here.
import json, io
from django.middleware.csrf import get_token
from django.http import JsonResponse
from django.views import View
from django.db import connection
from django.contrib.auth.hashers import check_password, make_password  # ✅ import 추가
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import render
from django.views.decorators.http import require_POST, require_GET
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from db_model.models import User,Project,FavoriteProject
from users.serializers import UserSubjectSerializer
from django.http import HttpResponse
from html2docx import html2docx
from docx import Document
from docx.oxml.ns import qn
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import boto3
from botocore.exceptions import NoCredentialsError


@method_decorator(csrf_exempt, name='dispatch')  # CSRF 보호 비활성화

#==============================================================
# 인우 사용 공간
#==============================================================
 
class LoginView(View):
    def post(self, request):
        import json
        data = json.loads(request.body)
        user_id = data.get('user_id')
        password = data.get('password')

        with connection.cursor() as cursor:
            cursor.execute("SELECT name, password FROM User WHERE user_id = %s", [user_id])
            user = cursor.fetchone()

        if user and password == user[1]:  # 비밀번호 확인
            request.session['user_id'] = user_id  # ✅ 세션에 user_id 저장 (추가)
            request.session['name'] = user[0]  # 세션에 사용자 이름 저장
            # request.session.save()  # 세션 강제 저장
            print(request.session.session_key)  # 현재 요청의 세션 키 출력
            print(f"로그인 한 사람 이름 세션 데이터: {request.session.items()}") # 세션 데이터 확인
            return JsonResponse({"message": f"환영합니다, {user[0]}님!"}, status=200)
        return JsonResponse({
                    "message": f"아이디 혹은 비밀번호가 틀렸습니다.",
                    "user_id": user_id,
                    "name": user[0]  # ✅ name도 함께 반환
                }, status=401)
 
@method_decorator(csrf_exempt, name='dispatch')
class ChangePasswordView(View):
    def patch(self, request):
        if 'user_id' not in request.session:
            return JsonResponse({"error": "로그인이 필요합니다."}, status=401)

        user_id = request.session.get('user_id')

        # 🔍 JSON 데이터 디버깅 출력
        try:
            data = json.loads(request.body)
            print("🔍 받은 데이터:", data)  # 🛠 request.body 출력 (디버깅)
        except json.JSONDecodeError:
            return JsonResponse({"error": "잘못된 JSON 형식입니다."}, status=400)

        current_password = data.get("current_password")
        new_password = data.get("new_password")

        if not current_password or not new_password:
            return JsonResponse({"error": "모든 필드를 입력해주세요."}, status=400)

        # 데이터베이스에서 현재 로그인한 사용자 정보 가져오기
        with connection.cursor() as cursor:
            cursor.execute("SELECT password FROM User WHERE user_id = %s", [user_id])
            user = cursor.fetchone()

        if not user:
            return JsonResponse({"error": "사용자를 찾을 수 없습니다."}, status=404)

        # 🔍 데이터베이스에서 가져온 비밀번호 출력 (디버깅)
        hashed_password = user[0]
        print("🔍 DB에서 가져온 비밀번호:", hashed_password)

        # ✅ 문제 발생 가능 지점: check_password()가 실패할 가능성
        if not check_password(current_password, hashed_password):
            return JsonResponse({"error": "현재 비밀번호가 올바르지 않습니다."}, status=400)

        # ✅ 비밀번호 해싱 후 저장
        new_hashed_password = make_password(new_password)

        with connection.cursor() as cursor:
            cursor.execute("UPDATE User SET password = %s WHERE user_id = %s", [new_hashed_password, user_id])

        return JsonResponse({"message": "비밀번호가 성공적으로 변경되었습니다."}, status=200)

# 상단 프로필 이름 가져오기
def get_user_name(request):
    try:
        # 세션에서 사용자 이름 가져오기
        name = request.session.get('name')
        user_id = request.session.get("user_id")  # ✅ 세션에서 user_id 가져오기
        if name:
            return JsonResponse({"name": name, "user_id": user_id}, status=200,json_dumps_params={'ensure_ascii': False})
        else: 
            # 세션에 데이터가 없을 경우
            return JsonResponse({"message": "No user information in session."}, status=401)
    except Exception as e:
        # 오류 로그 출력
        print(f"Error fetching user name: {e}")
        return JsonResponse({"message": "서버 내부 오류가 발생했습니다."}, status=500)


# ✅ 유저 목록 가져오기 (MySQL 직접 조회)
@csrf_exempt
def get_users_list(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id, name, profile_image FROM User")
        rows = cursor.fetchall()

    users_list = [{"user_id": r[0], "name": r[1], "profile_image": r[2]} for r in rows]
    return JsonResponse(users_list, safe=False, json_dumps_params={'ensure_ascii': False})


# def get_user_profile(request):
#     # ✅ 세션에서 로그인한 사용자 ID 가져오기
#     user_id = request.session.get("user_id")

#     if not user_id:
#         return JsonResponse({"message": "로그인이 필요합니다."}, status=401)

#     with connection.cursor() as cursor:
#         # ✅ `User` 테이블에서 user_id에 해당하는 정보 가져오기
#         cursor.execute("SELECT user_id, name, email, skill FROM User WHERE user_id = %s", [user_id])
#         user = cursor.fetchone()

#     if user:
#         data = {
#             "user_id": user[0],
#             "name": user[1],
#             "email": user[2],
#             "skill": user[3] if user[3] else "기술스택을 입력해주세요. ex)python, java, 프론트엔드, 리더십 등",  # ✅ skill이 None일 경우 처리
#         }
#         return JsonResponse(data, json_dumps_params={'ensure_ascii': False})  # ✅ JSON 한글 깨짐 방지

#     return JsonResponse({"message": "사용자 정보를 찾을 수 없습니다."}, status=404)

def get_user_profile(request):
    # ✅ 세션에서 로그인한 사용자 ID 가져오기
    user_id = request.session.get("user_id")

    if not user_id:
        return JsonResponse({"message": "로그인이 필요합니다."}, status=401)

    with connection.cursor() as cursor:
        # ✅ `User` 테이블에서 user_id에 해당하는 정보 가져오기 (profile_image 추가)
        cursor.execute("SELECT user_id, name, email, skill, profile_image FROM User WHERE user_id = %s", [user_id])
        user = cursor.fetchone()

    if user:
        data = {
            "user_id": user[0],
            "name": user[1],
            "email": user[2],
            "skill": user[3] if user[3] else "기술스택을 입력해주세요. ex)python, java, 프론트엔드, 리더십 등",
            "profile_image": user[4] if user[4] else None,  # ✅ 프로필 이미지 추가
        }
        return JsonResponse(data, json_dumps_params={'ensure_ascii': False})

    return JsonResponse({"message": "사용자 정보를 찾을 수 없습니다."}, status=404)

# @csrf_exempt
# def upload_profile_image(request):
#     if request.method == "POST":
#         user_id = request.session.get("user_id")
        
#         if not user_id:
#             return JsonResponse({"message": "로그인이 필요합니다."}, status=401)
        
#         # 업로드된 파일 가져오기
#         profile_image = request.FILES.get("profile_image")
        
#         if not profile_image:
#             return JsonResponse({"message": "이미지 파일이 없습니다."}, status=400)
        
#         try:
#             # media/profile_images/ 디렉토리 생성
#             upload_dir = os.path.join(settings.MEDIA_ROOT, 'profile_images')
#             os.makedirs(upload_dir, exist_ok=True)
            
#             # 파일명 생성 (user_id + 확장자)
#             file_extension = os.path.splitext(profile_image.name)[1]
#             file_name = f"user_{user_id}{file_extension}"
#             file_path = os.path.join('profile_images', file_name)
            
#             # 기존 파일 삭제 (있다면)
#             full_path = os.path.join(settings.MEDIA_ROOT, file_path)
#             if os.path.exists(full_path):
#                 os.remove(full_path)
            
#             # 새 파일 저장
#             saved_path = default_storage.save(file_path, ContentFile(profile_image.read()))
            
#             # DB에 파일 경로 저장
#             image_url = f"{settings.MEDIA_URL}{file_path}"
            
#             with connection.cursor() as cursor:
#                 cursor.execute(
#                     "UPDATE User SET profile_image = %s WHERE user_id = %s",
#                     [image_url, user_id]
#                 )
            
#             return JsonResponse({
#                 "message": "프로필 이미지가 업로드되었습니다.",
#                 "profile_image": image_url
#             }, status=200)
            
#         except Exception as e:
#             print(f"프로필 이미지 업로드 오류: {e}")
#             return JsonResponse({"message": "이미지 업로드에 실패했습니다."}, status=500)
    
#     return JsonResponse({"message": "POST 요청만 허용됩니다."}, status=405)

@csrf_exempt
def upload_profile_image(request):
    if request.method == "POST":
        user_id = request.session.get("user_id")
        
        if not user_id:
            return JsonResponse({"message": "로그인이 필요합니다."}, status=401)
        
        # 업로드된 파일 가져오기
        profile_image = request.FILES.get("profile_image")
        
        if not profile_image:
            return JsonResponse({"message": "이미지 파일이 없습니다."}, status=400)
        
        try:
            # 파일명 생성 (user_id + 확장자)
            file_extension = os.path.splitext(profile_image.name)[1]
            file_name = f"profile_images/user_{user_id}{file_extension}"
            
            # ✅ AWS S3에 업로드
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # S3에 파일 업로드 (public-read 권한 설정)
            s3_client.upload_fileobj(
                profile_image,
                settings.AWS_STORAGE_BUCKET_NAME,
                file_name,
                ExtraArgs={
                    'ContentType': profile_image.content_type,
                    # 'ACL': 'public-read'  # 모든 사람이 읽을 수 있도록 설정
                }
            )
            
            # S3 URL 생성
            image_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{file_name}"
            
            # DB에 파일 경로 저장
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE User SET profile_image = %s WHERE user_id = %s",
                    [image_url, user_id]
                )
            
            return JsonResponse({
                "message": "프로필 이미지가 업로드되었습니다.",
                "profile_image": image_url
            }, status=200)
            
        except NoCredentialsError:
            print("AWS 자격 증명을 찾을 수 없습니다.")
            return JsonResponse({"message": "AWS 설정 오류입니다."}, status=500)
        except Exception as e:
            print(f"프로필 이미지 업로드 오류: {e}")
            return JsonResponse({"message": f"이미지 업로드에 실패했습니다: {str(e)}"}, status=500)
    
    return JsonResponse({"message": "POST 요청만 허용됩니다."}, status=405)


@csrf_exempt  # ✅ CSRF 방지 (POST 요청 허용)
def update_skill(request):
    if request.method == "PATCH":
        user_id = request.session.get("user_id")  # ✅ 세션에서 로그인된 사용자 ID 가져오기
        if not user_id:
            return JsonResponse({"message": "로그인이 필요합니다."}, status=401)

        try:
            data = json.loads(request.body)  # ✅ JSON 데이터 파싱
            new_skill = data.get("skill")

            if new_skill is None:
                return JsonResponse({"message": "기술 스택을 입력해주세요."}, status=400)

            with connection.cursor() as cursor:
                cursor.execute("UPDATE User SET skill = %s WHERE user_id = %s", [new_skill, user_id])

            return JsonResponse({"message": "기술 스택 업데이트 완료!"}, status=200)

        except json.JSONDecodeError:
            return JsonResponse({"message": "잘못된 JSON 형식입니다."}, status=400)

    return JsonResponse({"message": "잘못된 요청 방식입니다."}, status=405)

# ✅ project_id를 session에 저장
@csrf_exempt
def receive_project_data(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            project_id = data.get("project_id")

            if not project_id:
                return JsonResponse({"error": "Missing project_id"}, status=400)

            request.session['latest_project_id'] = project_id  # ✅ 세션 저장
            request.session.modified = True  # ✅ 세션 변경됨을 Django에 알림

            print(f"📡 받은 project_id (세션 저장됨): {project_id}")
            print(f"📂 현재 세션 데이터: {request.session.items()}")  # ✅ 현재 세션 정보 출력

            return JsonResponse({"message": "프로젝트 ID를 세션에 성공적으로 저장했습니다.", "project_id": project_id})
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def get_latest_project_id(request):
    if request.method == "GET":
        project_id = request.session.get('latest_project_id')  # ✅ 세션에서 불러오기

        print(f"📡 요청 시 세션 데이터: {request.session.items()}")  # ✅ 현재 세션 정보 출력

        if project_id:
            return JsonResponse({"현재 생성 project_id": project_id},json_dumps_params={"ensure_ascii": False}) #한글 깨짐 방지 넣음
        else:
            return JsonResponse({"error": "No project_id found"}, status=404)  # ✅ 데이터 없음 처리

    return JsonResponse({"error": "Invalid request method"}, status=405)

@method_decorator(csrf_exempt, name='dispatch')
class SetProjectIDView(APIView):
    def post(self, request, format=None):
        project_id = request.data.get('project_id')
        if project_id:
            request.session['project_id'] = project_id
            request.session.modified = True  # 세션 업데이트 알림
            return Response(
                {'message': 'Project ID stored in session.'},
                status=status.HTTP_200_OK
            )
        return Response(
            {'error': 'No project_id provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )

@method_decorator(csrf_exempt, name='dispatch')
class GetProjectIDView(APIView):
    def get(self, request, format=None):
        try:
            project_id = request.session.get('project_id')
            user_id = request.session.get('user_id')  # 세션에서 user_id도 가져옴

            if project_id:
                try:
                    # project_id를 사용하여 Project 모델에서 project_name 조회
                    project = Project.objects.get(project_id=project_id)
                    project_name = project.project_name

                    # 디버깅용: request.user 출력 (로그인된 사용자라면 request.user가 채워집니다.)
                    print("Request user:", request.user, getattr(request.user, 'pk', None))
                    
                    # 로그인한 사용자가 있으면 FavoriteProject에서 즐겨찾기 여부 확인
                    # 만약 request.user가 인증되지 않았더라도, 세션에서 user_id를 가져왔으므로 사용합니다.
                    if request.user.is_authenticated:
                        is_favorite = FavoriteProject.objects.filter(user__pk=request.user.pk, project=project).exists()
                    elif user_id:
                        try:
                            user_id = int(user_id)
                        except ValueError:
                            user_id = None
                        if user_id:
                            is_favorite = FavoriteProject.objects.filter(user__pk=user_id, project=project).exists()
                        else:
                            is_favorite = False
                    else:
                        is_favorite = False
                except Project.DoesNotExist:
                    project_name = None
                    is_favorite = False
                
                return Response({
                    "project_id": project_id,
                    "project_name": project_name,
                    "is_favorite": is_favorite,
                    "user_id": user_id  # 세션에서 가져온 user_id도 함께 반환
                }, status=status.HTTP_200_OK)
            else:
            # 404 대신 200 OK와 함께 project_id가 null임을 알립니다.
                return Response({
                    "project_id": None,
                    "project_name": None,
                    "is_favorite": False,
                    "user_id": user_id 
                }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error fetching project id: {e}")
            return Response({"error": "서버 내부 오류가 발생했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



#=============================================================
#팀 구하는 곳

class UserSubjectsAPIView(APIView):
    """
    GET /api/users/{user_id}/subjects/
    해당 유저가 갖고 있는 과목 리스트를 반환
    """
    def get(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserSubjectSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

# 1) 전체 게시글 조회
def get_posts(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.post_id,
                    p.subject_code,
                    s.subject_name,
                    p.title,
                    p.content,
                    p.user_id      AS author_id,
                    p.created_date
                FROM Post p
                JOIN Subject s ON p.subject_code = s.subject_code
                ORDER BY p.created_date DESC
            """)
            rows = cursor.fetchall()

        posts = []
        for row in rows:
            created = row[6]
            # 만약 row[6] 이 string 으로 들어온다면 str(created) 로 처리
            created_str = created.strftime("%Y-%m-%d %H:%M:%S") \
                          if hasattr(created, "strftime") else str(created)
            posts.append({
                "id":           row[0],
                "subject_code": row[1],
                "subject_name": row[2],
                "title":        row[3],
                "content":      row[4],
                "author_id":    row[5],
                "created_date": created_str,
            })

        return JsonResponse(posts, safe=False, json_dumps_params={'ensure_ascii': False})
    except Exception as e:
        # 터미널에 스택 트레이스를 찍고
        import traceback; traceback.print_exc()
        # 프론트에 에러 메시지를 보내줍니다.
        return JsonResponse({"error": str(e)}, status=500)


# 2) 새 게시글 저장
@csrf_exempt
def save_post(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)

    try:
        data = json.loads(request.body)
        subject_code = data.get("subject_code")
        title        = data.get("title")
        content      = data.get("content")
        user_id      = data.get("user_id")

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO Post (subject_code, title, content, user_id)
                VALUES (%s, %s, %s, %s)
            """, (subject_code, title, content, user_id))
            new_id = cursor.lastrowid

        return JsonResponse({
            "message": "게시글이 저장되었습니다.",
            "id":      new_id
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# 3) 게시글 수정
@csrf_exempt
def update_post(request, post_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)

    try:
        data = json.loads(request.body)
        title   = data.get("title")
        content = data.get("content")

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE Post
                   SET title   = %s,
                       content = %s
                 WHERE post_id = %s
            """, (title, content, post_id))

        return JsonResponse({"message": "게시글이 수정되었습니다."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# 4) 게시글 삭제
@csrf_exempt
def delete_post(request, post_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE 요청만 허용됩니다."}, status=405)

    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM Post WHERE post_id = %s", (post_id,))
        return JsonResponse({"message": "게시글이 삭제되었습니다."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    


from datetime import datetime, timedelta
from db_model.models import Task, TaskManager, ProjectMember

# views.py 맨 아래에 추가
@csrf_exempt
def get_user_task_stats(request):
    """사용자의 업무 통계 조회"""
    if request.method == "GET":
        user_id = request.session.get("user_id")
        
        if not user_id:
            return JsonResponse({"message": "로그인이 필요합니다."}, status=401)
        
        try:
            # 오늘 날짜 기준으로 3일 후까지
            today = datetime.now().date()
            three_days_later = today + timedelta(days=3)
            
            with connection.cursor() as cursor:
                # 내가 맡은 업무 총 개수 (TaskManager를 통해 연결된 업무들)
                cursor.execute("""
                    SELECT COUNT(DISTINCT tm.task_id) 
                    FROM TaskManager tm 
                    WHERE tm.user_id = %s
                """, [user_id])
                my_tasks = cursor.fetchone()[0]
                
                # 완료한 업무 개수 (status가 3인 경우)
                cursor.execute("""
                    SELECT COUNT(DISTINCT tm.task_id) 
                    FROM TaskManager tm 
                    JOIN Task t ON tm.task_id = t.task_id 
                    WHERE tm.user_id = %s 
                    AND t.status = 3
                """, [user_id])
                completed_tasks = cursor.fetchone()[0]
                
                # 3일 이내 마감 업무 개수 (아직 완료되지 않은 것만)
                cursor.execute("""
                    SELECT COUNT(DISTINCT tm.task_id) 
                    FROM TaskManager tm 
                    JOIN Task t ON tm.task_id = t.task_id 
                    WHERE tm.user_id = %s 
                    AND DATE(t.end_date) <= %s 
                    AND DATE(t.end_date) >= %s
                    AND t.status != 3
                """, [user_id, three_days_later, today])
                urgent_tasks = cursor.fetchone()[0]
            
            return JsonResponse({
                "my_tasks": my_tasks,
                "completed_tasks": completed_tasks,
                "urgent_tasks": urgent_tasks
            }, status=200)
            
        except Exception as e:
            print(f"Error fetching task stats: {e}")
            return JsonResponse({"message": "서버 오류가 발생했습니다."}, status=500)
    
    return JsonResponse({"message": "잘못된 요청 방식입니다."}, status=405)

# 기존 get_user_task_stats 함수 아래에 추가

@csrf_exempt
def get_user_task_details(request):
    """사용자의 업무 상세 정보 조회 (모달용)"""
    if request.method == "GET":
        user_id = request.session.get("user_id")
        task_type = request.GET.get("type")  # 'my', 'incomplete', 'feedback', 'completed', 'urgent'
        
        if not user_id:
            return JsonResponse({"message": "로그인이 필요합니다."}, status=401)
        if not task_type:
            return JsonResponse({"message": "type 파라미터가 필요합니다."}, status=400)
        
        try:
            today = datetime.now().date()
            three_days_later = today + timedelta(days=3)

            # 상태코드: 0=요청, 1=진행, 2=피드백, 3=완료
            INCOMPLETE_STATUS = (0, 1)
            FEEDBACK_STATUS   = (2,)
            DONE_STATUS       = (3,)
            ACTIVE_STATUS     = (0, 1, 2)

            with connection.cursor() as cursor:
                if task_type == "my":
                    cursor.execute("""
                        SELECT DISTINCT t.task_id, t.task_name, t.status, t.end_date, p.project_name, p.project_id
                        FROM TaskManager tm 
                        JOIN Task t ON tm.task_id = t.task_id 
                        JOIN Project p ON tm.project_id = p.project_id
                        WHERE tm.user_id = %s
                        ORDER BY t.end_date ASC
                    """, [user_id])

                elif task_type == "incomplete":
                    cursor.execute("""
                        SELECT DISTINCT t.task_id, t.task_name, t.status, t.end_date, p.project_name, p.project_id
                        FROM TaskManager tm 
                        JOIN Task t ON tm.task_id = t.task_id 
                        JOIN Project p ON tm.project_id = p.project_id
                        WHERE tm.user_id = %s AND t.status IN %s
                        ORDER BY t.end_date ASC
                    """, [user_id, INCOMPLETE_STATUS])

                elif task_type == "feedback":
                    # ✅ 내가 속한 프로젝트들(ProjectMember) 중
                    #    내가 담당자가 아닌(= TaskManager에 내 user_id가 없는) 피드백 상태(2) 업무만 조회
                    cursor.execute("""
                        SELECT DISTINCT t.task_id, t.task_name, t.status, t.end_date, p.project_name, p.project_id
                        FROM Task t
                        JOIN TaskManager tm   ON tm.task_id = t.task_id
                        JOIN ProjectMember pm ON pm.project_id = tm.project_id
                        JOIN Project p        ON p.project_id  = tm.project_id
                        WHERE pm.user_id = %s       -- 내가 속한 프로젝트
                        AND t.status  = 2         -- 피드백
                        AND NOT EXISTS (          -- 내가 담당이 아닌 업무만
                            SELECT 1
                            FROM TaskManager tm2
                            WHERE tm2.task_id = t.task_id
                                AND tm2.user_id = %s
                        )
                        ORDER BY t.end_date ASC
                    """, [user_id, user_id])

                elif task_type == "completed":
                    cursor.execute("""
                        SELECT DISTINCT t.task_id, t.task_name, t.status, t.end_date, p.project_name, p.project_id
                        FROM TaskManager tm 
                        JOIN Task t ON tm.task_id = t.task_id 
                        JOIN Project p ON tm.project_id = p.project_id
                        WHERE tm.user_id = %s AND t.status IN %s
                        ORDER BY t.end_date DESC
                    """, [user_id, DONE_STATUS])

                elif task_type == "urgent":
                    cursor.execute("""
                        SELECT DISTINCT t.task_id, t.task_name, t.status, t.end_date, p.project_name, p.project_id
                        FROM TaskManager tm 
                        JOIN Task t ON tm.task_id = t.task_id 
                        JOIN Project p ON tm.project_id = p.project_id
                        WHERE tm.user_id = %s 
                          AND DATE(t.end_date) <= %s 
                          AND DATE(t.end_date) >= %s
                          AND t.status IN (0,1,2)
                        ORDER BY t.end_date ASC
                    """, [user_id, three_days_later, today])

                else:
                    return JsonResponse({"message": "잘못된 type입니다."}, status=400)
                
                rows = cursor.fetchall()
                status_map = {0: "요청", 1: "진행", 2: "피드백", 3: "완료"}
                task_list = [{
                    "task_id": r[0],
                    "task_name": r[1] or "제목 없음",
                    "status": status_map.get(r[2], "알 수 없음"),
                    "status_code": r[2],
                    "end_date": r[3].strftime("%Y-%m-%d") if r[3] else None,
                    "project_name": r[4],
                    "project_id": r[5]
                } for r in rows]
                
                return JsonResponse({"tasks": task_list, "total": len(task_list), "type": task_type}, status=200)
        except Exception as e:
            print(f"Error fetching task details: {e}")
            return JsonResponse({"message": "서버 오류가 발생했습니다."}, status=500)
    return JsonResponse({"message": "잘못된 요청 방식입니다."}, status=405)



#==============================================================
# 진성 사용 공간
#==============================================================

@csrf_exempt
def save_minutes(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print("DEBUG: 받은 데이터 =", data)

            title = data.get("title")
            content = data.get("content")
            user_id = data.get("user_id")
            project_id = data.get("project_id", 1)

            with connection.cursor() as cursor:
                sql = """
                INSERT INTO Minutes (title, content, user_id, project_id) 
                VALUES (%s, %s, %s, %s)
                """
                # 여기서 int(user_id)로 캐스팅했다면, 
                # (title, content, int(user_id), int(project_id)) 형태일 수도 있음
                cursor.execute(sql, (title, content, user_id, project_id))

            return JsonResponse({"message": "회의록이 저장되었습니다."})
        except Exception as e:
            # 에러 메시지 출력
            print("DEBUG: 에러 =", str(e))
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)
        

@csrf_exempt
def update_minutes(request, minutes_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)
    try:
        data = json.loads(request.body)
        title = data.get("title")
        content = data.get("content")
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE Minutes
                   SET title = %s,
                       content = %s
                 WHERE minutes_id = %s
            """, (title, content, minutes_id))
        return JsonResponse({"message": "회의록이 수정되었습니다."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def delete_minutes(request, minutes_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE 요청만 허용됩니다."}, status=405)
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM Minutes WHERE minutes_id = %s", (minutes_id,))
        return JsonResponse({"message": "회의록이 삭제되었습니다."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ✅ 특정 프로젝트의 회의록 목록 조회 API
def get_minutes_by_project(request, project_id):
    with connection.cursor() as cursor:
        sql = """
        SELECT minutes_id, title, content, created_date 
        FROM Minutes 
        WHERE project_id = %s
        ORDER BY created_date DESC
        """
        cursor.execute(sql, (project_id,))
        minutes = cursor.fetchall()

    minutes_list = [
        {"minutes_id": row[0], "title": row[1], "content": row[2], "created_date": row[3].strftime("%Y-%m-%d %H:%M")}
        for row in minutes
    ]

    return JsonResponse({"minutes": minutes_list}, safe=False, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
def export_minutes_docx(request, minutes_id):
    if request.method != "GET":
        return JsonResponse({"error": "GET 요청만 허용됩니다."}, status=405)

    # 1) DB에서 해당 회의록 조회
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT title, content
              FROM Minutes
             WHERE minutes_id = %s
        """, (minutes_id,))
        row = cursor.fetchone()
    if not row:
        return JsonResponse({"error": "해당 회의록을 찾을 수 없습니다."}, status=404)

    title, html_content = row

    # 2) HTML → DOCX 변환
    base_io = html2docx(html_content, title)
    base_io.seek(0)

    # 3) python-docx 로 열어서 한글 폰트 지정
    doc = Document(base_io)
    style = doc.styles['Normal']
    style.font.name = 'Malgun Gothic'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), 'Malgun Gothic')

    # 4) 메모리 버퍼에 저장
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    # 5) HttpResponse로 반환
    response = HttpResponse(
        buffer.read(),
        content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    response['Content-Disposition'] = f'attachment; filename="{title}.docx"'
    return response


#보고서 저장
@csrf_exempt
def save_report(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            title = data.get("title")
            content = data.get("content")
            user_id = data.get("user_id")
            project_id = data.get("project_id", 1)
            with connection.cursor() as cursor:
                sql = """
                INSERT INTO Report (title, content, user_id, project_id)
                VALUES (%s, %s, %s, %s)
                """
                cursor.execute(sql, (title, content, user_id, project_id))
            return JsonResponse({"message": "보고서가 저장되었습니다."})
        except Exception as e:
            print("Error:", str(e))
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)

def get_reports_by_project(request, project_id):
    with connection.cursor() as cursor:
        sql = """
        SELECT report_id, title, content, created_date 
        FROM Report 
        WHERE project_id = %s
        ORDER BY created_date DESC
        """
        cursor.execute(sql, (project_id,))
        reports = cursor.fetchall()
    reports_list = [
        {"report_id": row[0], "title": row[1], "content": row[2], "created_date": row[3].strftime("%Y-%m-%d %H:%M")}
        for row in reports
    ]
    return JsonResponse({"reports": reports_list}, safe=False, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
def update_report(request, report_id):
    """보고서 수정"""
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다."}, status=405)
    try:
        data = json.loads(request.body)
        title = data.get("title")
        content = data.get("content")
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE Report
                   SET title   = %s,
                       content = %s
                 WHERE report_id = %s
            """, (title, content, report_id))
        return JsonResponse({"message": "보고서가 수정되었습니다."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def delete_report(request, report_id):
    """보고서 삭제"""
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE 요청만 허용됩니다."}, status=405)
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM Report WHERE report_id = %s", (report_id,))
        return JsonResponse({"message": "보고서가 삭제되었습니다."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def export_report_docx(request, report_id):
    if request.method != "GET":
        return JsonResponse({"error": "GET 요청만 허용됩니다."}, status=405)

    # 1) DB에서 해당 리포트 조회
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT title, content 
              FROM Report 
             WHERE report_id = %s
        """, (report_id,))
        row = cursor.fetchone()
    if not row:
        return JsonResponse({"error": "해당 보고서를 찾을 수 없습니다."}, status=404)

    title, html_content = row

    # 2) HTML → DOCX 변환 (BytesIO 리턴)
    base_io = html2docx(html_content, title)
    base_io.seek(0)

    # 3) python-docx로 열어서 한글 폰트 지정
    doc = Document(base_io)
    style = doc.styles['Normal']
    style.font.name = 'Malgun Gothic'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), 'Malgun Gothic')

    # 4) 버퍼에 저장
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    # 5) HttpResponse로 반환
    response = HttpResponse(
        buffer.read(),
        content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    response['Content-Disposition'] = f'attachment; filename="{title}.docx"'
    return response


#==============================================================
# 세준 사용 공간
#==============================================================