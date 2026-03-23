import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const axiosClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

export function getAxiosErrorMessage(err) {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      return 'Cannot reach the server. Start the backend on port 5001 (e.g. npm run dev from the project root).'
    }
    const msg = err.response?.data?.error || err.response?.data?.message
    if (msg) return typeof msg === 'string' ? msg : JSON.stringify(msg)
  }
  return err?.message || 'Something went wrong'
}

export default axiosClient
