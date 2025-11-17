# backend/users/views_notifications.py
from datetime import date, timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from db_model.models import (
    User, Project, ProjectMember,
    Task, TaskManager,
    Comment, DirectMessage, DirectMessageRoom, Message
)

ACTIVE_STATUS_CODES = {1, 2}
URGENT_DAYS = 3

class NotificationsView(APIView):
    def get(self, request):
        uid = request.session.get("user_id")
        if not uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)
        uid = int(uid)

        today = date.today()
        urgent_end = today + timedelta(days=URGENT_DAYS)
        recent_since_dt = timezone.now() - timedelta(days=7)

        # 내가 맡은 task id들
        my_task_ids = list(
            TaskManager.objects.filter(user_id=uid).values_list("task_id", flat=True)
        )

        # ⭐ 먼저 매핑 생성: task_id -> project_id / project_name
        tm_rows = list(
            TaskManager.objects.filter(task_id__in=set(my_task_ids))
            .values("task_id", "project_id")
        )
        task_to_project = {row["task_id"]: row["project_id"] for row in tm_rows}
        pids_from_tasks = {row["project_id"] for row in tm_rows}
        projects_map = dict(
            Project.objects.filter(project_id__in=pids_from_tasks)
            .values_list("project_id", "project_name")
        )

        # (1) 긴급 업무
        urgent_qs = Task.objects.filter(
            task_id__in=my_task_ids,
            status__in=ACTIVE_STATUS_CODES,
            end_date__date__range=(today, urgent_end),
        ).values("task_id", "task_name", "end_date", "status")

        urgent_items = []
        for r in urgent_qs:
            tid = r["task_id"]
            pid = task_to_project.get(tid)
            urgent_items.append({
                "type": "urgent_task",
                "id": tid,
                "title": r["task_name"],
                "due": r["end_date"],
                "status_code": r["status"],
                "created_at": r["end_date"],
                "project_id": pid,
                "project_name": projects_map.get(pid),
            })

        # (2) 내 업무의 최근 댓글(내가 쓴 건 제외)
        comment_qs = (Comment.objects
            .filter(task_id__in=my_task_ids, created_date__gte=recent_since_dt)
            .exclude(user_id=uid)
            .select_related("user", "task")
            .order_by("-created_date")[:30])

        comment_items = []
        for c in comment_qs:
            pid = task_to_project.get(c.task_id)
            comment_items.append({
                "type": "comment",
                "id": c.comment_id,
                "task_id": c.task_id,
                "task_name": getattr(c.task, "task_name", None),
                "author_name": getattr(c.user, "name", "알 수 없음"),
                "content": c.content,
                "created_at": c.created_date,
                "project_id": pid,
                "project_name": projects_map.get(pid),
            })

        # (3) DM(상대가 보낸 것만)
        room_ids = list(
            DirectMessageRoom.objects
            .filter(Q(user1_id=uid) | Q(user2_id=uid))
            .values_list("room_id", flat=True)
        )
        dm_qs = (DirectMessage.objects
                .filter(room_id__in=room_ids, created_date__gte=recent_since_dt)
                .exclude(user_id=uid)
                .select_related("user", "room")
                .order_by("-created_date")[:30])

        dm_items = [{
            "type": "dm",
            "id": dm.message_id,
            "room_id": dm.room_id,
            "from_name": getattr(dm.user, "name", "알 수 없음"),
            "content": dm.content,
            "created_at": dm.created_date,
        } for dm in dm_qs]

        # (4) 그룹 메시지(내가 속한 프로젝트, 내가 쓴 것 제외)
        my_project_ids = list(
            ProjectMember.objects.filter(user_id=uid)
            .values_list("project_id", flat=True)
        )
        proj_name_map = dict(
            Project.objects.filter(project_id__in=my_project_ids)
                   .values_list("project_id", "project_name")
        )

        mode = request.query_params.get("mode")
        msg_filter = Q(project_id__in=my_project_ids, created_date__gte=recent_since_dt) & ~Q(user_id=uid)
        if mode == "mentions":
            me_row = User.objects.filter(user_id=uid).values("name").first()
            myname = me_row["name"] if me_row else ""
            msg_filter &= Q(content__icontains=f"@{myname}") | Q(content__icontains=f"@{uid}")

        group_msg_qs = (Message.objects
            .filter(msg_filter)
            .select_related("user", "project")
            .order_by("-created_date")[:50])

        group_msg_items = [{
            "type": "group_message",
            "id": m.message_id,
            "project_id": m.project_id,
            "project_name": proj_name_map.get(m.project_id),
            "from_name": getattr(m.user, "name", "알 수 없음"),
            "content": m.content,
            "created_at": m.created_date,
        } for m in group_msg_qs]

        # 통합 + 정렬
        items = urgent_items + comment_items + dm_items + group_msg_items
        items.sort(key=lambda x: x["created_at"], reverse=True)
        items = items[:30]

        # ===== full=1 지원(헤더 한방 호출용) =====
        if request.query_params.get("full") == "1":
            me = User.objects.filter(user_id=uid).values("user_id", "name", "profile_image").first()
            # 현재 프로젝트(세션)
            current_project = None
            cur_pid = request.session.get("current_project_id")
            if cur_pid:
                cur = Project.objects.filter(project_id=cur_pid).values("project_id", "project_name").first()
                if cur:
                    current_project = cur
            # 내 프로젝트
            my_projects = list(
                Project.objects.filter(project_id__in=my_project_ids)
                .values("project_id", "project_name")
            )
            return Response({
                "user": me,
                "current_project": current_project,
                "my_projects": my_projects,
                "notifications": items,
            })

        # (호환) 기존 형태
        return Response({"items": items})



