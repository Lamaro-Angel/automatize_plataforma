-- Automatize: estrutura inicial (fase 1). Cada negócio só vê os seus dados (RLS).
create extension if not exists pgcrypto;

create table negocios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  setor text not null check (setor in ('saude','beleza','restauracao','ensino','oficinas','comercio')),
  agente text not null default 'margarida' check (agente in ('margarida','marina')),
  whatsapp_phone_number_id text unique,
  contacto_humano text,
  fuso text not null default 'Africa/Luanda',
  criado_em timestamptz not null default now()
);

create table membros (
  negocio_id uuid references negocios(id) on delete cascade,
  user_id uuid not null,
  papel text not null default 'dono' check (papel in ('dono','equipa')),
  primary key (negocio_id, user_id)
);

create table servicos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nome text not null,
  duracao_min int not null check (duracao_min > 0),
  preco_kz numeric(12,2)
);

create table horarios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  abre time not null,
  fecha time not null check (fecha > abre)
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  telefone text not null,
  nome text,
  unique (negocio_id, telefone)
);

create table mensagens (
  id bigserial primary key,
  negocio_id uuid not null references negocios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  papel text not null check (papel in ('user','assistant','equipa')),
  texto text not null,
  whatsapp_id text unique,
  criado_em timestamptz not null default now()
);

create table marcacoes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  inicio timestamptz not null,
  fim timestamptz not null check (fim > inicio),
  estado text not null default 'marcada' check (estado in ('marcada','confirmada','cancelada','concluida','faltou')),
  criado_em timestamptz not null default now()
);
create index on marcacoes (negocio_id, inicio);

create table lembretes (
  id bigserial primary key,
  marcacao_id uuid not null references marcacoes(id) on delete cascade,
  enviar_em timestamptz not null,
  enviado_em timestamptz,
  canal text not null default 'whatsapp' check (canal in ('whatsapp','voz','sms'))
);
create index on lembretes (enviar_em) where enviado_em is null;

-- Segurança: cada utilizador só acede aos negócios de que é membro.
create or replace function e_membro(n uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where negocio_id = n and user_id = auth.uid());
$$;

alter table negocios enable row level security;
alter table membros enable row level security;
alter table servicos enable row level security;
alter table horarios enable row level security;
alter table clientes enable row level security;
alter table mensagens enable row level security;
alter table marcacoes enable row level security;
alter table lembretes enable row level security;

create policy "ver o proprio negocio" on negocios for all using (e_membro(id));
create policy "ver os proprios membros" on membros for select using (e_membro(negocio_id));
create policy "servicos do negocio" on servicos for all using (e_membro(negocio_id));
create policy "horarios do negocio" on horarios for all using (e_membro(negocio_id));
create policy "clientes do negocio" on clientes for all using (e_membro(negocio_id));
create policy "mensagens do negocio" on mensagens for all using (e_membro(negocio_id));
create policy "marcacoes do negocio" on marcacoes for all using (e_membro(negocio_id));
create policy "lembretes do negocio" on lembretes for all using (
  e_membro((select negocio_id from marcacoes m where m.id = marcacao_id))
);
-- O servidor do agente usa a chave de serviço (SUPABASE_SERVICE_KEY), que ignora o RLS.
