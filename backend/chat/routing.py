from django.urls import re_path
from .consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r"chat/ws/chat/(?P<project_id>\d+)/$", ChatConsumer.as_asgi()),  # ✅ chat 포함
    re_path(r"chat/ws/chat/dm/(?P<room_id>\d+)/$", ChatConsumer.as_asgi()),   # ← DM용 패턴 추가
]
