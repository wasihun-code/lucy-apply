from django.db import migrations, models
import django.db.models.deletion


def backfill_university(apps, schema_editor):
    ApplicationDocument = apps.get_model('documents', 'ApplicationDocument')
    for doc in ApplicationDocument.objects.select_related('application').iterator():
        doc.university_id = doc.application.university_id
        doc.save(update_fields=['university_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
        ('universities', '0003_alter_university_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='applicationdocument',
            name='university',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='universities.university',
            ),
        ),
        migrations.RunPython(backfill_university, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='applicationdocument',
            name='university',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='universities.university',
            ),
        ),
    ]
