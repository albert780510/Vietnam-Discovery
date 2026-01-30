export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const required = ['product', 'email', 'locale'];
    for (const k of required) {
      if (!body[k]) return { statusCode: 400, body: JSON.stringify({ error: `missing_${k}` }) };
    }

    // Order id: VD-YYMMDD-HHMM-XXXX
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderId = `VD-${y}${m}${d}-${hh}${mm}-${rnd}`;

    // MVP: just return orderId.
    // Next: write to a datastore (Airtable/Notion/Google Sheet) and send email notifications.
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'internal_error', message: err.message })
    };
  }
}
