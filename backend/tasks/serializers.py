# tasks/serializers.py
from rest_framework import serializers
from db_model.models import Task
from db_model.models import TaskManager  # TaskManager는 db_model 앱에서 import

class TaskSerializer(serializers.ModelSerializer):
    assignees = serializers.SerializerMethodField()
    

    class Meta:
        model = Task
        fields = '__all__'

    def get_assignees(self, obj):
        managers = TaskManager.objects.filter(task=obj)
        return [tm.user.name for tm in managers if tm.user]

class TaskNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        # fields = ('task_name')
        fields = '__all__'

class TaskManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskManager
        # DB 컬럼 그대로 노출 (tm_id는 읽기 전용이므로 제외해도 무방)
        # fields = ('user', 'project', 'task')
        fields = '__all__'