from django.urls import path
from .views import get_user_projects,get_project_messages,get_project_name, get_dm_rooms, create_dm_room, get_dm_messages

urlpatterns = [
    path("api/user/<int:user_id>/projects/", get_user_projects, name="get_user_projects"),
    path("api/project/<int:project_id>/messages/", get_project_messages, name="get_project_messages"),
    path("api/project/<int:project_id>/name/", get_project_name, name="get_project_name"),
    path("api/user/<int:user_id>/dm_rooms/", get_dm_rooms, name="get_dm_rooms"),
    path("api/dm_rooms/", create_dm_room, name="create_dm_room"),
    path("api/dm_rooms/<int:room_id>/messages/", get_dm_messages, name="get_dm_messages"),    
]
