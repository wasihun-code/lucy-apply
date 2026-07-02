from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from identity.models import User
from universities.models import University


class Command(BaseCommand):
    help = 'Remove all seed data created by seed_data'

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help='Skip confirmation prompt')

    def handle(self, *args, **options):
        db_name = settings.DATABASES['default']['NAME']
        db_engine = settings.DATABASES['default']['ENGINE']
        self.stdout.write(f'Database: {db_engine} @ {db_name}')

        if not options['yes']:
            confirm = input(
                'This will delete all seed data '
                '(universities, programs, applications, users, etc). Continue? [y/N]: '
            )
            if confirm.lower() != 'y':
                return self.stdout.write(self.style.WARNING('Cancelled.'))

        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM universities_university")
            raw_before = cursor.fetchone()[0]
        self.stdout.write(f'Universities (raw SQL): {raw_before}')

        if raw_before == 0:
            self.stdout.write('Database is already clean.')
            remaining = User.objects.filter(is_superuser=False).count()
            if remaining:
                self.stdout.write(f'Cleaning {remaining} orphaned users...')
                User.objects.filter(is_superuser=False).delete()
            return

        # --- ORM approach ---
        self.stdout.write('Deleting via ORM (cascade from University)...')
        deleted_counts = University.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(
            f'ORM deleted: {_fmt(deleted_counts[1])}'
        ))

        remaining = User.objects.filter(is_superuser=False).count()
        if remaining:
            self.stdout.write(f'Cleaning {remaining} non-superuser users...')
            d2 = User.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS(f'  Deleted: {_fmt(d2[1])}'))

        # --- Verify ---
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM universities_university")
            raw_after = cursor.fetchone()[0]
        self.stdout.write(f'Universities after (raw SQL): {raw_after}')

        if raw_after == 0:
            self.stdout.write(self.style.SUCCESS('Seed data removed successfully'))
            return

        # --- Fallback raw SQL ---
        self.stdout.write(self.style.WARNING(
            f'ORM left {raw_after} universities! Trying raw SQL DELETE...'
        ))
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF")
            cursor.execute("DELETE FROM universities_university")
            cursor.execute("PRAGMA foreign_keys = ON")
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM universities_university")
            now = cursor.fetchone()[0]
        if now == 0:
            self.stdout.write(self.style.SUCCESS('Forced via raw SQL.'))
        else:
            self.stdout.write(self.style.ERROR(f'FAILED — {now} universities remain'))


def _fmt(counts: dict[str, int]) -> str:
    return ', '.join(
        f'{v} {k.split(".")[-1].replace("_", " ")}'
        for k, v in counts.items()
    )
