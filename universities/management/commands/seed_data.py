import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from identity.models import Applicant, PlatformAdmin, UniversityStaff, User
from universities.models import University
from programs.models import AdmissionCycle, Program
from admissions.models import Application, ApplicationStatusHistory
from documents.models import ApplicationDocument
from payments.models import Payment


def _now():
    return timezone.now()


def _past(days):
    return _now() - timedelta(days=days)


def _future(days):
    return _now() + timedelta(days=days)


class Command(BaseCommand):
    help = 'Seed database with demo data for development and visual testing'

    def add_arguments(self, parser):
        parser.add_argument('--quick', action='store_true', help='Structure only — skip applications')
        parser.add_argument('--flush', action='store_true', help='Delete existing seed data first')

    def handle(self, *args, **options):
        if options['flush']:
            self._flush()
            self.stdout.write(self.style.SUCCESS('Flushed existing seed data'))

        self.stdout.write('Creating universities...')
        self.universities = self._create_universities()
        self.stdout.write('Creating programs and cycles...')
        self.programs, self.cycles = self._create_programs_cycles()
        self.stdout.write(self.style.SUCCESS('Programs created:'))
        for name, prog in self.programs.items():
            self.stdout.write(f'  {prog.id}  {name}  ({prog.university.name})')
        self.stdout.write(self.style.SUCCESS('Cycles created:'))
        for key, cycle in self.cycles.items():
            self.stdout.write(f'  {cycle.id}  {key}')
        self.stdout.write('Creating users...')
        self.users = self._create_users()
        if not options['quick']:
            self.stdout.write('Creating applications...')
            self._create_applications()
        self.stdout.write(self.style.SUCCESS('Seed data created successfully'))

    def _flush(self):
        Payment.objects.all().delete()
        ApplicationDocument.objects.all().delete()
        ApplicationStatusHistory.objects.all().delete()
        Application.objects.all().delete()
        AdmissionCycle.objects.all().delete()
        Program.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        University.objects.all().delete()

    def _create_universities(self):
        unis = {}
        for name, desc in [
            ('Addis Ababa International University', "Ethiopia's leading international university offering undergraduate and postgraduate programs across all major disciplines."),
            ('Jimma Institute of Technology', 'Premier public university known for engineering, technology, and medical programs with strong industry partnerships.'),
            ('Ethiopian Digital Academy', 'Modern online-first university specializing in computer science, data science, and digital business programs.'),
        ]:
            uni, created = University.objects.get_or_create(
                name=name,
                defaults={'description': desc, 'status': 'active'},
            )
            key = name.split()[0].lower()
            unis[key] = uni
        return unis

    def _create_programs_cycles(self):
        addis = self.universities['addis']
        jimma = self.universities['jimma']
        ethio = self.universities['ethiopian']

        programs_data = [
            (addis, 'BSc Computer Science', 'undergraduate', 50.00, ['transcript', 'id_document']),
            (addis, 'BSc Business Administration', 'undergraduate', 45.00, ['transcript']),
            (jimma, 'BSc Electrical Engineering', 'undergraduate', 40.00, ['transcript', 'recommendation']),
            (jimma, 'BSc Medicine', 'undergraduate', 60.00, ['transcript', 'recommendation', 'id_document']),
            (ethio, 'MSc Data Science', 'postgraduate', 75.00, ['transcript', 'cv']),
        ]

        cycles_data = [
            ('BSc Computer Science', ['Fall 2025', 'Spring 2026', 'Fall 2026']),
            ('BSc Business Administration', ['Fall 2025', 'Spring 2026', 'Fall 2026']),
            ('BSc Electrical Engineering', ['Fall 2025', 'Spring 2026']),
            ('BSc Medicine', ['Fall 2024', 'Fall 2025', 'Spring 2026']),
            ('MSc Data Science', ['Fall 2025', 'Spring 2026']),
        ]

        cycles_map = {}
        programs_map = {}

        for uni, name, degree, fee, docs in programs_data:
            prog, created = Program.objects.get_or_create(
                university=uni,
                name=name,
                defaults={
                    'degree_level': degree,
                    'description': f'{name} program at {uni.name}',
                    'required_documents': [{'type': t, 'label': t.replace('_', ' ').title()} for t in docs],
                    'fee_amount': fee,
                    'fee_currency': 'USD',
                    'status': 'published',
                },
            )
            programs_map[name] = prog

        for prog_name, cycle_names in cycles_data:
            prog = programs_map[prog_name]
            for i, cname in enumerate(cycle_names):
                open_days = 30 - (i * 5)
                duration = 120 - (i * 10)
                if '2024' in cname:
                    status = 'archived'
                elif '2025' in cname:
                    status = 'closed'
                else:
                    status = 'open'
                cycle, created = AdmissionCycle.objects.get_or_create(
                    university=prog.university,
                    program=prog,
                    name=cname,
                    defaults={
                        'open_date': _past(open_days) if status != 'archived' else _past(400),
                        'close_date': _future(duration - open_days) if status == 'open' else _past(10) if status == 'closed' else _past(300),
                        'status': status,
                    },
                )
                cycles_map[f'{prog_name}::{cname}'] = cycle

        return programs_map, cycles_map

    def _create_users(self):
        users = {}

        # Applicant 1 — full profile
        alice, _ = Applicant.objects.get_or_create(
            email='alice@demo.com',
            defaults={
                'full_name': 'Alice Wonderland',
                'country_of_residence': 'Kenya',
                'email_verified': True,
            },
        )
        if not alice.password or alice.password.startswith('!'):
            alice.set_password('demo123')
            alice.save()
        users['alice'] = alice

        # Applicant 2 — basic profile
        bob, _ = Applicant.objects.get_or_create(
            email='bob@demo.com',
            defaults={
                'full_name': 'Bob Builder',
                'country_of_residence': 'Ghana',
            },
        )
        if not bob.password or bob.password.startswith('!'):
            bob.set_password('demo123')
            bob.save()
        users['bob'] = bob

        # Staff: admin for Addis
        staff_admin, _ = UniversityStaff.objects.get_or_create(
            email='staff@addis.edu',
            defaults={
                'full_name': 'Desta Staff',
                'university': self.universities['addis'],
                'permission_level': 'admin',
            },
        )
        if not staff_admin.password or staff_admin.password.startswith('!'):
            staff_admin.set_password('demo123')
            staff_admin.save()
        users['staff_admin'] = staff_admin

        # Staff: officer for Addis
        staff_officer, _ = UniversityStaff.objects.get_or_create(
            email='officer@addis.edu',
            defaults={
                'full_name': 'Officer Oumer',
                'university': self.universities['addis'],
                'permission_level': 'officer',
            },
        )
        if not staff_officer.password or staff_officer.password.startswith('!'):
            staff_officer.set_password('demo123')
            staff_officer.save()
        users['staff_officer'] = staff_officer

        # Staff: admin for Jimma
        staff_jimma, _ = UniversityStaff.objects.get_or_create(
            email='staff@jimma.edu',
            defaults={
                'full_name': 'Jimma Admin',
                'university': self.universities['jimma'],
                'permission_level': 'admin',
            },
        )
        if not staff_jimma.password or staff_jimma.password.startswith('!'):
            staff_jimma.set_password('demo123')
            staff_jimma.save()
        users['staff_jimma'] = staff_jimma

        # Platform admin
        plat_admin, _ = PlatformAdmin.objects.get_or_create(
            email='admin@lucyapply.com',
            defaults={'full_name': 'Platform Admin'},
        )
        if not plat_admin.password or plat_admin.password.startswith('!'):
            plat_admin.set_password('admin123')
            plat_admin.save()
        users['plat_admin'] = plat_admin

        return users

    def _create_applications(self):
        alice = self.users['alice']
        bob = self.users['bob']
        staff_admin = self.users['staff_admin']
        addis = self.universities['addis']
        jimma = self.universities['jimma']

        apps_config = [
            # (applicant, program_name, cycle_name, status, submitted_days_ago, has_payment, decision_days_ago)
            # 1. Admitted then accepted
            ('alice', 'BSc Computer Science', 'Fall 2025', 'accepted', 90, True, 30),
            # 2. Under review
            ('alice', 'BSc Business Administration', 'Fall 2025', 'under_review', 45, True, None),
            # 3. Draft
            ('bob', 'BSc Computer Science', 'Spring 2026', 'draft', None, False, None),
            # 4. Submitted (no payment)
            ('bob', 'BSc Business Administration', 'Fall 2025', 'submitted', 10, False, None),
            # 5. Rejected
            ('bob', 'BSc Medicine', 'Fall 2025', 'rejected', 60, True, 20),
            # 6. Waitlisted
            ('alice', 'BSc Electrical Engineering', 'Fall 2025', 'waitlisted', 50, True, 15),
        ]

        for applicant_key, prog_name, cycle_name, status, submitted_days, has_payment, decision_days in apps_config:
            applicant = self.users[applicant_key]
            cycle = self.cycles[f'{prog_name}::{cycle_name}']
            prog = self.programs[prog_name]
            uni = applicant.university if hasattr(applicant, 'university') and applicant.university else prog.university

            if hasattr(applicant, 'university') and applicant.university:
                uni = applicant.university
            else:
                uni = prog.university

            app, created = Application.objects.get_or_create(
                applicant=applicant,
                program=prog,
                admission_cycle=cycle,
                defaults={
                    'university': uni,
                    'status': 'draft',
                    'form_data': {'personal_statement': 'I am very interested in this program.'},
                },
            )

            if created or app.status == 'draft':
                app.status = status
                if submitted_days:
                    app.submitted_at = _past(submitted_days)
                if decision_days and status in ('admitted', 'rejected', 'waitlisted', 'accepted', 'declined'):
                    app.decision_at = _past(decision_days)
                    app.decision_by = staff_admin
                if status == 'accepted':
                    app.offer_response_at = _past(decision_days - 5) if decision_days else _past(5)
                app.save()

                # Create history entries
                ApplicationStatusHistory.objects.get_or_create(
                    application=app,
                    from_status=None,
                    to_status='draft',
                    defaults={
                        'changed_by_type': 'applicant',
                        'changed_by_id': str(applicant.id),
                        'created_at': _past(200) if submitted_days else _now(),
                    },
                )

                if status != 'draft':
                    ApplicationStatusHistory.objects.get_or_create(
                        application=app,
                        from_status='draft',
                        to_status='submitted',
                        defaults={
                            'changed_by_type': 'applicant',
                            'changed_by_id': str(applicant.id),
                            'reason': 'Application submitted',
                            'created_at': _past(submitted_days) if submitted_days else _now(),
                        },
                    )

                if status in ('under_review', 'admitted', 'rejected', 'waitlisted', 'accepted', 'declined'):
                    ApplicationStatusHistory.objects.get_or_create(
                        application=app,
                        from_status='submitted',
                        to_status='under_review',
                        defaults={
                            'changed_by_type': 'university_staff',
                            'changed_by_id': str(staff_admin.id),
                            'reason': 'Review started',
                            'created_at': _past(submitted_days - 5) if submitted_days else _now() - timedelta(days=5),
                        },
                    )

                if status in ('admitted', 'rejected', 'waitlisted'):
                    ApplicationStatusHistory.objects.get_or_create(
                        application=app,
                        from_status='under_review',
                        to_status=status,
                        defaults={
                            'changed_by_type': 'university_staff',
                            'changed_by_id': str(staff_admin.id),
                            'reason': 'Decision made after review of all documents.',
                            'created_at': _past(decision_days) if decision_days else _now(),
                        },
                    )

                if status == 'accepted':
                    ApplicationStatusHistory.objects.get_or_create(
                        application=app,
                        from_status='admitted',
                        to_status='accepted',
                        defaults={
                            'changed_by_type': 'applicant',
                            'changed_by_id': str(applicant.id),
                            'reason': 'Offer accepted by applicant',
                            'created_at': _past(decision_days - 5) if decision_days else _now(),
                        },
                    )

                # Create documents
                for doc_type in ['transcript', 'id_document']:
                    ApplicationDocument.objects.get_or_create(
                        application=app,
                        document_type=doc_type,
                        defaults={
                            'university': uni,
                            'object_key': f'demo/{app.id}/{doc_type}.pdf',
                            'status': 'verified' if status in ('admitted', 'rejected', 'waitlisted', 'accepted', 'declined', 'under_review') else 'pending',
                        },
                    )

                # Create payment if applicable
                if has_payment:
                    Payment.objects.get_or_create(
                        application=app,
                        defaults={
                            'university': uni,
                            'amount': prog.fee_amount,
                            'currency': 'USD',
                            'processor_reference': f'demo_{uuid.uuid4().hex[:12]}',
                            'status': 'succeeded',
                            'initiated_at': _past(submitted_days) if submitted_days else _now(),
                            'completed_at': _past(submitted_days - 1) if submitted_days else _now(),
                        },
                    )