# ---------------------기존--------------------
# # backend/users/views_notifications.py
# from datetime import date, timedelta
# from django.db.models import Q, Count
# from rest_framework.views import APIView
# from rest_framework.response import Response

# from db_model.models import (
#     User, Project, ProjectMember, FavoriteProject,
#     Task, TaskManager, Schedule, Log,
#     Comment, DirectMessage, DirectMessageRoom, Message
# )

# # 진행/피드백만 진행 중으로 간주
# ACTIVE_STATUS_CODES = {1, 2}
# URGENT_DAYS = 3

# class NotificationsView(APIView):
#     def get(self, request):
#         uid = request.session.get("user_id")
#         if not uid:
#             return Response({"detail": "로그인이 필요합니다."}, status=401)
#         uid = int(uid)

#         from datetime import date, timedelta
#         from django.utils import timezone
#         today = date.today()
#         urgent_end = today + timedelta(days=URGENT_DAYS)
#         recent_since_dt = timezone.now() - timedelta(days=7)

#         # 내가 맡은 task id들
#         my_task_ids = list(
#             TaskManager.objects.filter(user_id=uid).values_list("task_id", flat=True)
#         )

#         # (1) 긴급 업무
#         urgent_qs = Task.objects.filter(
#             task_id__in=my_task_ids,
#             status__in=ACTIVE_STATUS_CODES,
#             end_date__date__range=(today, urgent_end),
#         ).values("task_id", "task_name", "end_date", "status")

#         # (1) 긴급 업무
#         urgent_items = []
#         for r in urgent_qs:
#             tid = r["task_id"]
#             pid = task_to_project.get(tid)
#             urgent_items.append({
#                 "type": "urgent_task",
#                 "id": tid,
#                 "title": r["task_name"],
#                 "due": r["end_date"],
#                 "status_code": r["status"],
#                 "created_at": r["end_date"],
#                 "project_id": pid,                               # ★ 추가
#                 "project_name": projects.get(pid),               # (기존)
#             })

