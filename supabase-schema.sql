-- Housemate Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Tasks table
create table if not exists tasks (
  id text primary key,
  title text not null,
  category text not null default 'property',
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'seasonal', 'as-needed', 'custom')),
  custom_interval_days integer,
  time_of_day text not null default 'anytime' check (time_of_day in ('morning', 'anytime', 'evening')),
  estimated_minutes integer not null default 10,
  overview text,
  steps jsonb default '[]'::jsonb,
  description text not null default '',
  media_attachments jsonb default '[]'::jsonb,
  priority text not null default 'routine' check (priority in ('critical', 'important', 'routine')),
  requires_medication boolean not null default false,
  medication_text text,
  requires_photo boolean not null default false,
  is_active boolean not null default true,
  done_properly_text text,
  red_flags_text text,
  season_profiles jsonb default '[]'::jsonb,
  how_to_guide_ids jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories table
create table if not exists categories (
  id text primary key,
  label text not null,
  color text not null default '#78716C',
  icon text not null default 'Folder',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Daily completions (which tasks are done on which dates)
create table if not exists daily_completions (
  date text not null,
  task_id text not null references tasks(id) on delete cascade,
  completed_by text not null default 'sitter',
  completed_at timestamptz not null default now(),
  primary key (date, task_id)
);

-- Completion logs (detailed audit trail)
create table if not exists completion_logs (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by text not null default 'sitter',
  notes text,
  photo_urls jsonb default '[]'::jsonb,
  flagged_needs_attention boolean not null default false
);

-- App config (global settings)
create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- How-to guides
create table if not exists how_to_guides (
  id text primary key,
  title text not null,
  description text,
  media_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on tasks
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Enable realtime on key tables
alter publication supabase_realtime add table daily_completions;
alter publication supabase_realtime add table completion_logs;
alter publication supabase_realtime add table tasks;

-- RLS Policies (permissive for now — backend uses service role key)
-- These protect against direct client access via anon key

alter table tasks enable row level security;
alter table categories enable row level security;
alter table daily_completions enable row level security;
alter table completion_logs enable row level security;
alter table app_config enable row level security;
alter table how_to_guides enable row level security;

-- Allow anon read access to all tables (sitter can read everything)
create policy "Allow anon read on tasks" on tasks for select using (true);
create policy "Allow anon read on categories" on categories for select using (true);
create policy "Allow anon read on daily_completions" on daily_completions for select using (true);
create policy "Allow anon read on completion_logs" on completion_logs for select using (true);
create policy "Allow anon read on app_config" on app_config for select using (true);
create policy "Allow anon read on how_to_guides" on how_to_guides for select using (true);

-- Allow anon insert on completions (sitter can mark tasks done)
create policy "Allow anon insert on daily_completions" on daily_completions for insert with check (true);
create policy "Allow anon insert on completion_logs" on completion_logs for insert with check (true);
create policy "Allow anon delete on daily_completions" on daily_completions for delete using (true);

-- Insert default categories
insert into categories (id, label, color, icon, sort_order) values
  ('dog', 'Dog Care', '#8B5CF6', 'Dog', 0),
  ('chickens', 'Chickens', '#F97316', 'Bird', 1),
  ('aquarium', 'Aquarium', '#0EA5E9', 'Fish', 2),
  ('garden', 'Garden', '#22C55E', 'Flower2', 3),
  ('mowers', 'Mowers', '#6366F1', 'Bot', 4),
  ('property', 'Property', '#78716C', 'Home', 5),
  ('seasonal', 'Seasonal', '#EAB308', 'Sun', 6)
on conflict (id) do nothing;

-- Insert default app config
insert into app_config (key, value) values
  ('current_season', 'summer'),
  ('last_modified', now()::text)
on conflict (key) do nothing;

-- Insert seed tasks (from mobile/src/lib/seed-tasks.ts)
insert into tasks (id, title, category, frequency, time_of_day, estimated_minutes, overview, steps, description, priority, requires_medication, medication_text, requires_photo, is_active, done_properly_text, red_flags_text, season_profiles) values
(
  'scout-morning',
  'Feed Scout — Morning',
  'dog',
  'daily',
  'morning',
  10,
  'Scout''s morning feed with medications. Scout is a senior dog who needs his food prepared a specific way.',
  '["Get Scout''s bowl from the kitchen bench", "Add 1 cup of dry food from the container in the laundry", "Add warm water and mix until slightly softened", "Mix in arthritis tablet (from container marked SCOUT AM)", "Place bowl in his usual spot by the back door", "Fresh water in his water bowl", "Let him out for a toilet break after eating"]'::jsonb,
  'Scout''s morning feed with medications.',
  'critical',
  true,
  'Arthritis tablet (AM container) mixed into softened food',
  false,
  true,
  'Bowl is empty, Scout has eaten everything, water bowl is full, Scout has been outside for a toilet break',
  'Scout not eating, limping more than usual, vomiting, unusual lethargy',
  '[]'::jsonb
),
(
  'scout-evening',
  'Feed Scout — Evening',
  'dog',
  'daily',
  'evening',
  10,
  'Scout''s evening feed. Same process as morning but with PM medication.',
  '["Get Scout''s bowl from the kitchen bench", "Add 1 cup of dry food", "Add warm water and mix until slightly softened", "Mix in joint supplement (from container marked SCOUT PM)", "Place bowl in his usual spot", "Fresh water in his water bowl", "Final toilet break before settling for the night"]'::jsonb,
  'Scout''s evening feed.',
  'critical',
  true,
  'Joint supplement (PM container) mixed into softened food',
  false,
  true,
  'Bowl is empty, water is fresh, Scout has had his final toilet break',
  'Scout not eating, seems in pain, difficulty getting up or lying down',
  '[]'::jsonb
),
(
  'chickens-morning',
  'Chicken Care — Morning',
  'chickens',
  'daily',
  'morning',
  15,
  'Let the chickens out, feed and water them, collect any eggs.',
  '["Open the coop door — they''ll come out on their own", "Check feed container and top up if below half", "Check water — rinse and refill if dirty", "Scatter some scratch mix in the run for enrichment", "Collect any eggs from nesting boxes", "Quick visual check — all birds present and looking healthy"]'::jsonb,
  'Morning chicken care.',
  'important',
  false,
  null,
  false,
  true,
  'Coop is open, feed and water are topped up, eggs collected, all chickens accounted for and active',
  'Chicken sitting alone and puffed up, bloody feathers, soft-shelled or unusual eggs, predator damage to coop',
  '[]'::jsonb
),
(
  'chickens-evening',
  'Lock Up Chickens',
  'chickens',
  'daily',
  'evening',
  5,
  'Make sure all chickens are in the coop and lock up for the night.',
  '["Wait until dusk — chickens will go in on their own", "Count all chickens are inside", "Close and latch the coop door securely", "Check the run gate is closed"]'::jsonb,
  'Evening chicken lockup.',
  'important',
  false,
  null,
  false,
  true,
  'All chickens inside, coop door latched, run gate closed',
  'A chicken missing at lockup, signs of predator activity, coop damage',
  '[]'::jsonb
),
(
  'aquarium-daily',
  'Aquarium — Daily Check',
  'aquarium',
  'daily',
  'morning',
  5,
  'Feed the fish and check equipment is running.',
  '["Feed fish — one small pinch of flake food", "Check filter is running (you should see water flowing)", "Check heater light is on", "Quick look — all fish visible and swimming normally", "Check for any dead fish or unusual behavior"]'::jsonb,
  'Daily aquarium care.',
  'important',
  false,
  null,
  false,
  true,
  'Fish are fed, filter running, heater on, all fish accounted for',
  'Dead fish, cloudy water, filter not running, heater light off, fish gasping at surface',
  '[]'::jsonb
),
(
  'aquarium-weekly',
  'Aquarium — Weekly Clean',
  'aquarium',
  'weekly',
  'anytime',
  30,
  'Weekly partial water change and glass cleaning.',
  '["Unplug heater 15 mins before starting", "Use gravel vacuum to remove 25% of water into bucket", "Clean inside glass with algae scraper", "Refill with dechlorinated water (add 2 drops of conditioner per bucket)", "Plug heater back in", "Wipe outside glass and light cover"]'::jsonb,
  'Weekly aquarium maintenance.',
  'important',
  false,
  null,
  false,
  true,
  'Water is clear, glass is clean, water level is correct, heater is plugged back in',
  'Unusual smell, fish acting stressed after water change, equipment not working after cleaning',
  '[]'::jsonb
),
(
  'garden-daily',
  'Garden — Daily Check & Water',
  'garden',
  'daily',
  'morning',
  15,
  'Check garden beds and water as needed.',
  '["Walk through veggie garden — check for wilting or pest damage", "Water veggie beds if soil is dry (poke finger in — if dry past first knuckle, water)", "Check potted plants on deck — these dry out faster", "Water any pots that need it", "Pick any ripe produce"]'::jsonb,
  'Daily garden care.',
  'important',
  false,
  null,
  false,
  true,
  'Garden beds checked, dry plants watered, ripe produce picked',
  'Major pest infestation, plants dying despite watering, broken irrigation, animal damage to garden',
  '["summer"]'::jsonb
),
(
  'garden-weekly',
  'Garden — Weekly Maintenance',
  'garden',
  'weekly',
  'anytime',
  30,
  'Weekly garden maintenance tasks.',
  '["Pull any obvious weeds from garden beds", "Check mulch levels — add more if soil is showing through", "Trim any dead or damaged growth", "Check compost bin — add scraps, turn if needed", "Empty any standing water (mosquito prevention)"]'::jsonb,
  'Weekly garden work.',
  'routine',
  false,
  null,
  false,
  true,
  'Weeds pulled, beds look tidy, compost managed, no standing water',
  'Tree branch damage, flooding or drainage issues, large sections of garden dying',
  '[]'::jsonb
),
(
  'mower-check',
  'Robot Mower — Daily Check',
  'mowers',
  'daily',
  'morning',
  5,
  'Check the robot mower is running correctly.',
  '["Check mower is on its dock or mowing (check the app if unsure)", "Look for any error messages on the display", "Quick visual check of the lawn area for obstacles", "Clear any fallen branches or toys from the lawn"]'::jsonb,
  'Daily mower check.',
  'routine',
  false,
  null,
  false,
  true,
  'Mower is operational, lawn area is clear of obstacles',
  'Mower stuck or showing error, mower not returning to dock, unusual cutting patterns, mower missing from dock',
  '[]'::jsonb
),
(
  'property-morning',
  'Property — Morning Walk-Around',
  'property',
  'daily',
  'morning',
  10,
  'Quick morning check of the property.',
  '["Walk around the house exterior — check for anything unusual", "Check all gates are closed and latched", "Look for any storm damage or fallen branches", "Check shed and garage doors are secure", "Bring in any delivered packages"]'::jsonb,
  'Morning property check.',
  'important',
  false,
  null,
  false,
  true,
  'All gates secure, no damage spotted, packages collected',
  'Signs of break-in attempt, major storm damage, flooding, unusual activity',
  '[]'::jsonb
),
(
  'property-weekly',
  'Property — Weekly Deck & Outdoor',
  'property',
  'weekly',
  'anytime',
  20,
  'Weekly property maintenance.',
  '["Sweep the deck and outdoor entertaining area", "Clear leaves from gutters (ground level only — no ladders!)", "Check outdoor lights are working", "Wipe down outdoor furniture", "Empty outdoor bins if getting full"]'::jsonb,
  'Weekly property maintenance.',
  'routine',
  false,
  null,
  false,
  true,
  'Deck swept, gutters clear at ground level, outdoor area tidy',
  'Blocked gutters causing water issues, deck boards damaged or loose, outdoor lights all out',
  '[]'::jsonb
),
(
  'pool-summer',
  'Pool — Summer Care',
  'seasonal',
  'daily',
  'morning',
  10,
  'Daily pool maintenance during summer.',
  '["Check pool pump is running", "Skim surface for leaves and debris", "Check water level — should be at mid-tile", "Test water with strip (from pool shed) — pH should be 7.2-7.6", "Add chlorine if reading is low (instructions on container)"]'::jsonb,
  'Summer pool care.',
  'important',
  false,
  null,
  false,
  true,
  'Pool is clean, pump running, chemicals in range',
  'Pool turning green, pump not working, water level dropping rapidly, chemical readings way off',
  '["summer"]'::jsonb
),
(
  'firewood-winter',
  'Firewood — Winter Stock',
  'seasonal',
  'daily',
  'morning',
  10,
  'Keep the firewood stocked for the wood heater.',
  '["Bring in enough firewood for the day from the woodshed", "Stack neatly by the fireplace", "Check kindling supply — split some small pieces if running low", "Clean ash from fireplace if building up (ash bucket in laundry)"]'::jsonb,
  'Winter firewood management.',
  'important',
  false,
  null,
  false,
  true,
  'Firewood stocked by fireplace, kindling available, ash managed',
  'Running very low on firewood, chimney smoking back into house, fireplace not drawing properly',
  '["winter"]'::jsonb
),
(
  'irrigation-summer',
  'Irrigation — Summer Check',
  'seasonal',
  'weekly',
  'morning',
  15,
  'Weekly check of the irrigation system during summer.',
  '["Turn on each irrigation zone manually (controller in garage)", "Walk each zone — check all sprinklers are working", "Look for leaks, broken heads, or blocked nozzles", "Adjust any sprinklers that are watering paths/driveways", "Check the timer schedule is still correct"]'::jsonb,
  'Summer irrigation check.',
  'routine',
  false,
  null,
  false,
  true,
  'All zones checked, sprinklers working, no leaks, timer correct',
  'Major leak, zone not working at all, controller showing error, water pressure issues',
  '["summer"]'::jsonb
)
on conflict (id) do nothing;
