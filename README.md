# Automatize — Plataforma

O "motor" da Automatize: agentes de WhatsApp (Margarida Matias e Marina Manuel) que respondem aos clientes de cada negócio, marcam na agenda e enviam lembretes. Mais tarde entram os agentes de voz e os assistentes pessoais Jasper e Jasmin (ver o plano em PDF).

## Estado: fase 0 (base técnica)

| Parte | Ficheiro | Estado |
|---|---|---|
| Servidor e webhook do WhatsApp | `src/server.ts`, `src/whatsapp.ts` | Pronto, à espera das chaves |
| Agente (Claude + ferramentas de agenda) | `src/agent.ts`, `src/personas.ts` | Pronto, à espera da chave |
| Cálculo de vagas e lembretes | `src/agenda.ts` | Pronto |
| Dados | `src/store.ts` (memória), `supabase/migrations/` | Memória agora; Supabase na fase 1 |
| Painel do cliente | — | Fase 1 |

## Como correr

```bash
npm install
cp .env.example .env   # preencha as chaves (nunca envie o .env para o GitHub)
npm test               # testes, sem rede e sem chaves
npm run dev            # servidor em http://localhost:3000
```

`GET /health` mostra quais chaves ainda faltam.

## Ligar ao WhatsApp (quando houver chaves)

1. No Meta for Developers, crie a app do tipo Business e adicione o produto WhatsApp.
2. Copie o token, o Phone Number ID e o App Secret para o `.env`.
3. Em Webhooks, use o endereço público `https://SEU-DOMINIO/webhook` e o mesmo `META_VERIFY_TOKEN` do `.env`. Subscreva o campo `messages`.

## Notas do agente

- Modelo `claude-opus-5-5`, com reserva automática ativada (`fallbacks: "default"`): se o modelo principal recusar um pedido por política, a API tenta outro modelo sozinha.
- O agente nunca inventa horários: consulta `ver_vagas` e o servidor volta a confirmar a vaga antes de marcar.
- Um cliente só pode ver e cancelar as próprias marcações.
