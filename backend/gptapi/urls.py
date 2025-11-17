from django.urls import path
from .views import summarize_meeting, generate_high_level_tasks, confirm_tasks, summarize_report, summarize_finalreport, transcribe_audio  # 보고서 템플릿 생성을 위한 함수 (views.py에 구현)

urlpatterns = [
    path("summarize/", summarize_meeting, name="summarize_meeting"),
    path("generate_high_level_tasks/", generate_high_level_tasks, name="generate_high_level_tasks"),
    path('confirm_tasks/', confirm_tasks, name='confirm_tasks'),
    path('summarize_report/', summarize_report, name='summarize_report'),
    path("transcribe/", transcribe_audio, name="transcribe_audio"),
    path('summarize_finalreport/', summarize_finalreport, name='summarize_finalreport'),
]
