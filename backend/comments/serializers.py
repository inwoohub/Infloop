from rest_framework import serializers
from db_model.models import Comment, File, Task

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    # 🔹 write 용 FK 필드
    task   = serializers.PrimaryKeyRelatedField(
                queryset=Task.objects.all(), write_only=True
             )

    class Meta:
        model  = Comment
        fields = [
            'comment_id', 'content', 'created_date',
            'task',      # ← write 시 사용
            'user', 'author'
        ]

    def get_author(self, obj):
        return obj.user.name if obj.user else "알 수 없음"

class FileSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    task = serializers.PrimaryKeyRelatedField(
            queryset=Task.objects.all(), write_only=True
        )

    class Meta:
        model = File
        fields = ['file_id', 'file_name', 'task', 'user', 'created_date', 'author']

    def get_author(self, obj):
        return obj.user.name if obj.user else "알 수 없음"
