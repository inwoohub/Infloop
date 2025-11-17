from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TaskViewSet,
    TaskNoProjectViewSet,
    toggle_favorite_project,
    get_user_projects_with_favorite,
    project_progress,
    get_team_members,
    change_task_name,
    create_task_manager,
    task_files,
)

router = DefaultRouter()
router.register(r"tasks-no-project", TaskNoProjectViewSet, basename="tasks-no-project")
# 필요하다면 다른 ViewSet도 register…

urlpatterns = [
    # ========== 개별 함수형 API ==========
    path("user/<int:user_id>/projects/<int:project_id>/favorite/",
         toggle_favorite_project, name="toggle_favorite_project"),

    path("user/<int:user_id>/projects/",
         get_user_projects_with_favorite, name="projects_with_favorite"),

    path("user/<int:user_id>/projects/<int:project_id>/progress/",
         project_progress, name="project_progress"),

    path("user/tasks/<int:project_id>/",
         TaskViewSet.as_view({"get": "list"}), name="task-list-by-project"),

    path("team-members/",  get_team_members,  name="get_team_members"),
    path("tasks/<int:task_id>/change-name/", change_task_name, name="change_task_name"),
    path("task-managers/", create_task_manager, name="create_task_manager"),
    path('task-files/', task_files, name='task-files'),

    # ========== ViewSet URL ==========
    path("", include(router.urls)),     # 🔹 이 한 줄이면 /tasks-no-project/ 모든 REST 엔드포인트 제공
]
