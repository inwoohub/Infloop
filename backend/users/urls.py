from django.urls import path, include
from .views import (LoginView,
get_user_name,
get_users_list, 
# CreateProjectView,
save_minutes,
update_minutes,
delete_minutes,
get_minutes_by_project,
get_user_profile,
update_skill,
receive_project_data,
get_latest_project_id,
ChangePasswordView,
save_report,             # Report 저장 함수 (views.py에 구현)
update_report,
delete_report,
get_reports_by_project,   # 특정 프로젝트의 Report 조회 함수 (views.py에 구현)
SetProjectIDView,
GetProjectIDView,
export_minutes_docx,
export_report_docx,
UserSubjectsAPIView,
get_posts,
save_post,
update_post,
delete_post,
UserSubjectsAPIView, 
get_user_task_stats,
get_user_task_details,
upload_profile_image,
)

from .views_dashboard import DashboardView, TaskDetailsView
from .views_project import ProjectLogsView, FavoriteToggleView, CurrentProjectGetView, CurrentProjectSetView
from .views_notifications import NotificationsView


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('name/', get_user_name, name='get_user_name'),  # 로그인된 사용자 이름 반환
    path("userslist/", get_users_list, name="get_users_list"),  # ✅ /api/userslist/ 에서 호출 가능
    # path("create_project/", CreateProjectView.as_view(), name="create_project"),  # ✅ 프로젝트 생성 API
    path('minutes/save/', save_minutes, name="save_minutes"),  # 회의록 저장
    path('minutes/update/<int:minutes_id>/', update_minutes, name='update_minutes'),
    path('minutes/delete/<int:minutes_id>/', delete_minutes, name='delete_minutes'),    
    path('minutes/<int:project_id>/', get_minutes_by_project, name="get_minutes_by_project"),  # 특정 프로젝트 회의록 조회
    path('minutes/html2docx/<int:minutes_id>/', export_minutes_docx, name='export_minutes_docx'),
    path("profile/", get_user_profile, name="get_user_profile"),  # ✅ 사용자 프로필 API
    path("update-skill/", update_skill),  # ✅ 기술 스택 업데이트
    path("upload-profile-image/", upload_profile_image, name="upload_profile_image"),
    path("project/data/", receive_project_data, name="receive_project_data"), # ✅ 생성된 projet_id 활용하기(ProjcetCration 및 등등)
    path("project/latest/", get_latest_project_id, name="get_latest_project_id"),  # ✅ GET 요청 받음
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path('report/save/', save_report, name="save_report"),
    path('report/update/<int:report_id>/', update_report, name='update_report'),
    path('report/delete/<int:report_id>/', delete_report, name='delete_report'),
    path('report/<int:project_id>/', get_reports_by_project, name="get_reports_by_project"),
    path('projects/set/', SetProjectIDView.as_view(), name='set_project_id'),
    path('projects/get/', GetProjectIDView.as_view(), name='get_project_id'),
    path('report/html2docx/<int:report_id>/', export_report_docx, name='export_report_docx'),
    path('<int:user_id>/subjects/', UserSubjectsAPIView.as_view(), name='user-subjects'),
    path('posts/', get_posts, name='posts-list'),
    path('posts/save/', save_post, name='posts-save'),
    path('posts/update/<int:post_id>/', update_post, name='posts-update'),  # POST 로 수정
    path('posts/delete/<int:post_id>/', delete_post, name='posts-delete'),
    path('task-stats/', get_user_task_stats, name='get_user_task_stats'),
    path('task-details/', get_user_task_details, name='get_user_task_details'),
    path('<int:user_id>/dashboard/', DashboardView.as_view(), name='dashboard'),
    path('task-details/', TaskDetailsView.as_view(), name='task-details'),

    path('projects/<int:project_id>/logs/', ProjectLogsView.as_view(), name='project-logs'),
    path('<int:user_id>/projects/<int:project_id>/favorite/', FavoriteToggleView.as_view(), name='favorite-toggle'),

    path('projects/get/', CurrentProjectGetView.as_view(), name='current-project-get'),
    path('projects/set/', CurrentProjectSetView.as_view(), name='current-project-set'),

    path("notifications/", NotificationsView.as_view(), name="notifications"),

]

