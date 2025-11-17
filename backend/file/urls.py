# file/urls.py
from django.urls import path
from . import views   # file/views.py 에 함수 정의

urlpatterns = [
    # 파일 목록 가져오기  GET /take-files/?project_id=291
    path("take-files/", views.take_files, name="take_files"),

    # presigned URL 생성   GET /download-files/?file_id=123
    path("download-files/", views.download_files, name="download_files"),
]
