import pytest
from datetime import timedelta
from django.utils import timezone

from universities.models import University
from programs.models import Program, AdmissionCycle


@pytest.fixture
def university(db):
    return University.objects.create(
        name='Test University',
        description='A test university',
        status='active',
    )


@pytest.fixture
def published_program(university):
    return Program.objects.create(
        university=university,
        name='BSc Computer Science',
        degree_level='undergraduate',
        description='A CS program',
        required_documents=[
            {'type': 'transcript', 'label': 'Official Transcript'},
        ],
        fee_amount=50.00,
        status='published',
    )


@pytest.fixture
def draft_program(university):
    return Program.objects.create(
        university=university,
        name='MSc Data Science',
        degree_level='postgraduate',
        description='A data science program',
        fee_amount=75.00,
        status='draft',
    )


@pytest.fixture
def open_cycle(published_program):
    return AdmissionCycle.objects.create(
        university=published_program.university,
        program=published_program,
        name='Fall 2026',
        open_date=timezone.now(),
        close_date=timezone.now() + timedelta(days=90),
        status='open',
    )
