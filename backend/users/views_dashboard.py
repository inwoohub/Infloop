# backend/users/views_dashboard.py
from datetime import date, timedelta
from calendar import monthrange

from django.db.models import Count, Exists, OuterRef, Q, Max
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

# ⬇️ 모델 import 경로: 네가 모델을 db_model에 두었으므로 이렇게
from db_model.models import (
    User, Project, ProjectMember, FavoriteProject,
    Task, TaskManager, Schedule, Log
)

# ✅ 상태 코드 통일: 0=요청, 1=진행, 2=피드백, 3=완료
DONE_STATUSES         = {3}
ACTIVE_STATUS_CODES   = {0, 1, 2}   # 요청/진행/피드백 = 미완료 전부
INCOMPLETE_STATUS     = {0, 1}      # "미완료된 업무" = 요청+진행 (피드백 제외)
FEEDBACK_STATUS       = {2}         # "피드백 필요한 업무"
URGENT_DAYS           = 3



def month_bounds(yyyy_mm: str | None):
    # ✅ naive/aware 충돌 피하려고 date.today()만 사용
    if yyyy_mm:
        y, m = map(int, yyyy_mm.split('-'))
        first = date(y, m, 1)
    else:
        t = date.today()
        first = date(t.year, t.month, 1)
    last = monthrange(first.year, first.month)[1]
    return first, date(first.year, first.month, last)

class DashboardView(APIView):
    def get(self, request, user_id: int):
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)
        if int(session_uid) != int(user_id):
            return Response({"detail": "권한이 없습니다."}, status=403)

        month = request.query_params.get('month')
        start_d, end_d = month_bounds(month)

        user = User.objects.filter(user_id=user_id).values('user_id', 'name').first()
        if not user:
            return Response({"detail": "User not found"}, status=404)

        # ✅ 오늘 날짜도 naive date로 통일
        today = date.today()

        project_ids_qs = ProjectMember.objects.filter(user_id=user_id)\
                           .values_list('project_id', flat=True)

        fav_exists = FavoriteProject.objects.filter(
            user_id=user_id, project_id=OuterRef('project_id')
        )
        projects_qs = (Project.objects
            .filter(project_id__in=project_ids_qs)
            .annotate(is_fav=Exists(fav_exists))
            .values('project_id', 'project_name', 'is_fav'))

        total_by_project = dict(
            TaskManager.objects.filter(project_id__in=project_ids_qs)
            .values('project_id').annotate(cnt=Count('task', distinct=True))
            .values_list('project_id', 'cnt')
        )
        done_task_ids = Task.objects.filter(status__in=DONE_STATUSES)\
                          .values_list('task_id', flat=True)
        done_by_project = dict(
            TaskManager.objects.filter(project_id__in=project_ids_qs, task_id__in=done_task_ids)
            .values('project_id').annotate(cnt=Count('task', distinct=True))
            .values_list('project_id', 'cnt')
        )

        # ✅ 진행 중 업무 수(프로젝트별)
        active_by_project = dict(
            TaskManager.objects
            .filter(
                project_id__in=project_ids_qs,
                task__status__in=ACTIVE_STATUS_CODES  # ← 여기 핵심!
            )
            .values('project_id')
            .annotate(cnt=Count('task', distinct=True))
            .values_list('project_id', 'cnt')
        )

        # ✅ 프로젝트 마감일: 프로젝트 내 업무들의 최대 end_date(없으면 None)
        deadline_by_project = dict(
            TaskManager.objects
            .filter(project_id__in=project_ids_qs)
            .values('project_id')
            .annotate(deadline=Max('task__end_date'))
            .values_list('project_id', 'deadline')
        )

        projects_payload = []
        for p in projects_qs:
            pid   = p['project_id']
            total = total_by_project.get(pid, 0)
            done  = done_by_project.get(pid, 0)
            progress = int((done * 100) / total) if total else 0

            ongoing = active_by_project.get(pid, 0)

            # ✅ deadline 타입 안전 처리(date/datetime/None 모두 커버)
            dl = deadline_by_project.get(pid)
            if dl:
                dldate = dl.date() if hasattr(dl, "date") else dl
                remaining_days = (dldate - today).days
            else:
                remaining_days = None

            projects_payload.append({
                "project_id":     pid,
                "project_name":   p['project_name'],
                "is_favorite":    bool(p['is_fav']),
                "progress":       progress,
                "ongoing_tasks":  ongoing,          # 프론트에서 사용
                "remaining_days": remaining_days,   # 프론트에서 사용
            })

        # (생략) today = date.today()
        my_task_ids = set(
            TaskManager.objects.filter(user_id=user_id).values_list('task_id', flat=True)
        )

        # 내가 맡은 업무 전체(상태 무관)
        my_tasks_count   = Task.objects.filter(task_id__in=my_task_ids).count()
        # 완료
        completed_count  = Task.objects.filter(task_id__in=my_task_ids, status__in=DONE_STATUSES).count()
        # 미완료(요청+진행)
        incomplete_count = Task.objects.filter(task_id__in=my_task_ids, status__in=INCOMPLETE_STATUS).count()
        # 피드백 필요한 업무
        feedback_count   = Task.objects.filter(task_id__in=my_task_ids, status__in=FEEDBACK_STATUS).count()

        urgent_end = today + timedelta(days=URGENT_DAYS)
        urgent_count = Task.objects.filter(
            task_id__in=my_task_ids,
            status__in=ACTIVE_STATUS_CODES,               # ✅ 숫자 코드 사용
            end_date__date__range=(today, urgent_end)
        ).count()

        my_project_ids = set(
            ProjectMember.objects.filter(user_id=user_id).values_list('project_id', flat=True)
        )

        # ✅ 그 프로젝트들에 속한 모든 task_id
        project_task_ids = set(
            TaskManager.objects.filter(project_id__in=my_project_ids).values_list('task_id', flat=True)
        )

        # ✅ 내가 담당인 task_id (제외용)
        my_assigned_task_ids = set(
            TaskManager.objects.filter(user_id=user_id).values_list('task_id', flat=True)
        )

        # ✅ 피드백 필요한 업무(다른 사람 것만)
        feedback_count = Task.objects.filter(
            task_id__in=project_task_ids,
            status=2
        ).exclude(task_id__in=my_assigned_task_ids).count()

        task_stats = {
            "my_tasks":          my_tasks_count,
            "completed_tasks":   completed_count,
            "incomplete_tasks":  incomplete_count,
            "feedback_tasks":    feedback_count,   # ← 여기 교체!
            "urgent_tasks":      urgent_count,
        }


        recent_logs_qs = Log.objects.select_related('user', 'task').order_by('-created_date')[:20]
        recent_logs = [{
            "user_name":    (log.user.name if log.user else "알 수 없음"),
            "action":       log.action,
            "created_date": log.created_date,
            "task_name":    (log.task.task_name if log.task else None),
            "content":      (log.content or "")
        } for log in recent_logs_qs]

        my_calendar_qs = (Schedule.objects
            .filter(user_id=user_id, start_time__range=(start_d, end_d))
            .values('schedule_id', 'start_time', 'title'))
        my_calendar = [{"date": r['start_time'], "schedule_id": r['schedule_id'], "title": r['title']}
                       for r in my_calendar_qs]

        team_task_ids = TaskManager.objects.filter(project_id__in=project_ids_qs)\
                                           .values_list('task_id', flat=True)
        team_calendar_qs = (Task.objects
            .filter(task_id__in=team_task_ids, end_date__date__range=(start_d, end_d))
            .values('task_id', 'task_name', 'end_date'))
        team_calendar = [{"date": r['end_date'], "task_id": r['task_id'], "task_name": r['task_name']}
                         for r in team_calendar_qs]

        return Response({
            "user": {"user_id": user['user_id'], "name": user['name']},
            "projects": projects_payload,
            "task_stats": task_stats,
            "recent_logs": recent_logs,
            "calendar": {"my": my_calendar, "team": team_calendar}
        })



