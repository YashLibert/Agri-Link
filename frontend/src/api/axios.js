import axios from 'axios'

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
})

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )
        sessionStorage.setItem('accessToken', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        sessionStorage.removeItem('accessToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api