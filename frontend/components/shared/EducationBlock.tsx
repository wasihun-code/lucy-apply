'use client'

import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

export type EducationEntry = {
  level?: string
  institution?: string
  country?: string
  programme?: string
  study_language?: string
  awarded_qualification?: string
  expected_graduation?: string
}

type EducationBlockProps = {
  entry: EducationEntry
  index: number
  totalCount: number
  onChange: (index: number, field: string, value: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (index: number) => void
}

export function EducationBlock({
  entry,
  index,
  totalCount,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: EducationBlockProps) {
  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange(index, field, e.target.value)
    }
  }

  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-400 uppercase tracking-wider">
          Education {index + 1}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            icon={<ChevronUp size={14} />}
            aria-label="Move up"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            icon={<ChevronDown size={14} />}
            aria-label="Move down"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(index)}
            icon={<Trash2 size={14} />}
            aria-label="Delete entry"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Level of education" htmlFor={`edu-${index}-level`} required>
          <Select
            id={`edu-${index}-level`}
            value={entry.level ?? ''}
            onChange={handleChange('level')}
          >
            <option value="">Select level</option>
            <option value="secondary">Secondary</option>
            <option value="bachelor">Bachelor&apos;s</option>
            <option value="master">Master&apos;s</option>
            <option value="doctorate">Doctorate</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField
          label="Expected graduation"
          htmlFor={`edu-${index}-grad`}
          hint="YYYY-MM format"
        >
          <Input
            id={`edu-${index}-grad`}
            type="month"
            value={entry.expected_graduation ?? ''}
            onChange={handleChange('expected_graduation')}
          />
        </FormField>

        <FormField label="Institution name" htmlFor={`edu-${index}-inst`} required>
          <Input
            id={`edu-${index}-inst`}
            value={entry.institution ?? ''}
            onChange={handleChange('institution')}
            placeholder="Name of institution"
          />
        </FormField>

        <FormField label="Country" htmlFor={`edu-${index}-country`} required>
          <Select
            id={`edu-${index}-country`}
            value={entry.country ?? ''}
            onChange={handleChange('country')}
          >
            <option value="">Select country</option>
            <option value="ET">Ethiopia</option>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="KE">Kenya</option>
            <option value="ZA">South Africa</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField label="Programme name" htmlFor={`edu-${index}-prog`}>
          <Input
            id={`edu-${index}-prog`}
            value={entry.programme ?? ''}
            onChange={handleChange('programme')}
            placeholder="Programme name"
          />
        </FormField>

        <FormField label="Study language" htmlFor={`edu-${index}-lang`}>
          <Select
            id={`edu-${index}-lang`}
            value={entry.study_language ?? ''}
            onChange={handleChange('study_language')}
          >
            <option value="">Select language</option>
            <option value="english">English</option>
            <option value="amharic">Amharic</option>
            <option value="french">French</option>
            <option value="arabic">Arabic</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField label="Awarded qualification" htmlFor={`edu-${index}-qual`}>
          <Input
            id={`edu-${index}-qual`}
            value={entry.awarded_qualification ?? ''}
            onChange={handleChange('awarded_qualification')}
            placeholder="e.g. High School Diploma"
          />
        </FormField>
      </div>
    </div>
  )
}
