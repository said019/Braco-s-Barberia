// Basic regression test: WhatsApp URL encoding must support emojis correctly.
// Run with: node tests/test_whatsapp_url_encoding.js

function buildWhatsAppUrl({ countryCode = '52', phone, text }) {
  const normalized = (text ?? '').normalize('NFC');

  let decoded = normalized;
  if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // ignore
    }
  }

  const encodedMessage = encodeURIComponent(decoded);
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${countryCode}${cleanPhone}?text=${encodedMessage}`;
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

const url = buildWhatsAppUrl({
  phone: '55-1234-5678',
  text: 'Feliz cumpleaños 🎂🥳💈\n¡Te esperamos!'
});

assert(url.startsWith('https://wa.me/5255'), 'URL should start with wa.me and include country code');
assert(url.includes('?text='), 'URL should include text query param');
assert(/%F0%9F/.test(url), 'URL should contain UTF-8 percent encoding for emojis');
assert(!/%25F0%259F/.test(url), 'URL should not be double-encoded');

console.log('PASS tests/test_whatsapp_url_encoding.js');
