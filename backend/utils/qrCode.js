import QRCode from 'qrcode';

async function generateQR(lotId) {
  const traceUrl = `${process.env.FRONTEND_URL}/trace/${lotId}`;

  const qrDataUrl = await QRCode.toDataURL(traceUrl, {
    width : 300,
    margin: 2,
    color : { dark: '#1B4332', light: '#FFFFFF' }
  });

  return { qrDataUrl, traceUrl, lotId };
}

export { generateQR };