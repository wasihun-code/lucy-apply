from django.db.models import Count, Q

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, Applicant, UniversityStaff, PlatformAdmin
from .permissions import IsPlatformAdmin, MFAVerified

from universities.models import University
from universities.serializers import UniversityListSerializer
from programs.models import Program
from admissions.models import Application


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified]

    def get(self, request):
        return Response({
            'total_applicants': Applicant.objects.count(),
            'total_universities': University.objects.count(),
            'active_universities': University.objects.filter(status='active').count(),
            'inactive_universities': University.objects.filter(status='inactive').count(),
            'total_programs': Program.objects.count(),
            'total_staff': UniversityStaff.objects.count(),
            'applications_by_status': {
                'draft': Application.objects.filter(status='draft').count(),
                'submitted': Application.objects.filter(status='submitted').count(),
                'under_review': Application.objects.filter(status='under_review').count(),
                'admitted': Application.objects.filter(status='admitted').count(),
                'rejected': Application.objects.filter(status='rejected').count(),
                'waitlisted': Application.objects.filter(status='waitlisted').count(),
                'accepted': Application.objects.filter(status='accepted').count(),
                'declined': Application.objects.filter(status='declined').count(),
            },
        })


class AdminUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified]

    def get(self, request):
        search = request.query_params.get('search', '').strip()

        users = User.objects.all()

        if search:
            users = users.filter(
                Q(email__icontains=search) | Q(full_name__icontains=search)
            )

        results = []
        for user in users.select_related('universitystaff')[:100]:
            role = 'unknown'
            permission_level = None
            university_id = None
            university_name = None

            if hasattr(user, 'applicant'):
                role = 'applicant'
            elif hasattr(user, 'universitystaff'):
                role = 'universitystaff'
                permission_level = user.universitystaff.permission_level
                university_id = str(user.universitystaff.university_id)
                university_name = user.universitystaff.university.name
            elif hasattr(user, 'platformadmin'):
                role = 'platformadmin'

            results.append({
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': role,
                'permission_level': permission_level,
                'university_id': university_id,
                'university_name': university_name,
                'account_status': user.account_status,
                'created_at': user.created_at if hasattr(user, 'created_at') else None,
            })

        return Response({'results': results})


class AdminUserStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified]

    def patch(self, request, pk):
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response(
                {'error': {'code': '404', 'message': 'User not found'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get('account_status', '').strip()
        if new_status not in ('active', 'deactivated'):
            return Response(
                {'error': {'code': '400', 'message': 'account_status must be "active" or "deactivated"'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.account_status = new_status
        user.save(update_fields=['account_status', 'updated_at'])
        return Response({'detail': f'User {new_status}'})


class AdminUniversitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified]

    def get(self, request):
        universities = University.objects.annotate(
            program_count=Count('program', distinct=True),
            application_count=Count('application', distinct=True),
        ).order_by('name')
        serializer = UniversityListSerializer(universities, many=True)
        data = serializer.data
        for i, u in enumerate(universities):
            data[i]['program_count'] = u.program_count
            data[i]['application_count'] = u.application_count
        return Response({'results': data})
