from django.urls import path
from .views import (
    get_user_schedules,
    get_schedule_detail,
    create_user_schedule,
    delete_schedule,
    get_user_schedules,
    create_user_schedule,
    update_schedule,
    task_list,
    tasks_for_user,
)

urlpatterns = [
    path('<int:schedule_id>/', get_schedule_detail, name='get_schedule_detail'),
    path('delete/<int:schedule_id>/', delete_schedule, name='delete_schedule'),
    path('list/', get_user_schedules, name='get_user_schedules'),  # `user_id` 없이 조회
    path('create/', create_user_schedule, name='create_user_schedule'),  # `user_id` 없이 일정 추가
    path('update/<int:schedule_id>/', update_schedule, name='update_schedule'),
    path('task/list/', task_list, name='task_list'),
    path('api/tasks/', tasks_for_user, name='tasks_for_user'),
]
