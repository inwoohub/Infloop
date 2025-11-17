from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from db_model.models import File
from comments.serializers import FileSerializer
import boto3, traceback, logging, urllib.parse
from django.conf import settings

logger = logging.getLogger(__name__)

@api_view(["GET"])
def take_files(request):
    project_id = request.GET.get("project_id")
    if not project_id:
        return Response({"error": "project_id 누락"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        files = (
            File.objects
                .filter(task__taskmanager__project_id=project_id)  # join 조건
                .distinct()
                .order_by("-created_date")
        )


        return Response(FileSerializer(files, many=True).data, status=200)
    except Exception as e:
        logger.error(traceback.format_exc())
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def download_files(request):
    file_id = request.GET.get("file_id")
    if not file_id:
        return Response({"error": "file_id 누락"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        file_obj = File.objects.get(pk=file_id)
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        key = file_obj.file_name  # 또는 file_obj.file.name

        # 1) UTF-8로 인코딩 후 percent-encode
        quoted = urllib.parse.quote(file_obj.file_name, safe="")
        # 2) RFC5987 형태로 header 지정
        disposition = f"attachment; filename*=UTF-8''{quoted}"

        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": key,
                "ResponseContentDisposition": disposition,
            },
            ExpiresIn=3600,
        )
        return Response({"url": url}, status=200)

    except File.DoesNotExist:
        return Response({"error": "file not found"}, status=404)
    except Exception as e:
        logger.error(traceback.format_exc())
        return Response({"error": str(e)}, status=500)
