import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone
from django.utils.timezone import localtime, make_aware, is_naive
from channels.db import database_sync_to_async
from db_model.models import User, Project, Message




# ── 공용 직렬화 유틸: 표시용 + ISO 둘 다 ─────────────────────
def serialize_message_obj(obj):
    dt = obj.created_date
    if is_naive(dt):            # ✅ 안전망: naive → aware
        dt = make_aware(dt)
    ldt = localtime(dt)
    return {
        "message_id": obj.message_id if hasattr(obj, "message_id") else obj.id,
        "message": obj.content,
        "user_id": obj.user.user_id,
        "username": obj.user.name,
        "timestamp": f"{ldt.month}/{ldt.day} {ldt.strftime('%H:%M')}",  # 표시용(11/6 21:29)
        "timestamp_iso": ldt.isoformat(),                                # 파싱/정렬용
    }


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        kwargs = self.scope["url_route"]["kwargs"]
        if "project_id" in kwargs:
            self.room_type = "project"
            self.room_id = kwargs["project_id"]
            self.room_group_name = f"chat_{self.room_id}"
        else:
            self.room_type = "dm"
            self.room_id = kwargs["room_id"]
            self.room_group_name = f"dm_{self.room_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        # 🟡 클라에서 보낸 temp_id 받기 (낙관적 렌더 교체용)
        temp_id = data.get("temp_id")

        # 보낸 사람
        user_id = int(data["user_id"])
        message_content = (data.get("message") or "").strip()
        if not message_content:
            return

        user = await self.get_user(user_id)

        # ── 저장 (tz-aware 보장) ─────────────────────────
        if self.room_type == "project":
            project = await self.get_project(self.room_id)
            chat_obj = await self.save_message(user, project, message_content)  # created_date=now()
        else:
            dm_room = await self.get_dm_room(self.room_id)
            chat_obj = await self.save_dm_message(user, dm_room, message_content)

        created_time = chat_obj.created_date
        if is_naive(created_time):
            created_time = make_aware(created_time)

        # 저장된 객체로 payload 직렬화 (표시용+ISO)
        payload = serialize_message_obj(chat_obj)
        if temp_id:
            payload["temp_id"] = temp_id  # 🟢 여기서 붙여서 에코

        # 브로드캐스트
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "chat_message", **payload},
        )

    async def chat_message(self, event):
        # event 자체에 필드가 들어있으니 그대로 전달
        await self.send(text_data=json.dumps(event))

    # ── DB helpers ─────────────────────────────────────
    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(user_id=user_id)

    @database_sync_to_async
    def get_project(self, project_id):
        return Project.objects.filter(project_id=project_id).first()

    @database_sync_to_async
    def save_message(self, user, project, content):
        return Message.objects.create(
            user=user, project=project, content=content,
            created_date=timezone.now(),   # ✅ tz-aware
        )

    @database_sync_to_async
    def save_dm_message(self, user, room, content):
        from db_model.models import DirectMessage
        return DirectMessage.objects.create(
            user=user, room=room, content=content,
            created_date=timezone.now(),   # ✅ tz-aware
        )

    @database_sync_to_async
    def get_dm_room(self, room_id):
        from db_model.models import DirectMessageRoom
        return DirectMessageRoom.objects.filter(room_id=room_id).first()

    