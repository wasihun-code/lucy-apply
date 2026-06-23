import pytest

from universities.models import University


@pytest.fixture
def active_university(db):
    return University.objects.create(
        name='Test University',
        description='A test university',
        status='active',
    )


@pytest.fixture
def inactive_university(db):
    return University.objects.create(
        name='Inactive University',
        description='Should not appear in public lists',
        status='inactive',
    )
