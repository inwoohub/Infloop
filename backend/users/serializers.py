from rest_framework import serializers
from db_model.models import User, Subject

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ('subject_code', 'subject_name')

class UserSubjectSerializer(serializers.ModelSerializer):
    # source 지정 없이, 필드명과 같으면 DRF가 User.subjects (M2M) 를 자동으로 참조합니다.
    subjects = SubjectSerializer(many=True)

    class Meta:
        model = User
        fields = ('user_id', 'name', 'subjects')