class TaskDetailsView(APIView):
    def get(self, request):
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)

        t = request.query_params.get('type')   # 'my' | 'incomplete' | 'feedback' | 'urgent' | 'completed'
        if t not in ('my', 'incomplete', 'feedback', 'urgent', 'completed'):
            return Response({"detail": "Invalid type"}, status=400)
        
        my_task_ids = TaskManager.objects.filter(user_id=session_uid).values_list('task_id', flat=True)
        qs = Task.objects.filter(task_id__in=my_task_ids)

        if t == 'my':
            # ✅ 상태 필터 없음: 내가 맡은 모든 업무
            pass
        elif t == 'incomplete':
            qs = qs.filter(status__in=INCOMPLETE_STATUS)     # 0,1
        elif t == 'feedback':
            qs = qs.filter(status__in=FEEDBACK_STATUS)       # 2
        elif t == 'completed':
            qs = qs.filter(status__in=DONE_STATUSES)         # 3
        else:  # urgent
            today = date.today()
            urgent_end = today + timedelta(days=URGENT_DAYS)
            qs = qs.filter(status__in=ACTIVE_STATUS_CODES, end_date__date__range=(today, urgent_end))

        # (이하 매핑/정렬 로직은 동일)
        task_ids = list(qs.values_list('task_id', flat=True))
        tm = list(TaskManager.objects.filter(task_id__in=task_ids).values('task_id', 'project_id'))
        pids = {row['project_id'] for row in tm}
        projects = dict(Project.objects.filter(project_id__in=pids).values_list('project_id', 'project_name'))
        task_to_project = {}
        for row in tm:
            task_to_project.setdefault(row['task_id'], row['project_id'])

        tasks = []
        for trow in qs.order_by('end_date', 'task_id').values('task_id', 'task_name', 'status', 'end_date'):
            pid = task_to_project.get(trow['task_id'])
            tasks.append({
                "task_id": trow['task_id'],
                "task_name": trow['task_name'] or "제목 없음",
                "status": trow['status'],          # 그대로 숫자 코드 반환
                "status_code": trow['status'],
                "end_date": trow['end_date'],
                "project_name": projects.get(pid),
            })
        return Response({"total": len(tasks), "tasks": tasks})

