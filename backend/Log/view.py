from rest_framework.decorators import api_view
from rest_framework.response import Response
from db_model.models import Log      # Log 모델만 import
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q, F, Value, CharField

# ──────────────────────────────────────────
# ① 프로젝트별 로그 조회
# ──────────────────────────────────────────
@api_view(["GET"])
def get_project_logs(request, project_id):
    """
    • FK(task_id) 가 NULL 이라도 content 에 [task_id=] 스냅샷이 있으면 포함
    • INNER JOIN → OR 조건으로 대체 (union 사용 X → 500 방지)
    """
    logs = (
        Log.objects
        .filter(
            Q(task__taskmanager__project_id=project_id) |               # FK 살아있음
            Q(task_id__isnull=True, content__icontains='[task_id=')     # 스냅샷 로그
        )
        .select_related("user", "task")
        .annotate(                       # 화면에서 바로 쓸 수 있게 별칭 생성
            user_name = F("user__name"),
            task_name = F("task__task_name"),
        )
        .order_by("-created_date")
    )

    data = [
        {
            "log_id"      : l.log_id,
            "created_date": l.created_date.strftime("%Y-%m-%d %H:%M:%S"),
            "action"      : l.action,
            "content"     : l.content,
            "user_name"   : l.user_name or "알 수 없음",
            "task_name"   : l.task_name,        # NULL 가능
        }
        for l in logs
    ]
    return Response(data, status=200)


# ──────────────────────────────────────────
# ② 공통 로그 기록 함수
# ──────────────────────────────────────────
# def create_log(action, content, user=None, task=None, comment=None):
#     """
#     ForeignKey 인스턴스를 그대로 받아 Log 레코드 생성.
#     별도 try-except가 필요 없을 만큼 스키마가 맞춰졌으므로
#     예외가 나면 그 자체가 개발 버그다 → 그대로 터뜨려서 잡는 편이 좋다.
#     """
#     Log.objects.create(
#         action   = action,
#         content  = content,
#         user     = user,
#         task     = task,
#         comment  = comment
#     )


# 수정 후
# def create_log(action, content, user=None, task=None, comment=None):
#     print("🟡 create_log() 호출 — action:", action,
#           "| user =", user, "| is_auth =", getattr(user, "is_authenticated", "N/A"))

#     # ↓ 나머지 코드 그대로

#     """
#     user가 None 이거나 미인증이면 user_id=NULL 로 기록
#     """
#     if user and not getattr(user, "is_authenticated", False):
#         user = None  # 방어 코드

#     return Log.objects.create(
#         action  = action,
#         content = content,
#         user    = user,
#         task    = task,
#         comment = comment,
#     )


def create_log(action, content, user=None, task=None, comment=None):
    """
    AnonymousUser → NULL 로 저장
    일반 User 인스턴스(PK 존재) → 그대로 저장
    """
    if isinstance(user, AnonymousUser):
        user = None

    return Log.objects.create(
        action  = action,
        content = content,
        user    = user,      # ← 이제 NULL 로 바뀌지 않음
        task    = task,
        comment = comment,
    )