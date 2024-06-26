import axios from 'axios'
import router from '../router'

const tokenKey = 'auth_token'

export const auth = {
  token: localStorage.getItem(tokenKey) || null,
  user: null,
  async login(username, password) {
    try {
      const response = await axios.post('http://localhost:3000/user/login', {
        username,
        password
      })
      if (response.data.token) {
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem(tokenKey, this.token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        router.push({ name: 'home' })
      } else {
        alert('Invalid username or password')
      }
    } catch (error) {
      console.error('Error during login:', error)
      alert('An error occurred. Please try again.')
    }
  },
  logout() {
    this.token = null
    this.user = null
    delete axios.defaults.headers.common['Authorization']
    localStorage.removeItem(tokenKey)
    router.push({ name: 'login' })
  }
}
