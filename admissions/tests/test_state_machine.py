import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from admissions.models import Application, ApplicationStatusHistory
from admissions.state_machine import transition_application, VALID_TRANSITIONS


@pytest.mark.django_db
class TestValidTransitions:
    def test_draft_to_submitted(self, application):
        transition_application(application, 'submitted', 'applicant', str(application.applicant.id))
        application.refresh_from_db()
        assert application.status == 'submitted'
        assert ApplicationStatusHistory.objects.filter(
            application=application, to_status='submitted'
        ).exists()

    def test_submitted_to_under_review(self, application):
        application.status = 'submitted'
        application.save()
        transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'under_review'

    def test_under_review_to_admitted(self, application):
        application.status = 'under_review'
        application.save()
        transition_application(application, 'admitted', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'admitted'
        assert application.decision_at is not None

    def test_under_review_to_rejected(self, application):
        application.status = 'under_review'
        application.save()
        transition_application(application, 'rejected', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'rejected'

    def test_under_review_to_waitlisted(self, application):
        application.status = 'under_review'
        application.save()
        transition_application(application, 'waitlisted', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'waitlisted'

    def test_admitted_to_accepted(self, application):
        application.status = 'admitted'
        application.save()
        transition_application(application, 'accepted', 'applicant', str(application.applicant.id))
        application.refresh_from_db()
        assert application.status == 'accepted'
        assert application.offer_response_at is not None

    def test_admitted_to_declined(self, application):
        application.status = 'admitted'
        application.save()
        transition_application(application, 'declined', 'applicant', str(application.applicant.id))
        application.refresh_from_db()
        assert application.status == 'declined'

    def test_admitted_reversal_to_under_review(self, application):
        application.status = 'admitted'
        application.save()
        transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'under_review'

    def test_rejected_reversal_to_under_review(self, application):
        application.status = 'rejected'
        application.save()
        transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'under_review'

    def test_waitlisted_reversal_to_under_review(self, application):
        application.status = 'waitlisted'
        application.save()
        transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')
        application.refresh_from_db()
        assert application.status == 'under_review'


@pytest.mark.django_db
class TestInvalidTransitions:
    def test_draft_to_admitted_raises_error(self, application):
        with pytest.raises(ValidationError):
            transition_application(application, 'admitted', 'university_staff', '00000000-0000-0000-0000-000000000001')

    def test_draft_to_under_review_raises_error(self, application):
        with pytest.raises(ValidationError):
            transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')

    def test_accepted_is_immutable(self, application):
        application.status = 'accepted'
        application.save()
        with pytest.raises(ValidationError):
            transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')

    def test_declined_is_immutable(self, application):
        application.status = 'declined'
        application.save()
        with pytest.raises(ValidationError):
            transition_application(application, 'admitted', 'university_staff', '00000000-0000-0000-0000-000000000001')

    def test_submitted_to_draft_skipping_backwards(self, application):
        application.status = 'submitted'
        application.save()
        with pytest.raises(ValidationError):
            transition_application(application, 'draft', 'applicant', str(application.applicant.id))


@pytest.mark.django_db
class TestStatusHistory:
    def test_creates_history_entry(self, application):
        transition_application(application, 'submitted', 'applicant', str(application.applicant.id))
        history = ApplicationStatusHistory.objects.filter(application=application)
        assert history.count() == 1
        entry = history.first()
        assert entry.from_status == 'draft'
        assert entry.to_status == 'submitted'
        assert entry.changed_by_type == 'applicant'

    def test_multiple_transitions_create_multiple_entries(self, application):
        transition_application(application, 'submitted', 'applicant', str(application.applicant.id))
        application.refresh_from_db()
        transition_application(application, 'under_review', 'university_staff', '00000000-0000-0000-0000-000000000001')
        history = ApplicationStatusHistory.objects.filter(application=application)
        assert history.count() == 2
