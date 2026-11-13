# Automatize — Plataforma

A plataforma da Automatize assenta no **[DeskcommCRM](https://github.com/melgarafael/DeskcommCRM)**, um CRM de WhatsApp com agentes de IA, de código aberto (licença MIT). Decisão do dono em 13/11/2026: usar o DeskcommCRM como base, com o **canal oficial da Meta** (WhatsApp Cloud API).

## Porque não copiamos o código para aqui

O DeskcommCRM foi feito para ser personalizado **por configuração**, sem alterar o código: nome, logótipo, país, moeda, fuso horário, canal da Meta e agentes definem-se no `.env` e nas telas de administração. Se alterássemos o código, perdíamos as atualizações que o autor publica quase todos os dias (mais de 17 mil alterações até hoje).

Por isso este repositório guarda só **o que é da Automatize**:

| Pasta | O que tem |
|---|---|
| `instalacao/` | Guia passo a passo e as variáveis da Automatize para o `.env` |
| `agentes/` | Instruções da Margarida Matias e da Marina Manuel, e o foco de cada setor |
| `LICENCA-TERCEIROS.md` | Aviso da licença MIT do DeskcommCRM (obrigatório manter) |

## O que o DeskcommCRM já traz (e já não precisamos de construir)

- Caixa de entrada do WhatsApp em tempo real, com várias pessoas e vários números.
- Canal oficial da Meta (tela Admin › API Oficial), além do canal por código QR.
- Agentes de IA com Claude (Anthropic), base de conhecimento por cliente e passagem para humano.
- Agenda completa: horários por serviço, vagas livres, marcar, remarcar, cancelar, confirmar, lembretes e Google Agenda.
- Funil de vendas, contactos, etiquetas, automações QUANDO/SE/ENTÃO.
- Angola já suportada: fuso de Luanda, kwanza (AOA) e formato de números de Angola.
- Vários negócios na mesma instalação, cada um só vê os seus dados.
- Trabalhador de voz (SIP), base para os agentes de voz da fase 3.

## Versão de referência

Testado contra o DeskcommCRM `main` no commit `7c2c3c7` (13/11/2026). Atualizar: ver `instalacao/GUIA.md`.

## Protótipo anterior

O servidor próprio da fase 0 (agente, agenda e base de dados feitos de raiz) ficou guardado na etiqueta `prototipo-fase0`. Foi substituído porque o DeskcommCRM já faz tudo isso, testado em produção.
