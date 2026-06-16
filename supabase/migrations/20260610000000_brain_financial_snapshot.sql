-- Snapshot del brain (CSV → payload) para sync a discreción desde la app
create table if not exists public.brain_financial_snapshot (
  id text primary key default 'household',
  payload jsonb not null,
  source text not null default 'csv',
  updated_at timestamptz not null default now()
);

create index if not exists brain_financial_snapshot_updated_at_idx
  on public.brain_financial_snapshot (updated_at desc);

alter table public.brain_financial_snapshot enable row level security;

drop policy if exists brain_financial_snapshot_household_select on brain_financial_snapshot;
drop policy if exists brain_financial_snapshot_household_insert on brain_financial_snapshot;
drop policy if exists brain_financial_snapshot_household_update on brain_financial_snapshot;
drop policy if exists brain_financial_snapshot_household_delete on brain_financial_snapshot;

create policy brain_financial_snapshot_household_select on brain_financial_snapshot
  for select to authenticated
  using (auth.uid() in (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

create policy brain_financial_snapshot_household_insert on brain_financial_snapshot
  for insert to authenticated
  with check (auth.uid() in (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

create policy brain_financial_snapshot_household_update on brain_financial_snapshot
  for update to authenticated
  using (auth.uid() in (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ))
  with check (auth.uid() in (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

create policy brain_financial_snapshot_household_delete on brain_financial_snapshot
  for delete to authenticated
  using (auth.uid() in (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));
