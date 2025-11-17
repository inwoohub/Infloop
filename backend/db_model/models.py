from django.db import models
from django.utils import timezone
# Create your models here.
from django.contrib.auth.models import AbstractUser

# ✅ 1️⃣ User 모델 수정
from django.db import models
from django.utils import timezone

# Subject 모델 (기존 unmanaged 모델)
class Subject(models.Model):
    subject_code = models.CharField(
        max_length=10,
        primary_key=True,
        db_column='subject_code'
    )
    subject_name = models.CharField(
        max_length=100,
        db_column='subject_name'
    )

    class Meta:
        db_table = 'Subject'
        managed = False

    def __str__(self):
        return self.subject_name


class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=5, unique=True)
    email = models.CharField(max_length=30, unique=True)
    password = models.CharField(max_length=20)
    skill = models.CharField(max_length=255, blank=True, null=True)
    profile_image = models.CharField(max_length=500, blank=True, null=True)  # ✅ 프로필 이미지 경로 추가

    # 과목 최대 6개까지 외래키로 연결
    subject1 = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject1',
        related_name='users_subject1'
    )
    subject2 = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject2',
        related_name='users_subject2'
    )
    subject3 = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject3',
        related_name='users_subject3'
    )
    subject4 = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject4',
        related_name='users_subject4'
    )
    subject5 = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject5',
        related_name='users_subject5'
    )
    subject6 = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject6',
        related_name='users_subject6'
    )

    subjects = models.ManyToManyField(
        Subject,
        through='UserSubject',
        related_name='users',
        blank=True,
        verbose_name='수강 과목들'
    )

    class Meta:
        db_table = "User"
        # 기존 테이블 사용, Django가 마이그레이션 관리하지 않으려면:
        # managed = False

    def __str__(self):
        return self.name

class UserSubject(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='user_subject_links'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.RESTRICT,
        db_column='subject_code',
        related_name='user_subject_links'
    )

    class Meta:
        db_table = 'UserSubject'
        managed = False     # 이미 테이블을 직접 만들었으므로
        unique_together = (('user', 'subject'),)


# class User(AbstractUser):
#     pass  # 기본 User 모델을 사용, 필요한 필드는 이후 추가 가능


class Schedule(models.Model):
    schedule_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id")  # ✅ ForeignKey 설정
    title = models.CharField(max_length=255)
    start_time = models.DateField()
    end_time = models.DateField()
    location = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "Schedule"  # ✅ MySQL의 기존 테이블과 연결

    def __str__(self):
        return f"{self.title} ({self.start_time} - {self.end_time})"


class FavoriteProject(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey('User', on_delete=models.CASCADE, db_column="user_id", related_name='favorite_projects')
    project = models.ForeignKey('Project', on_delete=models.CASCADE, db_column="project_id", related_name='favorited_by')

    class Meta:
        db_table = "FavoriteProject"
        unique_together = (("user", "project"),)
        # 만약 이미 DB에 테이블이 존재하고 Django가 마이그레이션 하지 않게 하려면 아래 옵션 사용
        # managed = False

    def __str__(self):
        return f"User {self.user_id} - Project {self.project_id}"

class Task(models.Model):
    task_id = models.AutoField(primary_key=True)
    task_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(default=timezone.now)
    created_date = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, null=True)
    required_skills = models.TextField(null=True, blank=True)
    
    # project = models.ForeignKey('Project', on_delete=models.CASCADE)  # project_id를 ForeignKey로 추가
    
    # self 참조 관계 설정
    parent_task = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sub_tasks",
        db_column="parent_task_id"
    )

    class Meta:
        managed = False
        db_table = "Task"



class TaskManager(models.Model):
    tm_id = models.AutoField(primary_key=True)  # 새로운 단일 PK
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id", to_field="user_id")
    project = models.ForeignKey('Project', on_delete=models.CASCADE, db_column="project_id")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, db_column="task_id")

    class Meta:
        managed = False
        db_table = "TaskManager"
        unique_together = (('user', 'project', 'task'),)



class ProjectMember(models.Model):
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id")  # ✅ User 테이블과 FK 설정
    project_id = models.IntegerField()  # ✅ 프로젝트 ID
    role = models.IntegerField(default=0)  # ✅ 역할 (예: 관리자, 일반 멤버 등)

    class Meta:
        managed = False  # ✅ 기존 DB 테이블을 사용 (Django가 자동 마이그레이션 X)
        db_table = "ProjectMember"  # ✅ DB에 이미 존재하는 테이블명과 일치해야 함


# ✅ 2️⃣ Project 모델 수정
class Project(models.Model):
    project_id = models.AutoField(primary_key=True)  # ✅ 기존 프로젝트 ID 사용
    project_name = models.CharField(max_length=255, unique=True)  # ✅ 기존 project_name 사용

    class Meta:
        db_table = "Project"  # ✅ MySQL의 기존 `Project` 테이블 유지

    def __str__(self):
        return self.project_name


