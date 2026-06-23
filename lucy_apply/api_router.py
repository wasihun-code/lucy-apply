from rest_framework.routers import DefaultRouter

from universities.views import UniversityViewSet
from programs.views import ProgramViewSet
from admissions.views import ApplicationViewSet
from identity.views import ApplicantViewSet

router = DefaultRouter()
router.register('universities', UniversityViewSet, basename='university')
router.register('programs', ProgramViewSet, basename='program')
router.register('applications', ApplicationViewSet, basename='application')
router.register('applicants', ApplicantViewSet, basename='applicant')