#         # task_id → project_name 매핑 (긴급/댓글 공용)
#         tm_rows = list(TaskManager.objects.filter(task_id__in=set(my_task_ids))
#                        .values("task_id", "project_id"))
#         task_to_project = {row["task_id"]: row["project_id"] for row in tm_rows}
#         pids_from_tasks = {row["project_id"] for row in tm_rows}
#         projects = dict(Project.objects.filter(project_id__in=pids_from_tasks)
#                         .values_list("project_id", "project_name"))

#         for it in urgent_items:
#             pid = task_to_project.get(it["id"])
#             it["project_name"] = projects.get(pid)

#         # (2) 내 업무에 달린 최근 댓글(내가 쓴 건 제외)
#         comment_qs = (Comment.objects
#             .filter(task_id__in=my_task_ids, created_date__gte=recent_since_dt)
#             .exclude(user_id=uid)
#             .select_related("user", "task")
#             .order_by("-created_date")[:30])

#         # (2) 댓글
#         comment_items = []
#         for c in comment_qs:
#             pid = task_to_project.get(c.task_id)
#             comment_items.append({
#                 "type": "comment",
#                 "id": c.comment_id,
#                 "task_id": c.task_id,
#                 "task_name": getattr(c.task, "task_name", None),
#                 "author_name": getattr(c.user, "name", "알 수 없음"),
#                 "content": c.content,
#                 "created_at": c.created_date,
#                 "project_id": pid,                               # ★ 추가
#                 "project_name": projects.get(pid),
#             })

#         # (3) DM(상대가 보낸 것만)
#         room_ids = list(DirectMessageRoom.objects
#                         .filter(Q(user1_id=uid) | Q(user2_id=uid))
#                         .values_list("room_id", flat=True))
#         dm_qs = (DirectMessage.objects
#                 .filter(room_id__in=room_ids, created_date__gte=recent_since_dt)
#                 .exclude(user_id=uid)
#                 .select_related("user", "room")
#                 .order_by("-created_date")[:30])

#         dm_items = [{
#             "type": "dm",
#             "id": dm.message_id,
#             "room_id": dm.room_id,
#             "from_name": getattr(dm.user, "name", "알 수 없음"),
#             "content": dm.content,
#             "created_at": dm.created_date,
#         } for dm in dm_qs]

#         # ✅ (4) 단체 채팅(프로젝트 메시지) — 내가 속한 프로젝트의 최근 메시지(내가 쓴 건 제외)
#         my_project_ids = list(
#             ProjectMember.objects.filter(user_id=uid).values_list("project_id", flat=True)
#         )
#         proj_name_map = dict(
#             Project.objects.filter(project_id__in=my_project_ids)
#                    .values_list("project_id", "project_name")
#         )

#         # 기본: 최근 7일, 내가 쓴 메시지 제외
#         # (옵션: mentions 모드 지원) ?mode=mentions → @내이름 포함만
#         mode = request.query_params.get("mode")
#         msg_filter = Q(project_id__in=my_project_ids, created_date__gte=recent_since_dt) & ~Q(user_id=uid)
#         if mode == "mentions":
#             # @이름, 또는 @user_id 같은 간단한 규칙 (원하면 정교화 가능)
#             me = User.objects.filter(user_id=uid).values("name").first()
#             myname = me["name"] if me else ""
#             msg_filter &= Q(content__icontains=f"@{myname}") | Q(content__icontains=f"@{uid}")

#         group_msg_qs = (Message.objects
#             .filter(msg_filter)
#             .select_related("user", "project")
#             .order_by("-created_date")[:50])

#         group_msg_items = [{
#             "type": "group_message",
#             "id": m.message_id,
#             "project_id": m.project_id,
#             "project_name": proj_name_map.get(m.project_id),
#             "from_name": getattr(m.user, "name", "알 수 없음"),
#             "content": m.content,
#             "created_at": m.created_date,
#         } for m in group_msg_qs]

#         # 통합 + 정렬
#         items = urgent_items + comment_items + dm_items + group_msg_items
#         items.sort(key=lambda x: x["created_at"], reverse=True)
#         items = items[:30]

#         return Response({"items": items})