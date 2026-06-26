from django.contrib import admin

from .models import AuditLogEntry


@admin.register(AuditLogEntry)
class AuditLogEntryAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'action', 'entity_type', 'actor_type', 'university']
    list_filter = ['action', 'entity_type', 'actor_type']
    search_fields = ['entity_id']
    readonly_fields = [f.name for f in AuditLogEntry._meta.get_fields()]
