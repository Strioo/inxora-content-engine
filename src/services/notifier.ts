export interface TeamNotificationPayload {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  qualityScore: number;
  coverImageUrl: string;
  coverAttribution: string;
  publicUrl: string;
  adminEditUrl: string;
  faqCount?: number;
  socialSnippets?: {
    linkedIn?: string;
    twitter?: string;
    newsletter?: string;
  };
}

/**
 * Sends instant team notification to Telegram Bot if credentials are configured in .env.
 */
async function sendTelegramAlert(payload: TeamNotificationPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const text = `
🚀 *[INXORA CONTENT ENGINE] Artikel Baru Terbit!*

📖 *Judul*: ${payload.title}
🏷️ *Kategori*: #${payload.category.replace(/[^a-zA-Z0-9]/g, "")}
🎯 *Skor Kualitas Audit*: ${payload.qualityScore}/100 [PASSED ✅]
❓ *FAQ Rich Snippets*: ${payload.faqCount || 0} Pertanyaan & Jawaban Terindeks
📸 *Visual Cover*: ${payload.coverAttribution}

🌐 *Live URL*:
${payload.publicUrl}

🛠️ *Admin Edit URL*:
${payload.adminEditUrl}

${payload.socialSnippets?.linkedIn ? `💼 *Draft LinkedIn Post Preview*:\n${payload.socialSnippets.linkedIn.slice(0, 200)}...` : ""}
    `.trim();

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("⚠️ Telegram alert failed:", err);
    return false;
  }
}

/**
 * Sends instant team notification to Discord Webhook if configured in .env.
 */
async function sendDiscordAlert(payload: TeamNotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  try {
    const embed = {
      title: `🚀 ${payload.title}`,
      url: payload.publicUrl,
      description: payload.excerpt,
      color: 0x4f46e5, // Inxora Brand Indigo
      fields: [
        { name: "Kategori", value: payload.category, inline: true },
        { name: "Skor Kualitas", value: `${payload.qualityScore}/100 ✅`, inline: true },
        { name: "FAQ Snippets", value: `${payload.faqCount || 0} Q&As`, inline: true },
        { name: "Cover Visual", value: payload.coverAttribution, inline: false },
        { name: "Admin Dashboard", value: `[Buka di Admin Portal](${payload.adminEditUrl})`, inline: false },
      ],
      image: { url: payload.coverImageUrl },
      footer: { text: "Inxora Autonomous Content Engine" },
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `📢 **Artikel baru telah terbit di inxorastudio.com!**`,
        embeds: [embed],
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("⚠️ Discord alert failed:", err);
    return false;
  }
}

/**
 * Sends instant social media / distribution alert to generic SOCIAL_WEBHOOK_URL (e.g. n8n, Make, Slack, or custom webhook).
 */
export async function sendSocialWebhookAlert(payload: TeamNotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.SOCIAL_WEBHOOK_URL;
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "article.published",
        timestamp: new Date().toISOString(),
        article: {
          title: payload.title,
          slug: payload.slug,
          excerpt: payload.excerpt,
          category: payload.category,
          qualityScore: payload.qualityScore,
          publicUrl: payload.publicUrl,
          coverImageUrl: payload.coverImageUrl,
          coverAttribution: payload.coverAttribution,
          adminEditUrl: payload.adminEditUrl,
          faqCount: payload.faqCount ?? 0,
        },
        social: {
          linkedIn: payload.socialSnippets?.linkedIn || "",
          twitter: payload.socialSnippets?.twitter || "",
          newsletter: payload.socialSnippets?.newsletter || "",
        },
      }),
    });

    return res.ok;
  } catch (err: unknown) {
    console.warn("⚠️ Social webhook alert failed:", err);
    return false;
  }
}

/**
 * Dispatches notifications across all configured communication channels (Telegram, Discord, Social Webhook, and Console).
 */
export async function dispatchTeamNotification(payload: TeamNotificationPayload): Promise<{
  telegram: boolean;
  discord: boolean;
  socialWebhook: boolean;
}> {
  console.log(`\n📣 [Team Notification Hub] Dispatching publication alert for "${payload.title}"...`);

  const [telegramResult, discordResult, socialWebhookResult] = await Promise.all([
    sendTelegramAlert(payload),
    sendDiscordAlert(payload),
    sendSocialWebhookAlert(payload),
  ]);

  if (telegramResult) {
    console.log(`   ✓ Telegram Bot Alert dispatched successfully to Chat ID: ${process.env.TELEGRAM_CHAT_ID}`);
  } else if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log(`   ℹ️ Telegram alerts skipped (TELEGRAM_BOT_TOKEN not configured)`);
  } else {
    console.log(`   ⚠️ Telegram alert delivery failed`);
  }

  if (discordResult) {
    console.log(`   ✓ Discord Webhook Rich Embed dispatched successfully`);
  } else if (!process.env.DISCORD_WEBHOOK_URL) {
    console.log(`   ℹ️ Discord alerts skipped (DISCORD_WEBHOOK_URL not configured)`);
  } else {
    console.log(`   ⚠️ Discord alert delivery failed`);
  }

  if (socialWebhookResult) {
    console.log(`   ✓ Social Webhook alert dispatched successfully to SOCIAL_WEBHOOK_URL`);
  } else if (!process.env.SOCIAL_WEBHOOK_URL) {
    console.log(`   ℹ️ Social webhook alerts skipped (SOCIAL_WEBHOOK_URL not configured)`);
  } else {
    console.log(`   ⚠️ Social webhook alert delivery failed`);
  }

  return {
    telegram: telegramResult,
    discord: discordResult,
    socialWebhook: socialWebhookResult,
  };
}

