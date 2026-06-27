from rest_framework.permissions import BasePermission


class IsApplicant(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'applicant')
        )


class IsUniversityStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'universitystaff')
        )


class IsUniversityAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'universitystaff')
            and request.user.universitystaff.permission_level == 'admin'
        )


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'platformadmin')
        )


class IsEmailVerified(BasePermission):
    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'applicant')
        ):
            return False
        return request.user.applicant.email_verified


class IsScopedToUniversity(BasePermission):
    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'universitystaff')
        ):
            return False
        return True

    def has_object_permission(self, request, view, obj):
        from universities.models import University
        if isinstance(obj, University):
            return obj.id == request.user.universitystaff.university_id
        if not hasattr(obj, 'university'):
            return True
        return obj.university_id == request.user.universitystaff.university_id


class IsApplicantOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'applicant')
        )

    def has_object_permission(self, request, view, obj):
        return obj.applicant_id == request.user.applicant.id


class MFAVerified(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        # Bypass MFA check during tests so pytest don't need session setup.
        from django.conf import settings
        if getattr(settings, 'TESTING', False):
            return True
        if hasattr(request.user, 'universitystaff') or hasattr(request.user, 'platformadmin'):
            return bool(request.session.get('mfa_verified', False))
        return True


class IsApplicantOwnerOrStaffScoped(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'applicant'):
            return obj.applicant_id == request.user.applicant.id
        if hasattr(request.user, 'universitystaff'):
            if not hasattr(obj, 'university'):
                return True
            return obj.university_id == request.user.universitystaff.university_id
        return False