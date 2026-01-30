export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const required = ['orderId', 'method', 'locale'];
    for (const k of required) {
      if (!body[k]) return { statusCode: 400, body: JSON.stringify({ error: `missing_${k}` }) };
    }

    // MVP storage: no database yet.
    // We return ok and (optionally) forward to Telegram if env vars are provided.
    const summary = {
      orderId: body.orderId,
      method: body.method,
      txid: body.txid || null,
      last5: body.last5 || null,
      amount: body.amount || null,
      currency: body.currency || null,
      locale: body.locale,
      note: body.note || null,
      hasProofImage: Boolean(body.proofImage)
    };

    // Optional Telegram notify
    const botToken = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;
    if (botToken && chatId) {
      const lines = [
        `💸 Payment submitted`,
        `Order: ${summary.orderId}`,
        `Method: ${summary.method}`,
        summary.amount ? `Amount: ${summary.amount} ${summary.currency || ''}`.trim() : null,
        summary.last5 ? `Last5: ${summary.last5}` : null,
        summary.txid ? `TXID: ${summary.txid}` : null,
        summary.note ? `Note: ${summary.note}` : null
      ].filter(Boolean);

      if (body.proofImage) {
        // proofImage: data URL (image/*;base64,....)
        const m = String(body.proofImage).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (m) {
          const [, mime, b64] = m;
          const buf = Buffer.from(b64, 'base64');
          const fd = new FormData();
          fd.append('chat_id', chatId);
          fd.append('caption', lines.join('\n'));
          fd.append('photo', new Blob([buf], { type: mime }), 'proof.jpg');
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: 'POST', body: fd });
        } else {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') })
          });
        }
      } else {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') })
        });
      }
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'internal_error', message: err.message })
    };
  }
}
