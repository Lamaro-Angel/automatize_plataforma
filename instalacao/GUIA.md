# Guia de instalação da plataforma Automatize

Tempo estimado: uma tarde. Custo fixo: o servidor (cerca de 10 a 20 dólares por mês) e o consumo do Claude.

## 1. O que contratar

| Item | Recomendação | Notas |
|---|---|---|
| Servidor (VPS) | 2 vCPU, 4 GB de RAM, Ubuntu, com Docker | Qualquer fornecedor serve (Hetzner, Contabo, DigitalOcean, HostGator). Europa fica mais perto de Angola do que o Brasil. |
| Domínio | ex.: `painel.automatize.ao` | Registo A a apontar para o IP do servidor. |
| Base de dados | Conta grátis em supabase.com | O instalador pode criar o projeto sozinho. |
| IA | Chave da Anthropic (console.anthropic.com) | Pôr na tela, nunca no chat. |
| WhatsApp | Meta Business verificada + app em developers.facebook.com | Canal oficial. Ver o passo 4. |

## 2. Instalar

No servidor:

```bash
git clone https://github.com/melgarafael/DeskcommCRM.git
cd DeskcommCRM
bash hostgator-setup-kit/install.sh
```

O instalador pergunta o domínio, as chaves e a senha do administrador, cria tudo, liga o HTTPS e verifica a saúde no fim. Funciona em qualquer VPS com Docker, não só na HostGator.

Depois acrescente ao `.env` as linhas de `automatize.env.example` (nome e logótipo da Automatize) e reinicie.

## 3. Configurar a primeira organização

Em Configurações › Organização:

- País: **Angola**. Moeda: **Kwanza (AOA)**. Fuso: **Luanda (Angola)**.
- Idioma da interface: português (a interface está em português do Brasil; os agentes falam português de Angola pelas instruções em `agentes/`).

## 4. Ligar o canal oficial da Meta

1. Em developers.facebook.com, crie a app (tipo Business) e adicione o produto WhatsApp.
2. No Gestor de Negócios, crie um utilizador de sistema com permissão `whatsapp_business_messaging` e `whatsapp_business_management`, e gere um token permanente.
3. No painel da Automatize: Admin › API Oficial (Meta). Cole o App ID, o App Secret, o WABA ID, o Phone Number ID e o token. A tela gera o verify token e mostra o endereço do webhook.
4. Na app da Meta › WhatsApp › Configuração, cole esse endereço e o verify token, e subscreva o campo `messages`.
5. Envie uma mensagem de teste para o número. Deve aparecer na caixa de entrada.

Atenção: fora da janela de 24 horas, a Meta só deixa enviar **modelos aprovados** (ex.: os lembretes). Crie os modelos (templates) de lembrete na gestão de modelos do canal oficial e espere a aprovação da Meta.

## 5. Criar a Margarida e a Marina

Em Agente de IA:

1. Crie um agente com o nome **Margarida Matias** e cole as instruções de `agentes/margarida-matias.md`, mais o bloco do setor do cliente em `agentes/setores.md`.
2. Repita para **Marina Manuel**.
3. Escolha o modelo Claude e ligue as ferramentas da agenda (procurar vagas, marcar, remarcar, cancelar, confirmar).
4. Ligue o agente ao número da Meta e teste a conversa.

## 6. Agenda e lembretes

Em Agenda: crie os serviços (nome e duração), os horários de cada dia, as pessoas que atendem e, se o cliente quiser, ligue o Google Agenda. Nos lembretes da agenda, configure dois avisos: 24 horas antes e 2 horas antes.

## 7. Atualizar

```bash
cd DeskcommCRM
bash hostgator-setup-kit/update.sh
```

Faz cópia de segurança antes e volta atrás sozinho se algo falhar. Como não mexemos no código, as atualizações entram sem conflitos.
