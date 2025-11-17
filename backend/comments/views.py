import os
import traceback
from django.conf import settings
from django.utils.timezone import now
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from db_model.models import Comment, File
from .serializers import CommentSerializer, FileSerializer
from Log.view import create_log
import logging
import boto3

from django.contrib.auth import get_user_model
User = get_user_model()
logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
def comment_list_or_create(request):
    """
    GET  /api/comments/?task_id=xx  => 특정 task의 댓글 조회 (인증 필요 없음)
    POST /api/comments/             => 댓글 생성 (로그인되었거나, 프론트에서 user_id를 전달)
    """
    try:
        if request.method == 'GET':
            task_id = request.query_params.get('task_id')
            queryset = Comment.objects.all()
            if task_id:
                queryset = queryset.filter(task_id=task_id)
            serializer = CommentSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'POST':
            data = request.data.copy()
            data["created_date"] = now()
            # 우선 Django의 인증 미들웨어가 채워진 request.user 사용
            if hasattr(request, "user") and request.user and request.user.is_authenticated:
                data["user"] = request.user.user_id
            # 만약 인증 정보가 없다면, 클라이언트가 POST 데이터에 "user" (user_id)를 직접 전달해야 합니다.
            elif "user" in data and data["user"]:
                pass  # 이미 클라이언트가 user_id를 포함시켰다고 가정
            else:
                return Response({"error": "로그인 정보가 필요합니다."}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = CommentSerializer(data=data)
            if serializer.is_valid():
                comment = serializer.save()          # Comment 인스턴스 확보

                # ✨ 불필요한 User 변환 로직 제거
                create_log(
                    action  = "댓글 등록",
                    content = comment.content,
                    user    = comment.user,          # 이미 User 인스턴스
                    task    = comment.task,          # Task 인스턴스 (nullable 허용)
                    comment = comment
                )

                return Response(serializer.data, status=status.HTTP_201_CREATED)

            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        error_message = str(e)
        tb = traceback.format_exc()
        logger.error(f"댓글 API 에러: {error_message}\n{tb}")
        return Response({"error": "댓글 처리 중 오류 발생", "details": error_message},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def file_upload(request):
    """
    GET /api/files/?file_name=abc.png&file_type=image/png
    → S3 presigned URL 생성 후 반환
    """
    try:
        file_name = request.GET.get('file_name')
        file_type = request.GET.get('file_type')

        if not file_name or not file_type:
            return Response({"error": "file_name 또는 file_type 누락됨"},
                            status=status.HTTP_400_BAD_REQUEST)

        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            endpoint_url=f"https://s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com"
        )


        presigned_post = s3_client.generate_presigned_post(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=file_name,
            Fields={"Content-Type": file_type},
            Conditions=[{"Content-Type": file_type}],
            ExpiresIn=3600  # 1시간
        )

        return Response({'data': presigned_post}, status=200)

    except Exception as e:
        error_message = str(e)
        tb = traceback.format_exc()
        logger.error(f"S3 presigned URL 생성 에러: {error_message}\n{tb}")
        return Response({"error": "S3 URL 생성 중 오류 발생", "details": error_message},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
def save_file_meta(request):
    try:
        serializer = FileSerializer(data=request.data)
        if serializer.is_valid():
            file_obj = serializer.save()      # 🔹 File 인스턴스 확보

            # ───────── 로그 기록 ─────────
            create_log(
                action  = "파일 업로드",
                content = file_obj.file_name,
                user    = file_obj.user,      # FK: User
                task    = file_obj.task       # FK: Task
            )
            # ─────────────────────────────

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        error_message = str(e)
        tb = traceback.format_exc()
        logger.error(f"파일 메타 저장 에러: {error_message}\n{tb}")
        return Response({"error": "파일 메타 저장 중 오류 발생", "details": error_message},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def generate_download_url(request):
    file_name = request.GET.get('file_name')
    if not file_name:
        return Response({'error': 'file_name 쿼리 필요'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': file_name
            },
            ExpiresIn=3600  # 1시간 (초)
        )

        return Response({'url': presigned_url}, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)
    

@api_view(["GET"])
def get_task_files(request):
    task_id = request.GET.get("task_id")
    if not task_id:
        return Response({"error": "task_id is required"}, status=400)

    files = File.objects.filter(task_id=task_id).order_by("created_date")
    serializer = FileSerializer(files, many=True)
    return Response(serializer.data)

