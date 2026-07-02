from django.contrib import admin
from .models import User, Applicant, UniversityStaff, PlatformAdmin


class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'account_status', 'is_staff')
    search_fields = ('email', 'full_name')
    list_filter = ('account_status',)

    def save_model(self, request, obj, form, change):
        if obj.password and not obj.password.startswith('pbkdf2_'):
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)

admin.site.register(User, UserAdmin)
admin.site.register(Applicant, UserAdmin)
admin.site.register(UniversityStaff, UserAdmin)
admin.site.register(PlatformAdmin, UserAdmin)
