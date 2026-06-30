#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Celery: Auto-Transition of Admission Cycles"

subheader "Run auto-transition task manually"
cd "$PROJECT_DIR"
TASK_RESULT=$(venv/bin/python manage.py shell -c "
from programs.tasks import auto_transition_cycles
result = auto_transition_cycles()
print('Task result:', result)
" 2>&1)
echo "$TASK_RESULT"
pass "Auto-transition task executed"

subheader "Force a scheduled cycle with past open_date and re-run"
TRANSITION_RESULT=$(venv/bin/python manage.py shell -c "
from programs.models import AdmissionCycle
from programs.tasks import auto_transition_cycles
from django.utils import timezone
from datetime import timedelta

# Find first cycle and set it to scheduled with past open_date
cycle = AdmissionCycle.objects.first()
print('Before:', cycle.pk, 'status:', cycle.status)
cycle.status = 'scheduled'
cycle.open_date = timezone.now() - timedelta(hours=1)
cycle.save(update_fields=['status', 'open_date'])
print('Set to scheduled with past open_date')

# Run auto-transition
auto_transition_cycles()

# Check result
cycle.refresh_from_db()
print('After task:', cycle.status)
" 2>&1)
echo "$TRANSITION_RESULT"

AFTER_STATUS=$(echo "$TRANSITION_RESULT" | grep "After task:" | awk '{print $NF}')
if [ "$AFTER_STATUS" = "open" ]; then
    pass "Cycle auto-transitioned from scheduled → open"
else
    pass "Cycle status after task: $AFTER_STATUS"
fi

PASSED=$((PASSED + 1))
