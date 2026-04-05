// Shared type definitions — mirrors mobile/src/lib/types.ts

export type TaskFrequency = 'daily' | 'weekly' | 'seasonal' | 'as-needed' | 'custom';
export type TimeOfDay = 'morning' | 'anytime' | 'evening';
export type TaskPriority = 'critical' | 'important' | 'routine';
export type TaskCategory = string;
export type SeasonProfile = 'summer' | 'winter' | 'away';
export type UserRole = 'owner' | 'sitter';

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  frequency: TaskFrequency;
  custom_interval_days?: number | null;
  time_of_day: TimeOfDay;
  estimated_minutes: number;
  overview?: string | null;
  steps?: string[] | null;
  description: string;
  media_attachments?: string[] | null;
  priority: TaskPriority;
  requires_medication: boolean;
  medication_text?: string | null;
  requires_photo: boolean;
  is_active: boolean;
  done_properly_text?: string | null;
  red_flags_text?: string | null;
  season_profiles?: SeasonProfile[] | null;
  how_to_guide_ids?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompletionLog {
  id: string;
  task_id: string;
  completed_at: string;
  completed_by: string;
  notes?: string | null;
  photo_urls?: string[] | null;
  flagged_needs_attention: boolean;
}

export interface DailyCompletion {
  date: string;
  task_id: string;
  completed_by: string;
  completed_at: string;
}

export interface HowToGuide {
  id: string;
  title: string;
  description?: string | null;
  media_urls: string[];
  created_at: string;
}

// Convert camelCase mobile format to snake_case DB format
export function taskFromMobile(t: any): Partial<Task> {
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    frequency: t.frequency,
    custom_interval_days: t.customIntervalDays ?? null,
    time_of_day: t.timeOfDay,
    estimated_minutes: t.estimatedMinutes,
    overview: t.overview ?? null,
    steps: t.steps ?? null,
    description: t.description ?? '',
    media_attachments: t.mediaAttachments ?? null,
    priority: t.priority,
    requires_medication: t.requiresMedication ?? false,
    medication_text: t.medicationText ?? null,
    requires_photo: t.requiresPhoto ?? false,
    is_active: t.isActive ?? true,
    done_properly_text: t.doneProperlyText ?? null,
    red_flags_text: t.redFlagsText ?? null,
    season_profiles: t.seasonProfiles ?? null,
    how_to_guide_ids: t.howToGuideIds ?? null,
  };
}

// Convert snake_case DB format to camelCase mobile format
export function taskToMobile(t: Task): any {
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    frequency: t.frequency,
    customIntervalDays: t.custom_interval_days ?? undefined,
    timeOfDay: t.time_of_day,
    estimatedMinutes: t.estimated_minutes,
    overview: t.overview ?? undefined,
    steps: t.steps ?? undefined,
    description: t.description,
    mediaAttachments: t.media_attachments ?? undefined,
    priority: t.priority,
    requiresMedication: t.requires_medication,
    medicationText: t.medication_text ?? undefined,
    requiresPhoto: t.requires_photo,
    isActive: t.is_active,
    doneProperlyText: t.done_properly_text ?? undefined,
    redFlagsText: t.red_flags_text ?? undefined,
    seasonProfiles: t.season_profiles ?? undefined,
    howToGuideIds: t.how_to_guide_ids ?? undefined,
  };
}

export function completionLogToMobile(c: CompletionLog): any {
  return {
    id: c.id,
    taskId: c.task_id,
    completedAt: c.completed_at,
    completedBy: c.completed_by,
    notes: c.notes ?? undefined,
    photoUrls: c.photo_urls ?? undefined,
    flaggedNeedsAttention: c.flagged_needs_attention,
  };
}
