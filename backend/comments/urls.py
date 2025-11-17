# comments/urls.py
from django.urls import path
from .views import comment_list_or_create, file_upload
from . import views

urlpatterns = [
    # GET/POST 댓글
    path('comments/', comment_list_or_create, name='comment_list_or_create'),

    # 파일 업로드
    path('files/', views.file_upload, name='file_upload'),  # ✅ 이걸로 변경


    path('save-file-meta/', views.save_file_meta, name='save_file_meta'),

    path("download-url/", views.generate_download_url, name="generate_download_url"),

    path("task-files/", views.get_task_files, name="get_task_files"),

]
