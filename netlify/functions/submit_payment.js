export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');

    // Contact fields are optional (email/phone are collected in the lead form).
    const required = ['orderId', 'method', 'locale'];
    for (const k of required) {
      if (!body[k]) return { statusCode: 400, body: JSON.stringify({ error: `missing_${k}` }) };
    }

    function parseDataUrl(dataUrl) {
      const m = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!m) return null;
      const [, mime, b64] = m;
      const buf = Buffer.from(b64, 'base64');
      return { mime, buf };
    }

    // MVP storage: no database yet.
    // We return ok and (optionally) forward to Telegram if env vars are provided.
    const summary = {
      orderId: body.orderId,
      method: body.method,
      usdtMode: body.usdtMode || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      arrival: body.arrival || null,
      nationality: body.nationality || null,
      entryGate: body.entryGate || null,
      productId: body.productId || null,
      productLabel: body.productLabel || null,
      speedId: body.speedId || null,
      speedLabel: body.speedLabel || null,
      totalAmount: body.totalAmount || null,
      totalCurrency: body.totalCurrency || null,
      rushAddon: body.rushAddon || null,

      contactMethod: body.contactMethod || null,
      contactValue: body.contactValue || null,
      txid: body.txid || null,
      last5: body.last5 || null,
      amount: body.amount || null,
      currency: body.currency || null,
      locale: body.locale,
      note: body.note || null,
      hasPassportImage: Boolean(body.passportImage),
      hasIdPhotoImage: Boolean(body.idPhotoImage),
      hasProofImage: Boolean(body.proofImage)
    };

    // Optional Telegram notify
    const botToken = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;
    if (botToken && chatId) {
      const lines = [
        `💸 Payment submitted`,
        `Order: ${summary.orderId}`,
        summary.nationality ? `Nationality: ${summary.nationality}` : null,
        (summary.productLabel || summary.productId) ? `Visa: ${(summary.productLabel || summary.productId)}` : null,
        (summary.speedLabel || summary.speedId) ? `Processing: ${(summary.speedLabel || summary.speedId)}` : null,
        (summary.totalAmount && summary.totalCurrency) ? `Total: ${summary.totalAmount} ${summary.totalCurrency}${summary.rushAddon ? ` (rush addon: ${summary.rushAddon} ${summary.totalCurrency})` : ''}` : null,
        `Method: ${summary.method}`,
        summary.usdtMode ? `USDT mode: ${summary.usdtMode}` : null,
        summary.txid ? `TXID: ${summary.txid}` : null,
        summary.last5 ? `Last5: ${summary.last5}` : null,
        summary.email ? `Email: ${summary.email}` : null,
        summary.phone ? `Phone: ${summary.phone}` : null,
        summary.address ? `Address: ${summary.address}` : null,
        summary.arrival ? `Arrival: ${summary.arrival}` : null,
        summary.entryGate ? `Entry gate: ${summary.entryGate}` : null,
        summary.note ? `Note: ${summary.note}` : null
      ].filter(Boolean);

      const caption = lines.join('\n');

      // Collect up to 3 images: passport bio, ID photo, payment proof
      const images = [];
      if (body.passportImage) {
        const p = parseDataUrl(body.passportImage);
        if (p) images.push({ key: 'passport', filename: 'passport.jpg', ...p });
      }
      if (body.idPhotoImage) {
        const p = parseDataUrl(body.idPhotoImage);
        if (p) images.push({ key: 'idphoto', filename: 'idphoto.jpg', ...p });
      }
      if (body.proofImage) {
        const p = parseDataUrl(body.proofImage);
        if (p) images.push({ key: 'proof', filename: 'proof.jpg', ...p });
      }

      if (images.length >= 2) {
        // Post as an album so the group receives all images together.
        const media = images.map((img, idx) => {
          const item = { type: 'photo', media: `attach://${img.key}` };
          if (idx === 0) item.caption = caption;
          return item;
        });

        const fd = new FormData();
        fd.append('chat_id', chatId);
        fd.append('media', JSON.stringify(media));
        for (const img of images) {
          fd.append(img.key, new Blob([img.buf], { type: img.mime }), img.filename);
        }
        await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, { method: 'POST', body: fd });
      } else if (images.length === 1) {
        const img = images[0];
        const fd = new FormData();
        fd.append('chat_id', chatId);
        fd.append('caption', caption);
        fd.append('photo', new Blob([img.buf], { type: img.mime }), img.filename);
        await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: 'POST', body: fd });
      } else {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: caption })
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
