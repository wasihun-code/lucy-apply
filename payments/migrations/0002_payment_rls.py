from django.db import migrations


def run_rls_sql(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('ALTER TABLE payments_payment ENABLE ROW LEVEL SECURITY;')
        cursor.execute(
            "CREATE POLICY tenant_isolation ON payments_payment "
            "USING (university_id = current_setting('app.current_university_id')::uuid);"
        )


def unrun_rls_sql(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('ALTER TABLE payments_payment DISABLE ROW LEVEL SECURITY;')
        cursor.execute('DROP POLICY IF EXISTS tenant_isolation ON payments_payment;')


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(run_rls_sql, unrun_rls_sql),
    ]
