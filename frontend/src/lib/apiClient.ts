import axios from 'axios'
import { apiBaseUrl } from './config'

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smrit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smrit_token')
      localStorage.removeItem('smrit_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