# ✅ 3️⃣ Message 모델 수정 (User 모델의 user_id 참조)
class Message(models.Model):
    message_id = models.AutoField(primary_key=True)
    content = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)
    
    # ✅ `auth_user`가 아니라 `User` 테이블을 정확히 참조하도록 변경
    user = models.ForeignKey(User, to_field="user_id", on_delete=models.CASCADE)  
    project = models.ForeignKey(Project, to_field="project_id", on_delete=models.CASCADE)

    class Meta:
        db_table = "Message"  # ✅ 기존 MySQL `Message` 테이블 유지

    def __str__(self):
        return f"{self.user.name}: {self.content[:20]}"


class Comment(models.Model):
    comment_id = models.AutoField(primary_key=True, db_column='comment_id')
    content = models.CharField(max_length=200, db_column='content')  # NOT NULL
    created_date = models.DateTimeField(db_column='created_date')  # NOT NULL, DEFAULT CURRENT_TIMESTAMP
    task = models.ForeignKey(
        Task,
        db_column='task_id',
        to_field='task_id',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    # user_id를 User 모델과 연결 (User 모델의 primary key인 user_id를 사용)
    user = models.ForeignKey('User', to_field="user_id", on_delete=models.CASCADE, db_column='user_id')

    class Meta:
        managed = False  # 이미 존재하는 테이블 사용
        db_table = 'Comment'

    def __str__(self):
        return f"Comment({self.comment_id}): {self.content[:20] if self.content else ''}"


class File(models.Model):
    file_id = models.AutoField(primary_key=True, db_column='file_id')
    file_name = models.CharField(max_length=255, db_column='file_name', null=True, blank=True)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, db_column='task_id')
    created_date = models.DateTimeField(db_column='created_date', auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id")

    class Meta:
        managed = False
        db_table = 'File'

class Log(models.Model):
    log_id = models.AutoField(primary_key=True)
    created_date = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=50)
    content = models.TextField()

    # ✅ 반드시 'User' 클래스 객체로 지정 (문자열 'User' X, auth.User X)
    user    = models.ForeignKey(User,    on_delete=models.SET_NULL, null=True, db_column='user_id')
    task    = models.ForeignKey(Task,    on_delete=models.SET_NULL, null=True, db_column='task_id')
    comment = models.ForeignKey(Comment, on_delete=models.SET_NULL, null=True, db_column='comment_id')

    class Meta:
        db_table = 'Log'
        managed  = False

class Post(models.Model):
    post_id = models.AutoField(
        primary_key=True,
        db_column='post_id',
        help_text='게시글ID (PK)'
    )
    subject = models.ForeignKey(
        Subject,
        to_field='subject_code',
        db_column='subject_code',
        on_delete=models.RESTRICT,
        related_name='posts',
        help_text='과목코드 (FK → Subject)'
    )
    title = models.CharField(
        max_length=255,
        db_column='title',
        help_text='제목'
    )
    content = models.TextField(
        db_column='content',
        help_text='내용'
    )
    author = models.ForeignKey(
        User,
        to_field='user_id',
        db_column='author_id',
        on_delete=models.CASCADE,
        related_name='posts',
        help_text='작성자 (FK → User)'
    )
    created_date = models.DateTimeField(
        auto_now_add=True,
        db_column='created_date',
        help_text='작성일시'
    )

    class Meta:
        db_table = 'Post'
        managed = False
        verbose_name = '게시글'
        verbose_name_plural = '게시글 목록'
        indexes = [
            models.Index(fields=['subject'], name='idx_post_subject'),
            models.Index(fields=['author'],  name='idx_post_author'),
        ]

    def __str__(self):
        return f"[{self.subject.subject_code}] {self.title}"



class DirectMessageRoom(models.Model):
    room_id = models.AutoField(primary_key=True)
    user1   = models.ForeignKey(User, on_delete=models.CASCADE, related_name="dm_user1")
    user2   = models.ForeignKey(User, on_delete=models.CASCADE, related_name="dm_user2")

    class Meta:
        db_table = "DirectMessageRoom"
        managed  = False          # ★ 이미 있는 테이블, 마이그레이션 X
        unique_together = (("user1", "user2"),)

    def __str__(self):
        return f"DM {self.room_id} ({self.user1_id},{self.user2_id})"

class DirectMessage(models.Model):
    message_id   = models.AutoField(primary_key=True)
    room         = models.ForeignKey(DirectMessageRoom, on_delete=models.CASCADE)
    user         = models.ForeignKey(User, on_delete=models.CASCADE)
    content      = models.CharField(max_length=200)
    created_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "DirectMessage"
        managed  = False          # ★ 마이그레이션 X