create table if not exists public.profiles (
  id text primary key,
  uid text unique,
  email text not null,
  full_name text not null,
  role text not null,
  status text not null default 'Ativo',
  avatar_url text,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);

create table if not exists public.user_roles (
  uid text primary key,
  role_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructor_courses (
  id bigserial primary key,
  instructor_uid text not null,
  title text not null,
  category text,
  duration text,
  image_url text,
  price_type text not null default 'paid',
  price_numeric numeric(12,2),
  card_description text,
  full_description text,
  status text not null default 'Publicado',
  rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  relevance_score integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instructor_courses_instructor_uid on public.instructor_courses (instructor_uid);

create table if not exists public.instructor_course_modules (
  id bigserial primary key,
  course_id bigint not null references public.instructor_courses(id) on delete cascade,
  module_uid text,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_modules_course_id on public.instructor_course_modules (course_id);

create table if not exists public.instructor_course_lessons (
  id bigserial primary key,
  module_id bigint not null references public.instructor_course_modules(id) on delete cascade,
  lesson_uid text,
  title text not null,
  lesson_type text not null,
  content text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_lessons_module_id on public.instructor_course_lessons (module_id);

create table if not exists public.course_enrollments (
  id bigserial primary key,
  course_id bigint not null references public.instructor_courses(id) on delete cascade,
  student_uid text not null,
  student_name text,
  student_email text,
  progress integer not null default 0,
  last_activity_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_enrollments_course_id on public.course_enrollments (course_id);
create index if not exists idx_course_enrollments_student_uid on public.course_enrollments (student_uid);

create table if not exists public.course_questions (
  id bigserial primary key,
  course_id bigint references public.instructor_courses(id) on delete set null,
  instructor_uid text not null,
  student_uid text,
  student_name text,
  lesson_title text,
  question_text text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  answer_text text
);

create index if not exists idx_course_questions_instructor_uid on public.course_questions (instructor_uid);
create index if not exists idx_course_questions_status on public.course_questions (status);

create table if not exists public.instructor_transactions (
  id bigserial primary key,
  instructor_uid text not null,
  txn_type text not null,
  description text not null,
  amount numeric(12,2) not null,
  status text not null default 'completed',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_instructor_transactions_instructor_uid on public.instructor_transactions (instructor_uid);
