#!/usr/bin/env python3
"""Create and return a verification token for a given email."""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
django.setup()
from identity.models import Applicant, EmailVerificationToken
email = sys.argv[1]
applicant = Applicant.objects.get(email=email)
# If already verified, we still create a token to test the verification endpoint
token = EmailVerificationToken.objects.create(applicant=applicant)
print(token.token)
