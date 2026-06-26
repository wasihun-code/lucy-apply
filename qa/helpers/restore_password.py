#!/usr/bin/env python3
"""Restore a user's password."""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
email, password = sys.argv[1], sys.argv[2]
user = User.objects.get(email=email)
user.set_password(password)
user.save()
print('restored')
