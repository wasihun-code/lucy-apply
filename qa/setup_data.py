#!/usr/bin/env python3
"""
QA Regression Suite — Test Data Setup (idempotent)

Creates/retrieves all test users, universities, programs, cycles,
and applications. Outputs shell export statements for sourcing by
test scripts.

Usage:
    DJANGO_SETTINGS_MODULE=lucy_apply.settings python3 qa/setup_data.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
django.setup()

from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import Applicant, PlatformAdmin, UniversityStaff
from universities.models import University
from programs.models import Program, AdmissionCycle
from admissions.models import Application


def shell_quote(val):
    """Quote a value for safe shell eval."""
    val = str(val) if val is not None else ''
    return "'" + val.replace("'", "'\\''") + "'"


def get_or_create(model, defaults, **kwargs):
    """Idempotent get-or-create. Handles MultipleObjectsReturned gracefully."""
    qs = model.objects.filter(**kwargs)
    if qs.exists():
        obj = qs.first()
        created = False
    else:
        obj = model(**kwargs)
        for k, v in defaults.items():
            setattr(obj, k, v)
        obj.save()
        created = True
    return obj, created


def get_or_create_applicant(email, password, full_name, country):
    """Idempotent applicant creation (creates User + Applicant)."""
    try:
        applicant = Applicant.objects.get(email=email)
    except Applicant.DoesNotExist:
        applicant = Applicant.objects.create_user(
            email=email, password=password,
            full_name=full_name, country_of_residence=country,
        )
    return applicant


def get_or_create_staff(email, password, full_name, university, permission_level):
    try:
        staff = UniversityStaff.objects.get(email=email)
    except UniversityStaff.DoesNotExist:
        staff = UniversityStaff.objects.create_user(
            email=email, password=password,
            full_name=full_name, university=university,
            permission_level=permission_level,
        )
    return staff


def get_or_create_admin(email, password, full_name):
    try:
        admin = PlatformAdmin.objects.get(email=email)
    except PlatformAdmin.DoesNotExist:
        admin = PlatformAdmin.objects.create_user(
            email=email, password=password, full_name=full_name,
        )
    return admin


def make_token(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


# ── 1. Test Users ─────────────────────────────────────────────────
alice = get_or_create_applicant(
    'alice@test.com', 'testpass123!', 'Alice Test', 'Kenya',
)
# Ensure alice is email-verified for submission flow
if not alice.email_verified:
    alice.email_verified = True
    alice.save(update_fields=['email_verified'])

bob = get_or_create_applicant(
    'bob@test.com', 'testpass123!', 'Bob Test', 'Ghana',
)
# Bob stays unverified

admin = get_or_create_admin(
    'admin@lucyapply.com', 'adminpass123!', 'Platform Admin',
)

# ── 2. Universities ───────────────────────────────────────────────
univ_a, _ = get_or_create(
    University, {'description': 'First test university', 'status': 'active'},
    name='Test University',
)
univ_b, _ = get_or_create(
    University, {'description': 'Second test university (tenant isolation)', 'status': 'active'},
    name='Other University',
)

# ── 3. University Staff ───────────────────────────────────────────
staff_a = get_or_create_staff(
    'staffadmin@univ.com', 'staffpass123!', 'Staff Admin', univ_a, 'admin',
)
staff_b = get_or_create_staff(
    'staff2@otheruniv.com', 'staffpass123!', 'Other Staff', univ_b, 'admin',
)

# ── 4. Programs ───────────────────────────────────────────────────
prog_a, _ = get_or_create(
    Program, {
        'degree_level': 'undergraduate',
        'description': 'A Bachelor of Science in Computer Science',
        'requirements': 'High school diploma',
        'fee_amount': 50.00,
        'fee_currency': 'USD',
        'required_documents': [
            {'type': 'transcript', 'label': 'Official Transcript'},
            {'type': 'passport', 'label': 'Passport Copy'},
        ],
        'status': 'published',
    },
    university=univ_a, name='BSc Computer Science',
)

prog_b, _ = get_or_create(
    Program, {
        'degree_level': 'postgraduate',
        'description': 'Advanced data science program',
        'requirements': 'BSc required',
        'fee_amount': 75.00,
        'fee_currency': 'USD',
        'required_documents': [
            {'type': 'transcript', 'label': 'Official Transcript'},
            {'type': 'cv', 'label': 'CV'},
        ],
        'status': 'published',
    },
    university=univ_a, name='MSc Data Science',
)

# ── 5. Admission Cycles ───────────────────────────────────────────
cycle_a, _ = get_or_create(
    AdmissionCycle, {
        'open_date': timezone.now() - timezone.timedelta(days=30),
        'close_date': timezone.now() + timezone.timedelta(days=60),
        'status': 'open',
    },
    university=univ_a, program=prog_a, name='Fall 2026',
)

cycle_b, _ = get_or_create(
    AdmissionCycle, {
        'open_date': timezone.now() - timezone.timedelta(days=30),
        'close_date': timezone.now() + timezone.timedelta(days=60),
        'status': 'open',
    },
    university=univ_a, program=prog_b, name='Fall 2026',
)

# ── 6. Draft Application for Alice ────────────────────────────────
app, _ = get_or_create(
    Application, {
        'form_data': {'personal_statement': 'I want to study here.'},
        'status': 'draft',
    },
    applicant=alice, program=prog_a, admission_cycle=cycle_a,
    university=univ_a,
)

# ── 7. Tokens ─────────────────────────────────────────────────────
alice_tokens = make_token(alice)
bob_tokens = make_token(bob)
admin_tokens = make_token(admin)
staff_a_tokens = make_token(staff_a)
staff_b_tokens = make_token(staff_b)

# ── Output shell exports ──────────────────────────────────────────
exports = {
    'TOKEN': alice_tokens['access'],
    'REFRESH': alice_tokens['refresh'],
    'BOB_TOKEN': bob_tokens['access'],
    'ADMIN_TOKEN': admin_tokens['access'],
    'ADMIN_REFRESH': admin_tokens['refresh'],
    'STAFF_TOKEN': staff_a_tokens['access'],
    'STAFF2_TOKEN': staff_b_tokens['access'],
    'UNIVERSITY_ID': str(univ_a.id),
    'UNIVERSITY_B_ID': str(univ_b.id),
    'PROGRAM_ID': str(prog_a.id),
    'PROGRAM_B_ID': str(prog_b.id),
    'CYCLE_ID': str(cycle_a.id),
    'CYCLE_B_ID': str(cycle_b.id),
    'APP_ID': str(app.id),
    'APPLICANT_ID': str(alice.id),
    'STAFF_A_ID': str(staff_a.id),
}

for key, val in exports.items():
    print(f'export {key}={shell_quote(val)}')
