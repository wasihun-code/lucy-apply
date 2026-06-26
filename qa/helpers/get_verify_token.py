#!/usr/bin/env python3
"""Print the latest verification token for a given email."""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
django.setup()
from identity.models import EmailVerificationToken
email = sys.argv[1]
t = EmailVerificationToken.objects.filter(applicant__email=email).latest('created_at')
print(t.token)
