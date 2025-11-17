import datetime
from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils.timezone import make_aware, localtime
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .serializers import TaskSerializer, TaskNameSerializer, TaskManagerSerializer
from rest_framework.exceptions import PermissionDenied
from rest_framework.authentication import SessionAuthentication
from Log.view import create_log  # 로그 기록 함수

from comments.serializers import FileSerializer 
import logging

from db_model.models import (
    Task, 
    User, 
    Project, 
    FavoriteProject,
    TaskManager, 
    File,
)

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """SessionAuthentication + CSRF 무시(B안 전용)"""
    def enforce_csrf(self, request):
        return 
    
def cascade_complete(task, log_user, status_label):
    """
    자식들이 모두 완료이면 부모를 완료로 올려 주는 재귀 함수
    (부모 상태가 이미 3이면 건너뜀)
    """
    parent = task.parent_task 
    while parent:
        # 아직 완료되지 않은 자식이 하나라도 있으면 중단
        if Task.objects.filter(parent_task=parent).exclude(status=3).exists():
            break
        # 부모를 완료로 변경
        if parent.status != 3:
            old = parent.status
            parent.status = 3
            parent.save(update_fields=["status"])

            # 로그 남기기
            old_label = status_label.get(old, str(old))
            create_log(
                action  = "업무 상태 변경",
                content = f"{old_label} → 완료",
                user    = log_user,
                task    = parent,
            )
            # 한 단계 더 위로
            parent = parent.parent_task
    
# 수정 후  ⬇  (★추가된 부분 주목)
def get_log_user(request):
    print("💡 request.data  =", request.data)            # ← 추가
    print("💡 query_params =", request.query_params)  
    """
    ① 세션‧JWT 인증되면 request.user 사용
    ② 아니면 프런트에서 실어 보낸 user_id(param·body)로 대체
    """
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False):
        return user          # ← 정상 로그인

    # ────── ★ 여기부터 fallback ──────
    # PATCH/POST/DELETE body → request.data
    uid = request.data.get("user") if hasattr(request, "data") else None
    # GET·DELETE 쿼리스트링 → request.query_params
    uid = uid or request.query_params.get("user")
    if uid:
        return User.objects.filter(pk=uid).first()
    # ─────────────────────────────────

    return None              # 둘 다 없으면 None


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    pagination_class = None  # 페이징 비활성화

    def get_queryset(self):
        """
        우선순위: 
        1) URL 파라미터 self.kwargs['project_id'] 
        2) ?project_id=... 쿼리 파라미터
        3) 세션에 저장된 project_id 
        """
        url_project_id = self.kwargs.get('project_id')
        if url_project_id:
            return Task.objects.filter(taskmanager__project_id=url_project_id)

        query_project_id = self.request.query_params.get('project_id')
        if query_project_id:
            return Task.objects.filter(taskmanager__project_id=query_project_id)

        session_project_id = self.request.session.get('project_id')
        if session_project_id:
            return Task.objects.filter(taskmanager__project_id=session_project_id)

        return Task.objects.none()


