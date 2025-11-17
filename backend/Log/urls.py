# backend/Log/urls.py
from django.urls import path
from .view import get_project_logs

urlpatterns = [
    # /api/projects/<project_id>/logs/
    path("projects/<int:project_id>/logs/", get_project_logs),
]
