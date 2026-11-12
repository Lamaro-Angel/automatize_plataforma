/** Configuração lida do ambiente. Nenhuma chave fica no código. */
export interface Config {
  port: number;
  whatsappToken?: string;
  phoneNumberId?: string;
  appSecret?: string;
  verifyToken?: string;
  anthropicKey?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    whatsappToken: env.META_WHATSAPP_TOKEN || undefined,
    phoneNumberId: env.META_PHONE_NUMBER_ID || undefined,
    appSecret: env.META_APP_SECRET || undefined,
    verifyToken: env.META_VERIFY_TOKEN || undefined,
    anthropicKey: env.ANTHROPIC_API_KEY || undefined,
  };
}

/** Lista o que falta para o agente responder no WhatsApp de verdade. */
export function missingKeys(c: Config): string[] {
  const out: string[] = [];
  if (!c.whatsappToken) out.push("META_WHATSAPP_TOKEN");
  if (!c.phoneNumberId) out.push("META_PHONE_NUMBER_ID");
  if (!c.appSecret) out.push("META_APP_SECRET");
  if (!c.verifyToken) out.push("META_VERIFY_TOKEN");
  if (!c.anthropicKey) out.push("ANTHROPIC_API_KEY");
  return out;
}
