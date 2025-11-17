# backend/users/views_project.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from db_model.models import Log, TaskManager, Project, FavoriteProject, ProjectMember

MAX_FAVORITES = 3

class ProjectLogsView(APIView):
    # permission_classes = [IsAuthenticated]  # 세션 직접 확인으로 통일한다면 주석
    def get(self, request, project_id: int):
        # 🔐 세션 사용자 확인(선택)
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)

        # 🔐 프로젝트 멤버인지 확인(선택)
        is_member = ProjectMember.objects.filter(
            user_id=session_uid, project_id=project_id
        ).exists()
        if not is_member:
            return Response({"detail": "권한이 없습니다."}, status=403)

        task_ids = TaskManager.objects.filter(project_id=project_id).values_list('task_id', flat=True)
        logs_qs = (
            Log.objects
              .filter(Q(task_id__in=task_ids))
              .select_related('user', 'task')
              .order_by('-created_date')[:50]
        )

        data = [{
            "user_name":    (log.user.name if log.user else "알 수 없음"),
            "action":       log.action,
            "created_date": log.created_date,
            "task_name":    (log.task.task_name if log.task else None),
            "content":      (log.content or "")
        } for log in logs_qs]
        return Response(data)


class FavoriteToggleView(APIView):
    # permission_classes = [IsAuthenticated]  # 세션 직접 확인으로 통일한다면 주석

    def post(self, request, user_id: int, project_id: int):
        # 🔐 세션 사용자 검증
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)
        if int(session_uid) != int(user_id):
            return Response({"detail": "권한이 없습니다."}, status=403)

        # 🔐 프로젝트 멤버인지 확인(선택)
        if not ProjectMember.objects.filter(user_id=user_id, project_id=project_id).exists():
            return Response({"detail": "멤버가 아닌 프로젝트입니다."}, status=403)

        # 🔐 서버에서도 최대 3개 제한 강제
        current_count = FavoriteProject.objects.filter(user_id=user_id).count()
        if current_count >= MAX_FAVORITES:
            return Response({"detail": f"즐겨찾기는 최대 {MAX_FAVORITES}개까지 가능합니다."}, status=400)

        FavoriteProject.objects.get_or_create(user_id=user_id, project_id=project_id)
        return Response({"message": "favorited", "favorited": True})

    def delete(self, request, user_id: int, project_id: int):
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)
        if int(session_uid) != int(user_id):
            return Response({"detail": "권한이 없습니다."}, status=403)

        FavoriteProject.objects.filter(user_id=user_id, project_id=project_id).delete()
        return Response({"message": "unfavorited", "favorited": False})


class CurrentProjectGetView(APIView):
    # permission_classes = [IsAuthenticated]
    def get(self, request):
        # (선택) 세션 사용자 체크하고 반환
        if not request.session.get("user_id"):
            return Response({"detail": "로그인이 필요합니다."}, status=401)
        pid = request.session.get('current_project_id')
        return Response({"project_id": pid})


class CurrentProjectSetView(APIView):
    # permission_classes = [IsAuthenticated]
    def post(self, request):
        if not request.session.get("user_id"):
            return Response({"detail": "로그인이 필요합니다."}, status=401)

        pid = request.data.get('project_id')
        try:
            pid = int(pid)
        except:
            return Response({"detail": "Invalid project_id"}, status=400)

        if not Project.objects.filter(project_id=pid).exists():
            return Response({"detail": "Project not found"}, status=404)

        request.session['current_project_id'] = pid
        request.session.modified = True
        return Response({"message": "current project set", "project_id": pid})
