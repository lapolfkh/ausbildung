-- 1. Tabelle für die Termine erstellen
create table schedules (
  id bigint generated always as identity primary key,
  date text,
  time text,
  program text,
  created_by text
);

-- 2. Tabelle für die Prüfungsfreischaltung erstellen
create table exam_status (
  id bigint primary key,
  unlocked_at bigint,
  exam1_unlocked boolean,
  exam2_unlocked boolean,
  exam3_unlocked boolean,
  cooldown_until bigint
);

-- Sicherheitshinweis für RP-Zwecke: RLS deaktivieren, damit deine Website ohne Login direkt reinschreiben darf
alter table schedules disable row level security;
alter table exam_status disable row level security;
