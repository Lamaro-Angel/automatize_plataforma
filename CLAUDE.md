# Notas para quem trabalha neste repositório

- Node 20+, TypeScript, ESM (`.js` nos imports). Testes: `npm test` (vitest), tipos: `npm run typecheck`.
- Textos para clientes em português de Angola. Nunca escrever chaves no código; tudo vem do `.env`.
- O agente usa `client.beta.messages.create` com `betas: ["server-side-fallback-2026-07-01"]` e `fallbacks: "default"`. Não usar `tool_choice` forçado.
- Ferramentas novas: `strict: true`, `additionalProperties: false`, e testes com o cliente falso em `tests/agent.test.ts`.
