"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# from django.contrib import admin
# from django.urls import path, include

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/users/', include('users.urls')),
# ]

from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static

# 기본 페이지 응답 함수
def index(request):
    return HttpResponse("<h1>Django 서버가 정상적으로 작동 중입니다!</h1>")

urlpatterns = [
    # path('admin/', admin.site.urls), #쓸데없는 django 제공 웹페이지임ㄷㄷ
    path('api/users/', include('users.urls')),  # 로그인 API URL
    path('', index),  # 기본 페이지 설정
    path("api/gpt/", include("gptapi.urls")),  # GPT API 추가
    path("chat/", include("chat.urls")),  # ✅ chat 앱의 URL 포함
    path("gptapi/", include("gptapi.urls")),  # ✅ Django API URL 매핑 확인
    path('schedule/', include('schedule.urls')),  # schedule 앱의 API 등록
    path('api/', include('tasks.urls')), # tasks 앱의 API 등록
    path('api/', include('comments.urls')),
    path("api/", include("Log.urls")), 
    path("api/", include("file.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)