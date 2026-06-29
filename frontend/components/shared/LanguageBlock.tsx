'use client'

import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

export type ForeignLanguageEntry = {
  language?: string
  proof?: string
  proficiency?: string
  score?: string
  years_experience?: number
}

type LanguageBlockProps = {
  entry: ForeignLanguageEntry
  index: number
  totalCount: number
  onChange: (index: number, field: string, value: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (index: number) => void
}

export function LanguageBlock({
  entry,
  index,
  totalCount,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: LanguageBlockProps) {
  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange(index, field, e.target.value)
    }
  }

  const showScore = entry.proof && entry.proof !== 'none' && entry.proof !== ''

  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-400 uppercase tracking-wider">
          Language {index + 1}
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
        <FormField label="Foreign language" htmlFor={`lang-${index}-name`} required>
          <Select
            id={`lang-${index}-name`}
            value={entry.language ?? ''}
            onChange={handleChange('language')}
          >
            <option value="">Select language</option>
            <option value="english">English</option>
            <option value="french">French</option>
            <option value="arabic">Arabic</option>
            <option value="spanish">Spanish</option>
            <option value="german">German</option>
            <option value="chinese">Chinese</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField label="Proficiency" htmlFor={`lang-${index}-prof`} required>
          <Select
            id={`lang-${index}-prof`}
            value={entry.proficiency ?? ''}
            onChange={handleChange('proficiency')}
          >
            <option value="">Select level</option>
            <option value="A1">A1 - Beginner</option>
            <option value="A2">A2 - Elementary</option>
            <option value="B1">B1 - Intermediate</option>
            <option value="B2">B2 - Upper Intermediate</option>
            <option value="C1">C1 - Advanced</option>
            <option value="C2">C2 - Proficient</option>
          </Select>
        </FormField>

        <FormField label="Proof (certificate/test)" htmlFor={`lang-${index}-proof`}>
          <Select
            id={`lang-${index}-proof`}
            value={entry.proof ?? ''}
            onChange={handleChange('proof')}
          >
            <option value="none">None</option>
            <option value="ielts">IELTS</option>
            <option value="toefl">TOEFL</option>
            <option value="cambridge">Cambridge</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        {showScore && (
          <FormField label="Score" htmlFor={`lang-${index}-score`}>
            <Input
              id={`lang-${index}-score`}
              value={entry.score ?? ''}
              onChange={handleChange('score')}
              placeholder="e.g. 7.5"
            />
          </FormField>
        )}

        <FormField label="Years of study/experience" htmlFor={`lang-${index}-years`}>
          <div className="flex items-center gap-2">
            <Input
              id={`lang-${index}-years`}
              type="number"
              min={0}
              max={50}
              value={entry.years_experience ?? ''}
              onChange={handleChange('years_experience')}
              className="w-24"
            />
            <span className="text-sm text-text-400">years</span>
          </div>
        </FormField>
      </div>
    </div>
  )
}
