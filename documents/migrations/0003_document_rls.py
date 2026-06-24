from django.db import migrations


def run_rls_sql(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            'ALTER TABLE documents_applicationdocument ENABLE ROW LEVEL SECURITY;'
        )
        cursor.execute(
            "CREATE POLICY tenant_isolation ON documents_applicationdocument "
            "USING (university_id = current_setting('app.current_university_id')::uuid);"
        )


def unrun_rls_sql(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            'ALTER TABLE documents_applicationdocument DISABLE ROW LEVEL SECURITY;'
        )
        cursor.execute(
            'DROP POLICY IF EXISTS tenant_isolation ON documents_applicationdocument;'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0002_applicationdocument_university'),
    ]

    operations = [
        migrations.RunPython(run_rls_sql, unrun_rls_sql),
    ]
