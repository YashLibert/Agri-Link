import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 15000,
});

// Price prediction — returns all 5 cities + recommendation
async function predictPrice(crop, daysAhead = 0) {
  const { data } = await mlClient.get('/predict-price', {
    params: { crop, days_ahead: daysAhead }
  });
  return data;
}

// Quality grading — accepts image buffer from multer
async function gradeImage(imageBuffer, mimetype) {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', imageBuffer, {
    filename    : 'produce.jpg',
    contentType : mimetype || 'image/jpeg',
  });

  const { data } = await mlClient.post('/grade', form, {
    headers: form.getHeaders()
  });
  return data;
}

// APEDA compliance check
async function checkCompliance(crop, grade, destination = 'domestic') {
  const { data } = await mlClient.get('/compliance-check', {
    params: { crop, grade, destination }
  });
  return data;
}

// Health check — test if FastAPI is running
async function checkMLHealth() {
  try {
    const { data } = await mlClient.get('/health');
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
}

// Export readiness — phytosanitary risk + logistics chain (POST with JSON body)
async function getExportReadiness(payload) {
  const { data } = await mlClient.post('/export-readiness', payload);
  return data;
}

export { predictPrice, gradeImage, checkCompliance, checkMLHealth, getExportReadiness };