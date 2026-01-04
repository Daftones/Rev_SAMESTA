import { useState, useEffect } from 'react'
import { Container, Table, Button, Modal, Form, Badge, Alert, Spinner } from 'react-bootstrap'
import { unitTypesAPI } from '../services/api'

function AdminApartments() {
  const [apartments, setApartments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentApartment, setCurrentApartment] = useState(null)
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' })
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    floor: '',
    size: '',
    rent_price: '',
    sale_price: '',
    status: 'available',
    facilities: '',
  })

  const logActivity = (action, name) => {
    const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]')
    logs.unshift({
      id: Date.now(),
      action,
      name,
      at: new Date().toISOString()
    })
    localStorage.setItem('activityLogs', JSON.stringify(logs.slice(0, 50)))
  }

  // Fetch apartments from backend on mount
  useEffect(() => {
    fetchApartments()
  }, [])

  const fetchApartments = async () => {
    setLoading(true)
    try {
      const response = await unitTypesAPI.getAll()
      const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      setApartments(list)
    } catch (error) {
      console.error('Error fetching apartments:', error)
      showAlert('Gagal memuat data apartemen', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleShowModal = (apartment = null) => {
    if (apartment) {
      setEditMode(true)
      setCurrentApartment(apartment)
      setFormData({
        name: apartment.name || '',
        floor: apartment.floor || '',
        size: apartment.size || '',
        rent_price: apartment.rent_price || '',
        sale_price: apartment.sale_price || '',
        status: apartment.status || 'available',
        facilities: apartment.facilities || '',
      })
    } else {
      setEditMode(false)
      setCurrentApartment(null)
      setFormData({
        name: '',
        floor: '',
        size: '',
        rent_price: '',
        sale_price: '',
        status: 'available',
        facilities: '',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditMode(false)
    setCurrentApartment(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant })
    setTimeout(() => {
      setAlert({ show: false, message: '', variant: '' })
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const payload = {
        name: formData.name,
        floor: formData.floor,
        size: formData.size,
        rent_price: formData.rent_price || null,
        sale_price: formData.sale_price || null,
        status: formData.status,
        facilities: formData.facilities,
      }

      if (editMode) {
        await unitTypesAPI.update(currentApartment.id, payload)
        showAlert('Apartemen berhasil diupdate!', 'success')
        logActivity('update', payload.name)
      } else {
        await unitTypesAPI.create(payload)
        showAlert('Apartemen berhasil ditambahkan!', 'success')
        logActivity('create', payload.name)
      }
      
      handleCloseModal()
      fetchApartments()
    } catch (error) {
      console.error('Error saving apartment:', error)
      showAlert(error.response?.data?.message || 'Gagal menyimpan data apartemen', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const target = apartments.find((a) => a.id === id)
    if (window.confirm('Apakah Anda yakin ingin menghapus apartemen ini?')) {
      setLoading(true)
      try {
        await unitTypesAPI.delete(id)
        showAlert('Apartemen berhasil dihapus!', 'danger')
        logActivity('delete', target?.name || 'Unit')
        fetchApartments()
      } catch (error) {
        console.error('Error deleting apartment:', error)
        showAlert(error.response?.data?.message || 'Gagal menghapus apartemen', 'danger')
      } finally {
        setLoading(false)
      }
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'available':
        return <Badge bg="success">Tersedia</Badge>
      case 'occupied':
        return <Badge bg="danger">Terisi</Badge>
      case 'maintenance':
        return <Badge bg="warning">Maintenance</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <Container fluid className="py-4 px-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h2 className="fw-bold mb-0">Kelola Apartemen</h2>
        <Button variant="dark" onClick={() => handleShowModal()} className="rounded-full">
          + Tambah Apartemen
        </Button>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: '' })}>
          {alert.message}
        </Alert>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Lantai</th>
              <th>Size</th>
              <th>Status</th>
              <th>Harga Sewa</th>
              <th>Harga Jual</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </td>
              </tr>
            ) : apartments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-slate-500">
                  Belum ada data apartemen
                </td>
              </tr>
            ) : (
              apartments.map((apartment, index) => (
                <tr key={apartment.id}>
                  <td>{index + 1}</td>
                  <td>{apartment.name}</td>
                  <td>{apartment.floor}</td>
                  <td>{apartment.size}</td>
                  <td>{getStatusBadge(apartment.status)}</td>
                  <td>{apartment.rent_price ? formatPrice(apartment.rent_price) : '-'}</td>
                  <td>{apartment.sale_price ? formatPrice(apartment.sale_price) : '-'}</td>
                  <td>
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => handleShowModal(apartment)}
                        className="w-100"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(apartment.id)}
                        className="w-100"
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Apartemen' : 'Tambah Apartemen Baru'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="max-h-[70vh] overflow-y-auto">
            <Form.Group className="mb-3">
              <Form.Label>Nama / Tipe Apartemen</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Contoh: 2 Bedroom (Furnish)"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lantai</Form.Label>
              <Form.Control
                type="number"
                name="floor"
                placeholder="Contoh: 3"
                value={formData.floor}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Luas (m²)</Form.Label>
              <Form.Control
                type="text"
                name="size"
                placeholder="Contoh: 33.07"
                value={formData.size}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fasilitas (pisahkan dengan koma)</Form.Label>
              <Form.Control
                type="text"
                name="facilities"
                placeholder="AC, Kitchen Set, Water Heater"
                value={formData.facilities}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
                required
              >
                <option value="available">Tersedia</option>
                <option value="occupied">Terisi</option>
                <option value="maintenance">Maintenance</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Harga Sewa (Rp)</Form.Label>
              <Form.Control
                type="number"
                name="rent_price"
                placeholder="Contoh: 1500000"
                value={formData.rent_price}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Harga Jual (Rp)</Form.Label>
              <Form.Control
                type="number"
                name="sale_price"
                placeholder="Contoh: 350000000"
                value={formData.sale_price}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={loading}>
              Batal
            </Button>
            <Button variant="dark" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Menyimpan...
                </>
              ) : (
                editMode ? 'Update' : 'Tambah'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  )
}

export default AdminApartments
