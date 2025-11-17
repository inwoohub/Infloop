# gptapi/serializers.py
from rest_framework import serializers
from db_model.models import Task

class TaskSerializer(serializers.ModelSerializer):
    # DB의 task_name을 JSON의 title로, description을 assignee로 매핑
    title = serializers.CharField(source='task_name')
    assignee = serializers.CharField(source='description', required=False, allow_blank=True)

    class Meta:
        model = Task
        # 우선순위 칼럼은 없앴으므로 포함하지 않음
        fields = ['task_id', 'title', 'assignee', 'status', 'start_date', 'end_date']
