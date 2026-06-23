from django.contrib import admin
from .models import User, Applicant, UniversityStaff, PlatformAdmin


class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'account_status', 'is_staff')
    search_fields = ('email', 'full_name')
    list_filter = ('account_status',)


admin.site.register(User, UserAdmin)
admin.site.register(Applicant)
admin.site.register(UniversityStaff)
admin.site.register(PlatformAdmin)
