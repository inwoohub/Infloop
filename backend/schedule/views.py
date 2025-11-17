from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from .serializers import ScheduleSerializer,TaskSerializer
from db_model.models import Schedule,User,Task,Project

@api_view(['POST'])
@csrf_exempt
def create_user_schedule(request):
    user_id = request.session.get('user_id')  # 세션에서 user_id 가져오기
    if not user_id:
        return Response({"error": "User not authenticated"}, status=401)

    print("📌 Received request data:", request.data)  # ✅ 디버깅용 출력

    data = request.data.copy()
    data["user"] = user_id  # user_id 자동 추가

    serializer = ScheduleSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    print("🚨 Serializer Errors:", serializer.errors)  # ✅ 어떤 문제인지 확인
    return Response(serializer.errors, status=400)


# ✅ 특정 사용자의 개인 일정 리스트 조회 (CSRF 보호 비활성화)
@api_view(['GET'])
@csrf_exempt  # ✅ CSRF 보호 비활성화
def get_user_schedules(request):
    user_id = request.session.get('user_id')  # 세션에서 user_id 가져오기
    if not user_id:
        return Response({"error": "User not authenticated"}, status=401)

    schedules = Schedule.objects.filter(user_id=user_id).order_by('start_time')
    serializer = ScheduleSerializer(schedules, many=True)
    return Response(serializer.data)


# ✅ 특정 일정 상세 조회 (CSRF 보호 비활성화)
@api_view(['GET'])
@csrf_exempt  # ✅ CSRF 보호 비활성화
def get_schedule_detail(request, schedule_id):
    try:
        schedule = Schedule.objects.get(schedule_id=schedule_id)
        serializer = ScheduleSerializer(schedule)
        return Response(serializer.data)
    except Schedule.DoesNotExist:
        return Response({"error": "Schedule not found"}, status=404)

# ✅ 특정 일정 삭제 (CSRF 보호 비활성화)
@api_view(['DELETE'])
@csrf_exempt  # ✅ CSRF 보호 비활성화
def delete_schedule(request, schedule_id):
    try:
        schedule = Schedule.objects.get(schedule_id=schedule_id)
        schedule.delete()
        return Response({"message": "Schedule deleted successfully"}, status=200)
    except Schedule.DoesNotExist:
        return Response({"error": "Schedule not found"}, status=404)

@api_view(['PUT'])
@csrf_exempt
def update_schedule(request, schedule_id):
    try:
        schedule = Schedule.objects.get(schedule_id=schedule_id)
    except Schedule.DoesNotExist:
        return Response({"error": "Schedule not found"}, status=404)
    
    # partial=True 를 사용하면 일부 필드만 업데이트할 수 있습니다.
    serializer = ScheduleSerializer(schedule, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
def task_list(request):
    team_id = request.query_params.get('team_id')
    if not team_id:
        return Response({"error": "team_id 파라미터가 필요합니다."}, status=400)
    
    # TaskManager를 통해 team_id와 연결된 Task들을 조회 (중복 제거)
    tasks = Task.objects.filter(taskmanager__project_id=team_id).distinct()
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def tasks_for_user(request):
    user_id = request.session.get('user_id')  # 세션에서 user_id 가져오기
    if not user_id:
        return Response({"error": "user_id parameter is required."}, status=400)
    
    # Project 모델에서 project_name이 존재하는(Null이 아닌) 프로젝트의 ID 목록을 구합니다.
    valid_project_ids = Project.objects.filter(project_name__isnull=False).values_list('project_id', flat=True)
    
    # TaskManager를 통해 연결된 Task들을 필터링하는데, 해당 Task가 valid_project_ids에 속한 경우만 가져옵니다.
    tasks = Task.objects.filter(
        taskmanager__project_id__in=valid_project_ids
    )
    
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)
