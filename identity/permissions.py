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
        return True


class MFAVerified(BasePermission):
    def has_permission(self, request, view):
        return True
