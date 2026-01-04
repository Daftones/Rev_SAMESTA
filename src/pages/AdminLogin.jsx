import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Spinner, Button } from 'react-bootstrap'

function AdminLogin() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Container className="text-center py-10">
        <div className="mb-4">
          <div className="text-xl font-bold text-slate-900">Samesta Admin</div>
          <h2 className="text-2xl font-bold text-slate-900">Gunakan Halaman Login</h2>
          <p className="text-slate-600">Login admin dan user sekarang menggunakan halaman Login yang sama.</p>
        </div>
        <Spinner animation="border" role="status" className="mb-3">
          <span className="visually-hidden">Redirecting...</span>
        </Spinner>
        <div className="mt-3">
          <Button variant="dark" onClick={() => navigate('/login', { replace: true })}>
            Pergi ke Login
          </Button>
        </div>
      </Container>
    </div>
  )
}

export default AdminLogin
