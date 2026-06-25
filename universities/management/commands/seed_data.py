# from datetime import timedelta
#
# from django.utils import timezone
# from django.core.management.base import BaseCommand
#
# from universities.models import University
# from programs.models import Program, AdmissionCycle
#
#
# class Command(BaseCommand):
#     help = 'Seed universities, published programs, and open admission cycles'
#
#     def handle(self, *args, **options):
#         u1, _ = University.objects.get_or_create(
#             name='Addis Ababa International University',
#             defaults={
#                 'description': 'Ethiopia\'s leading international university offering a wide range of undergraduate and postgraduate programs.',
#                 'status': 'active',
#             },
#         )
#         u2, _ = University.objects.get_or_create(
#             name='Jimma University',
#             defaults={
#                 'description': 'One of Ethiopia\'s top public universities, known for its engineering and medical programs.',
#                 'status': 'active',
#             },
#         )
#
#         now = timezone.now()
#
#         programs_data = [
#             {
#                 'university': u1,
#                 'name': 'BSc Computer Science',
#                 'degree_level': 'undergraduate',
#                 'description': 'A comprehensive computer science program covering algorithms, data structures, AI, and software engineering.',
#                 'fee_amount': 50.00,
#             },
#             {
#                 'university': u1,
#                 'name': 'BSc Business Administration',
#                 'degree_level': 'undergraduate',
#                 'description': 'Develop leadership and management skills with a focus on international business.',
#                 'fee_amount': 45.00,
#             },
#             {
#                 'university': u2,
#                 'name': 'BSc Electrical Engineering',
#                 'degree_level': 'undergraduate',
#                 'description': 'A rigorous program covering power systems, electronics, and telecommunications.',
#                 'fee_amount': 40.00,
#             },
#             {
#                 'university': u2,
#                 'name': 'BSc Medicine',
#                 'degree_level': 'undergraduate',
#                 'description': 'A six-year medical program with clinical rotations at partner hospitals.',
#                 'fee_amount': 60.00,
#             },
#         ]
#
#         required_docs = [
#             {'type': 'transcript', 'label': 'Official Transcript'},
#             {'type': 'id_document', 'label': 'Passport/National ID'},
#             {'type': 'recommendation', 'label': 'Letter of Recommendation'},
#         ]
#
#         for pd_data in programs_data:
#             program, created = Program.objects.get_or_create(
#                 university=pd_data['university'],
#                 name=pd_data['name'],
#                 defaults={
#                     'degree_level': pd_data['degree_level'],
#                     'description': pd_data['description'],
#                     'required_documents': required_docs,
#                     'fee_amount': pd_data['fee_amount'],
#                     'status': 'published',
#                 },
#             )
#             if created:
#                 AdmissionCycle.objects.get_or_create(
#                     university=pd_data['university'],
#                     program=program,
#                     name='Fall 2026',
#                     defaults={
#                         'open_date': now,
#                         'close_date': now + timedelta(days=90),
#                         'status': 'open',
#                     },
#                 )
#
#         self.stdout.write(self.style.SUCCESS('Seed data created successfully'))

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed data is deprecated. Use the /portal/ UI to create programs and cycles.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            'Seed data command is deprecated. '
            'Use the /portal/ UI to manage programs and admission cycles. '
            'Django admin is still available for emergency use.'
        ))