@api_view(['POST', 'DELETE'])
def toggle_favorite_project(request, user_id, project_id):
    user = get_object_or_404(User, pk=user_id)
    project = get_object_or_404(Project, pk=project_id)
    
    if request.method == 'POST':
        current_favorites_count = FavoriteProject.objects.filter(user=user).count()
        if current_favorites_count >= 3:
            return Response({"message": "최대 3개의 즐겨찾기를 등록할 수 있습니다."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            favorite, created = FavoriteProject.objects.get_or_create(user=user, project=project)
            if created:
                return Response({"message": "즐겨찾기에 추가되었습니다."},
                                status=status.HTTP_201_CREATED)
            else:
                return Response({"message": "이미 즐겨찾기되어 있습니다."},
                                status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "즐겨찾기 추가 중 오류 발생.", "details": str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        favorite = FavoriteProject.objects.filter(user=user, project=project)
        if favorite.exists():
            favorite.delete()
            return Response({"message": "즐겨찾기에서 제거되었습니다."},
                            status=status.HTTP_200_OK)
        else:
            return Response({"message": "즐겨찾기 되어있지 않습니다."},
                            status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_user_projects_with_favorite(request, user_id):
    print(f"📡 API 요청됨 (with favorite): user_id={user_id}")
    user = get_object_or_404(User, pk=user_id)
    
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 
                p.project_id, 
                p.project_name, 
                COALESCE(
                    (SELECT m.created_date FROM Message m 
                     WHERE m.project_id = p.project_id 
                     ORDER BY m.created_date DESC 
                     LIMIT 1), NULL
                ) AS latest_message_time,
                CASE WHEN EXISTS (
                    SELECT 1 FROM FavoriteProject fp 
                    WHERE fp.project_id = p.project_id AND fp.user_id = %s
                ) THEN TRUE ELSE FALSE END AS is_favorite
            FROM ProjectMember pm
            JOIN Project p ON pm.project_id = p.project_id
            WHERE pm.user_id = %s 
              AND p.project_name IS NOT NULL
            """,
            [user_id, user_id]
        )
        
        projects = []
        for row in cursor.fetchall():
            project_id, project_name, latest_message_time, is_favorite = row
            if latest_message_time:
                if (isinstance(latest_message_time, datetime.datetime)
                        and latest_message_time.tzinfo is None):
                    latest_message_time = make_aware(latest_message_time)
                latest_message_time = localtime(latest_message_time).strftime('%Y-%m-%d %H:%M:%S')
            projects.append({
                "project_id": project_id,
                "project_name": project_name,
                "latest_message_time": latest_message_time,
                "is_favorite": is_favorite,
            })
    print(f"📡 조회된 프로젝트 목록 (with favorite): {projects}")
    if not projects:
        return Response({"error": "해당 사용자가 속한 프로젝트가 없습니다."},
                        status=status.HTTP_404_NOT_FOUND)
    return Response({"projects": projects})


@api_view(['GET'])
def project_progress(request, user_id, project_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) FROM ProjectMember WHERE user_id = %s AND project_id = %s",
            [user_id, project_id]
        )
        membership_count = cursor.fetchone()[0]
    
    if membership_count == 0:
        return Response({"error": "해당 프로젝트의 팀원이 아닙니다."},
                        status=status.HTTP_404_NOT_FOUND)
    
    tasks = TaskManager.objects.filter(project_id=project_id)
    total_tasks = tasks.count()
    completed_tasks = tasks.filter(task__status='3').count()
    progress_percent = round(completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    data = {
        'project_id': project_id,
        'progress': progress_percent,
        'completed_tasks': completed_tasks,
        'total_tasks': total_tasks,
    }
    return Response(data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
def update_task_direct(request, task_id):
    """
    task 업데이트 시, assignee (담당자) 값이 변경되면, 
    관련 TaskManager 레코드의 user_id도 변경하도록 처리합니다.
    """
    print(f"update_task_direct called with task_id: {task_id}")
    task = get_object_or_404(Task, pk=task_id)
    serializer = TaskSerializer(task, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        # 만약 assignee 값이 요청에 포함되어 있다면, TaskManager 업데이트
        if 'assignee' in request.data:
            new_assignee_name = request.data['assignee']
            # 새로운 담당자 이름으로 User 객체 조회 (User 모델 필드 이름 확인)
            new_user = User.objects.filter(name=new_assignee_name).first()
            if new_user:
                # TaskManager 모델에서 해당 task의 레코드 업데이트 (task와의 관계로 필터링)
                TaskManager.objects.filter(task=task).update(user_id=new_user)
        task.refresh_from_db()
        print(f"[DEBUG] 업데이트 후 task.status: {task.status}")
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_team_members(request):
    """
    프로젝트 ID를 기반으로 팀원(프로젝트 멤버) 목록을 반환합니다.
    요청 예: GET /api/team-members/?project_id=287
    반환 예: [{ "user_id": 1, "name": "홍길동" }, {...}]
    (Django ORM 대신 raw SQL 사용)
    """
    project_id = request.query_params.get('project_id')
    if not project_id:
        return Response({"error": "project_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        project_id_int = int(project_id)
    except ValueError:
        return Response({"error": "Invalid project_id."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT u.user_id, u.name 
                FROM ProjectMember pm 
                JOIN User u ON pm.user_id = u.user_id 
                WHERE pm.project_id = %s
            """, [project_id_int])
            rows = cursor.fetchall()
    except Exception as e:
        return Response({"error": "Error retrieving project members.", "details": str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    data = []
    for row in rows:
        user_id, name = row
        data.append({
            "user_id": user_id,
            "name": name,
        })
    return Response(data, status=status.HTTP_200_OK)

logger = logging.getLogger(__name__)
@api_view(['PATCH'])
def change_task_name(request, task_id):
    """
    PATCH /api/tasks/<task_id>/change-name/
    BODY: { "task_name": "새 하위업무 이름" }
    """
    task = get_object_or_404(Task, pk=task_id)
    old_name = task.task_name
    new_name = request.data.get('task_name')
    if not new_name:
        return Response(
            {"error": "task_name 파라미터가 필요합니다."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = TaskNameSerializer(task, data={'task_name': new_name}, partial=True)
    if serializer.is_valid():
        serializer.save()

        # ✅ 로그 생성
        create_log(
            action="업무명 변경",
            content=f"{old_name} → {new_name}",
            user=request.user,
            task=task
        )

        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskNoProjectViewSet(viewsets.ModelViewSet):
    queryset         = Task.objects.all()
    serializer_class = TaskSerializer
    lookup_field     = "task_id"

    authentication_classes = [CsrfExemptSessionAuthentication]   # ★
    permission_classes     = []      

    # 생성 시
    # views.py ─ perform_create() 교체 부분만
    def perform_create(self, serializer):
        task       = serializer.save()
        project_id = self.request.data.get("project_id")
        log_user   = get_log_user(self.request)

        if log_user is None:
            raise PermissionDenied("로그인이 필요합니다.")

        if project_id:
            TaskManager.objects.create(project_id=project_id, task=task, user=log_user)

        # ── 상·하위 구분: task.parent_task FK 로 직접 판단 ──
        action_label = "하위 업무 생성" if task.parent_task_id else "상위 업무 생성"

        create_log(
            action  = action_label,
            content = f"[task_id={task.task_id}] {task.task_name} 업무 생성",
            user    = log_user,
            task    = task,
        )


    # ---------------------------------------------
    # ① 수정(상태·담당자)
    # ---------------------------------------------

    STATUS_LABEL = {
        0: "요청",  "0": "요청",
        1: "진행",  "1": "진행",
        2: "피드백","2": "피드백",
        3: "완료",  "3": "완료",
    }

    def perform_update(self, serializer):
        """
        - 로그인 확인
        - 상태 변경 시 로그
        - 담당자 변경 시 TaskManager 갱신 + 로그
        """
        req  = self.request
        log_user = get_log_user(req)
        print("💡 log_user =", log_user)  
        # ✅ 1. 로그인 사용자 필수
        if log_user is None:
            raise PermissionDenied("로그인이 필요합니다.")

        # ✅ 2. 실제 업데이트
        task        = self.get_object()
        old_status  = task.status
        task        = serializer.save()

        # 2-1) 상태 변경 로그
        if "status" in req.data and old_status != task.status:
            old_label = self.STATUS_LABEL.get(old_status, str(old_status))
            new_label = self.STATUS_LABEL.get(task.status, str(task.status))

            create_log(
                action  = "업무 상태 변경",
                content = f"{old_label} → {new_label}",   # 숫자 대신 한글
                user    = log_user,
                task    = task
            )

            # ★ 모든 하위가 완료인지 확인하고 부모 상태 올리기
            if int(task.status) == 3:
                cascade_complete(task, log_user, self.STATUS_LABEL)

        # 2-2) 담당자 변경 처리 & 로그
        if "assignee" in req.data:
            new_name = req.data["assignee"].strip()
            if new_name:                                             # 빈 문자열 방지
                new_user = User.objects.filter(name=new_name).first()
                tm       = TaskManager.objects.filter(task=task).first()
                old_user = tm.user if tm else None

                if tm and new_user and new_user != old_user:
                    tm.user = new_user
                    tm.save()

                    create_log(
                        action  = "담당자 변경",
                        content = f"{old_user.name if old_user else '없음'} → {new_user.name}",
                        user    = log_user,
                        task    = task
                    )

    # ---------------------------------------------
    # ② 삭제(DELETE) 시 로그 기록
    # ---------------------------------------------
    def perform_destroy(self, instance):
        """
        - 로그인 확인
        - 삭제 로그 남긴 뒤 실제 삭제
        """
        log_user = get_log_user(self.request)

        # ✅ 1. 로그인 사용자 필수
        if log_user is None:
            raise PermissionDenied("로그인이 필요합니다.")

        action_label = "하위 업무 삭제" if instance.parent_task_id else "상위 업무 삭제"
        
        # ✅ 2. 삭제 로그
        create_log(
            action  = action_label,
            content = f"[task_id={instance.task_id}] {instance.task_name} 업무가 삭제됨",
            user    = log_user,
            task    = None          # ← FK 비움 → SET NULL 영향 없음
        )


        # ✅ 3. 실제 삭제
        super().perform_destroy(instance)


    def update(self, request, *args, **kwargs):
        """
        1) perform_update()로 자식+cascade 완료 처리
        2) 완료된 부모들의 task_id 리스트를 'cascaded' 로 응답
        """
        partial  = kwargs.pop('partial', False)
        instance = self.get_object()

        # ① 직전 상태 저장
        old_status = instance.status

        # ② perform_update() 호출 (여기서 cascade_complete도 돌려줌)
        serializer = self.get_serializer(instance,
                                        data=request.data,
                                        partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        updated = serializer.instance  # 상태가 바뀐 Task 인스턴스
            
        # ③ 완료로 바뀐 부모(ID) 모으기
        cascaded = []
        parent = updated.parent_task
        while parent:
            if parent.status == 3:
                cascaded.append(parent.task_id)
            parent = parent.parent_task

        # ④ 응답 데이터에 포함
        data = serializer.data
        data['cascaded'] = cascaded
        return Response(data)


@api_view(['POST'])
def create_task_manager(request):
    """
    POST /api/task-managers/
    BODY: {
      "user":     <user_id>,
      "project":  <project_id>,
      "task":     <task_id>
    }
    """
    serializer = TaskManagerSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def get_descendant_task_ids(root_id: int) -> list[int]:
    """
    root_id 포함하여 모든 하위 task_id를 리스트로 반환
    (MySQL5.x도 동작. 인덱스: Task(parent_task_id) 필요)
    """
    ids = {root_id}
    frontier = [root_id]
    while frontier:
        children = list(
            Task.objects
                .filter(parent_task_id__in=frontier)
                .values_list("task_id", flat=True)
        )
        new_ones = [t for t in children if t not in ids]
        if not new_ones:
            break
        ids.update(new_ones)
        frontier = new_ones
    return list(ids)


# @api_view(['GET'])
# def task_files(request):
#     """
#     GET /api/task-files/?task_id=17&include_children=true
#     - include_children=true 이면 자식/손자까지 모두 포함해서 File 반환
#     - false/생략이면 해당 task_id에 매달린 파일만 반환
#     """
#     task_id = request.query_params.get('task_id')
#     if not task_id:
#         return Response({"error": "task_id 누락"}, status=status.HTTP_400_BAD_REQUEST)

#     include_children = str(request.query_params.get('include_children', '')).lower() in ('1', 'true', 'yes')

#     try:
#         task_id = int(task_id)
#     except ValueError:
#         return Response({"error": "잘못된 task_id"}, status=400)

#     try:
#         if include_children:
#             ids = get_descendant_task_ids(task_id)  # 모든 하위 포함
#         else:
#             ids = [task_id]

#         qs = (
#             File.objects
#                 .select_related("user")          # author 이름 N+1 방지
#                 .filter(task_id__in=ids)
#                 .order_by("-created_date")
#         )

#         # created_date에 TZ가 없을 수 있으니 serializer를 쓰는 게 안전
#         data = FileSerializer(qs, many=True).data
#         return Response(data, status=200)

#     except Exception as e:
#         logging.getLogger(__name__).exception("task_files error")
#         return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def task_files(request):
    task_id = request.query_params.get("task_id")
    project_id = request.query_params.get("project_id")  # 선택: 프론트에서 같이 보내면 스코프 보장
    include_children = str(request.query_params.get("include_children","")).lower() in ("1","true","yes")

    if not task_id:
        return Response({"error":"task_id 누락"}, status=400)

    # 자식 미포함이면 ORM 그대로
    if not include_children:
        from db_model.models import File
        from comments.serializers import FileSerializer
        qs = (File.objects.select_related("user")
              .filter(task_id=task_id)
              .order_by("-created_date"))
        return Response(FileSerializer(qs, many=True).data, status=200)

    # 자식 포함: 재귀 CTE
    if not project_id:
        # 프로젝트 스코프 없이도 가능하지만, 정합성상 권장: project_id 전달
        # 필요 없다면 아래 SQL을 '프로젝트 조건 없는 버전'으로 바꿔 써도 됨.
        return Response({"error":"project_id 권장 (스코프 보장)"}, status=400)

    sql = """
    WITH RECURSIVE t AS (
      SELECT tm.task_id
      FROM TaskManager tm
      WHERE tm.project_id = %s
        AND tm.task_id    = %s
      UNION ALL
      SELECT c.task_id
      FROM Task c
      JOIN t ON c.parent_task_id = t.task_id
      JOIN TaskManager tm2 ON tm2.task_id = c.task_id
                          AND tm2.project_id = %s
    )
    SELECT
      f.file_id,
      f.file_name,
      f.created_date,
      f.user_id,
      u.name AS author
    FROM File f
    JOIN t   ON f.task_id = t.task_id
    JOIN User u ON u.user_id = f.user_id
    ORDER BY f.created_date DESC
    """
    with connection.cursor() as cur:
        cur.execute(sql, [project_id, task_id, project_id])
        rows = cur.fetchall()

    data = [{
        "file_id":      r[0],
        "file_name":    r[1],
        "created_date": r[2].isoformat() if r[2] else None,
        "user":         r[3],
        "author":       r[4],
    } for r in rows]
    return Response(data, status=200)