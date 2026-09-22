const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Free + open-notch backup notification channel (Telegram Bot API).
 * Disabled (no-op) unless TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
 */
export async function sendTelegramMessage(text: string): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, error: "Telegram not configured" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || "Telegram send failed" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Telegram error" };
  }
}