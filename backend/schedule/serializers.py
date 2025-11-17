from rest_framework import serializers
from db_model.models import Task,Schedule

import datetime

class CustomDateField(serializers.DateField):
    def to_representation(self, value):
        # datetime 객체라면 date로 변환합니다.
        if isinstance(value, datetime.datetime):
            value = value.date()
        return super().to_representation(value)

class ScheduleSerializer(serializers.ModelSerializer):
    start_time = serializers.DateField(format="%Y-%m-%d")  # ✅ 날짜 형식만 변환
    end_time = serializers.DateField(format="%Y-%m-%d")  # ✅ 날짜 형식만 변환

    class Meta:
        model = Schedule
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    start_date_due_date = CustomDateField(source='start_date', format="%Y-%m-%d")
    end_date_due_date = CustomDateField(source='end_date', format="%Y-%m-%d")
    
    class Meta:
        model = Task
        fields = ('task_id', 'task_name', 'status', 'start_date_due_date', 'end_date_due_date', 'created_date')