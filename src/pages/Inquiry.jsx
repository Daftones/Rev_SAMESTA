import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Container, Form, Button, Card, Row, Col, Alert, Modal } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import { authAPI, inquiriesAPI, unitTypesAPI, unitsAPI } from '../services/api'

function Inquiry() {
  const navigate = useNavigate()
  const location = useLocation()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingSelectedUnit, setLoadingSelectedUnit] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState(null)

  const unitParams = (() => {
    const params = new URLSearchParams(location.search || '')
    const stateObj = (location.state && typeof location.state === 'object') ? location.state : {}

    // unit_id must match backend `units.unit_id`
    const unitId = String(
      stateObj.unitId ||
      stateObj.unit_id ||
      params.get('unit_id') ||
      params.get('unitId') ||
      ''
    ).trim()

    // unit_type_id can be passed from type detail pages
    const unitTypeId = String(
      stateObj.unitTypeId ||
      stateObj.unit_type_id ||
      params.get('unit_type_id') ||
      params.get('unitTypeId') ||
      // legacy aliases used by older links
      params.get('apartment_id') ||
      params.get('apartmentId') ||
      ''
    ).trim()

    return { unitId, unitTypeId }
  })()

  const [resolvedUnitId, setResolvedUnitId] = useState('')
  const [resolvedUnitTypeId, setResolvedUnitTypeId] = useState('')
  
  const [formData, setFormData] = useState({
    userId: '',
    unitId: '',
    purchaseType: 'rent',
    address: '',
    idCardPhoto: null
  })
  const [history, setHistory] = useState([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [lastCreatedInquiryId, setLastCreatedInquiryId] = useState('')

  const [photoPreview, setPhotoPreview] = useState(null)

  const statusMeta = {
    sent: { label: 'Terkirim', variant: 'secondary' },
    contacted: { label: 'Dihubungi', variant: 'info' },
    scheduled: { label: 'Dijadwalkan', variant: 'primary' },
    completed: { label: 'Selesai', variant: 'success' },
    cancelled: { label: 'Dibatalkan', variant: 'danger' },
    pending: { label: 'Diproses', variant: 'warning' },
    approved: { label: 'Disetujui', variant: 'success' },
    rejected: { label: 'Ditolak', variant: 'danger' },
  }

  const getStatusLabel = (status) => statusMeta[status]?.label || status || 'Status tidak diketahui'

  const resolveImageUrl = (path) => {
    if (!path || typeof path !== 'string') return path
    if (path.startsWith('http')) return path
    const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '')
    return `${base}/${path.replace(/^\//, '')}`
  }

  const normalizeInquiry = (raw) => {
    if (!raw) return null
    return {
      id: raw.id || raw.inquiry_id || raw.uuid || raw._id || Date.now(),
      userId: raw.user_id || raw.userId || raw.user_identifier || '',
      unitId: raw.unit_id || raw.unitId || '',
      purchaseType: raw.purchase_type || raw.purchaseType || 'rent',
      address: raw.address || '',
      status: (raw.status || 'sent').toLowerCase(),
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      idCardPhoto: resolveImageUrl(raw.id_card_photo_url || raw.id_card_photo || raw.idCardPhoto || ''),
      timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    }
  }

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      // Save current path to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', `${location.pathname}${location.search || ''}`)
      navigate('/login', { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    // Resolve to the backend unit primary key expected by validation (often `exists:units,id`).
    const resolveUnit = async () => {
      const rawUnitId = unitParams.unitId
      const rawUnitTypeId = unitParams.unitTypeId

      const isNumeric = (value) => /^\d+$/.test(String(value || '').trim())

      // 1) If we already have a unit identifier, map it to units.id when possible
      if (rawUnitId) {
        try {
          const res = await unitsAPI.getAll()
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []

          // If rawUnitId is numeric, assume it's units.id
          const found = isNumeric(rawUnitId)
            ? list.find((u) => String(u.id || u.unit_id || u.unitId || '') === String(rawUnitId))
            : list.find((u) => String(u.unit_id || u.unitId || '') === String(rawUnitId))

          const payloadUnitId = String((found?.id ?? (isNumeric(rawUnitId) ? rawUnitId : '')) || '').trim() || String(rawUnitId).trim()
          setResolvedUnitId(payloadUnitId)
          setFormData((prev) => ({ ...prev, unitId: payloadUnitId }))

          const typeId = found?.unit_type_id || found?.unitTypeId || ''
          if (typeId) setResolvedUnitTypeId(String(typeId))
        } catch {
          // If unit list cannot be fetched, fall back to whatever was provided
          const payloadUnitId = String(rawUnitId).trim()
          setResolvedUnitId(payloadUnitId)
          setFormData((prev) => ({ ...prev, unitId: payloadUnitId }))
        }
        return
      }

      // 2) If only unit_type_id is provided, pick a unit that belongs to that type and use its `id`
      if (rawUnitTypeId) {
        try {
          const res = await unitsAPI.getAll()
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
          const found = list.find((u) => String(u.unit_type_id || u.unitTypeId || '') === String(rawUnitTypeId))
          const payloadUnitId = String((found?.id ?? found?.unit_id ?? found?.unitId ?? found?.uuid ?? '') || '').trim()
          if (payloadUnitId) {
            setResolvedUnitTypeId(rawUnitTypeId)
            setResolvedUnitId(payloadUnitId)
            setFormData((prev) => ({ ...prev, unitId: payloadUnitId }))
          } else {
            setResolvedUnitTypeId(rawUnitTypeId)
            setResolvedUnitId('')
          }
        } catch {
          setResolvedUnitTypeId(rawUnitTypeId)
          setResolvedUnitId('')
        }
        return
      }

      // 3) Nothing provided
      setResolvedUnitId('')
      setResolvedUnitTypeId('')
    }

    resolveUnit()
    // Only re-run when URL/state inputs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.state])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setStream(mediaStream)
      setShowCamera(true)
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (error) {
      showAlertMessage('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.', 'danger')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'id-card.jpg', { type: 'image/jpeg' })
        setFormData(prev => ({
          ...prev,
          idCardPhoto: file
        }))
        setPhotoPreview(canvas.toDataURL('image/jpeg'))
        stopCamera()
      }, 'image/jpeg', 0.95)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setShowCamera(false)
    }
  }

  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      idCardPhoto: null
    }))
    setPhotoPreview(null)
  }

  const loadHistory = async (uid = '') => {
    setLoadingHistory(true)
    try {
      const response = await inquiriesAPI.getAll(uid ? { user_id: uid } : {})
      const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const normalized = list
        .map(normalizeInquiry)
        .filter(Boolean)
        .filter((item) => {
          if (uid && String(item.userId) === String(uid)) return true
          if (!uid) return true
          return false
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setHistory(normalized)
    } catch (err) {
      console.error('Gagal memuat riwayat inquiry:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error status:', err.response?.status)
      
      // Only show error if it's not a 401/403 (authorization issue)
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        showAlertMessage('Gagal memuat riwayat inquiry. Coba lagi.', 'danger')
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    const bootstrapUser = async () => {
      const storedUser = localStorage.getItem('user')
      let parsed = null
      if (storedUser) {
        try {
          parsed = JSON.parse(storedUser)
        } catch (err) {
          console.warn('Failed to parse stored user', err)
        }
      }

      const parsedEmail = parsed?.email || ''
      if (parsedEmail) setCurrentUserEmail(parsedEmail)

      // If we already have a stable id in storage, do NOT call /user (your backend returns Admin only)
      const storedUid = parsed?.nik ?? parsed?.NIK ?? parsed?.no_ktp ?? parsed?.noKtp ?? parsed?.id ?? parsed?.user_id ?? parsed?.userId ?? parsed?.customer_id ?? parsed?.customerId ?? parsed?.uuid ?? ''
      if (storedUid) {
        if (parsed && typeof parsed === 'object') setCurrentUser(parsed)
        setCurrentUserId(storedUid)
        setFormData((prev) => ({
          ...prev,
          userId: String(storedUid || ''),
        }))
        loadHistory(storedUid)
        return
      }

      try {
        // Always try to resolve a real backend user id via /user
        const profile = await authAPI.getProfile()
        // authAPI.getProfile() returns axios `data`, but backend shapes vary
        const profileUser = profile?.user || profile?.data?.user || profile?.data || profile
        const mergedUser = (profileUser && typeof profileUser === 'object')
          ? { ...(parsed && typeof parsed === 'object' ? parsed : {}), ...profileUser }
          : parsed

        if (mergedUser && typeof mergedUser === 'object') {
          setCurrentUser(mergedUser)
          localStorage.setItem('user', JSON.stringify(mergedUser))
        }

        const resolvedEmail = mergedUser?.email || parsedEmail || ''
        if (resolvedEmail) setCurrentUserEmail(resolvedEmail)

        const uid = mergedUser?.nik ?? mergedUser?.NIK ?? mergedUser?.no_ktp ?? mergedUser?.noKtp ?? mergedUser?.id ?? mergedUser?.user_id ?? mergedUser?.userId ?? mergedUser?.customer_id ?? mergedUser?.customerId ?? mergedUser?.uuid ?? ''
        if (uid) setCurrentUserId(uid)
        setFormData((prev) => ({
          ...prev,
          // Display: only show actual backend user id / NIK (never fallback to email)
          userId: String(uid || ''),
        }))
        // Prefer uid filter; no email fallback for identity
        loadHistory(uid)
      } catch (err) {
        // If profile cannot be fetched, fallback to stored user (must still have an id)
        const uid = parsed?.nik ?? parsed?.NIK ?? parsed?.no_ktp ?? parsed?.noKtp ?? parsed?.id ?? parsed?.user_id ?? parsed?.userId ?? parsed?.customer_id ?? parsed?.customerId ?? parsed?.uuid ?? ''
        if (parsed && typeof parsed === 'object') setCurrentUser(parsed)

        const resolvedEmail = parsed?.email || ''
        if (resolvedEmail) setCurrentUserEmail(resolvedEmail)
        if (uid) setCurrentUserId(uid)
        setFormData((prev) => ({
          ...prev,
          userId: String(uid || ''),
        }))
        loadHistory(uid)
      }
    }

    bootstrapUser()
  }, [navigate])

  useEffect(() => {
    const loadSelectedUnit = async () => {
      if (!resolvedUnitTypeId) return
      setLoadingSelectedUnit(true)
      try {
        const res = await unitTypesAPI.getOne(resolvedUnitTypeId)
        const data = res?.data || res
        setSelectedUnit(data)
      } catch (err) {
        console.error('Gagal memuat detail unit untuk inquiry', err)
        setSelectedUnit(null)
      } finally {
        setLoadingSelectedUnit(false)
      }
    }

    loadSelectedUnit()
  }, [resolvedUnitTypeId])

  useEffect(() => {
    if (!currentUserId) return undefined
    const interval = setInterval(() => {
      loadHistory(currentUserId)
    }, 10000)
    return () => clearInterval(interval)
  }, [currentUserId])

  useEffect(() => () => stopCamera(), [])

  const showAlertMessage = (message, variant) => {
    setAlert({ show: true, message, variant })
    setTimeout(() => {
      setAlert({ show: false, message: '', variant: '' })
    }, 4000)
  }

  const extractBackendErrorMessage = (err) => {
    const data = err?.response?.data
    if (!data) return ''
    if (typeof data === 'string') return data
    if (data.errors && typeof data.errors === 'object') {
      const lines = Object.values(data.errors).flat().filter(Boolean)
      if (lines.length) return lines.join('\n')
    }
    return data.message || data.error || ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.idCardPhoto) {
      showAlertMessage('Ambil foto KTP menggunakan kamera terlebih dahulu', 'danger')
      return
    }

    const effectiveUserId = currentUser?.nik ?? currentUser?.NIK ?? currentUser?.no_ktp ?? currentUser?.noKtp ?? currentUser?.id ?? currentUser?.user_id ?? currentUser?.customer_id ?? currentUser?.customerId ?? currentUserId ?? ''
    if (!effectiveUserId) {
      showAlertMessage('User ID tidak ditemukan. Silakan login ulang.', 'danger')
      return
    }

    // Prevent accidental email being used as user_id
    const effectiveUserIdStr = String(effectiveUserId)
    const looksLikeEmail = effectiveUserIdStr.includes('@')
    const isNumericId = /^\d+$/.test(effectiveUserIdStr.trim())
    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserIdStr.trim())
    if (looksLikeEmail || (!isNumericId && !isUuidLike)) {
      showAlertMessage('User ID tidak valid. Pastikan akun Anda memiliki ID dari backend (angka atau UUID), lalu login ulang.', 'danger')
      return
    }

    if (!resolvedUnitId) {
      showAlertMessage('Unit tidak ditemukan. Buka detail apartemen lalu ajukan inquiry dari sana.', 'danger')
      return
    }

    // Keep as string to avoid losing leading zeros (common for NIK)
    const normalizedUserId = effectiveUserIdStr.trim()
    const payload = {
      user_id: normalizedUserId,
      unit_id: resolvedUnitId,
      purchase_type: formData.purchaseType,
      address: formData.address,
      // Backend expects `identity_card` (required)
      identity_card: [formData.idCardPhoto],
    }

    setSubmitting(true)
    try {
      // Verify token exists before sending
      const token = localStorage.getItem('authToken')
      if (!token) {
        showAlertMessage('Session expired. Please login again.', 'danger')
        navigate('/login')
        return
      }

      console.log('🚀 Sending inquiry...', {
        user_id: normalizedUserId,
        unit_id: resolvedUnitId,
        purchase_type: formData.purchaseType,
        has_photo: !!formData.idCardPhoto,
        token_exists: !!token
      })

      const response = await inquiriesAPI.create(payload)
      
      console.log('✅ Inquiry created successfully', response)
      
      const created = normalizeInquiry(response?.data || response)
      if (created) {
        setHistory((prev) => [created, ...prev])
        if (created?.id) setLastCreatedInquiryId(String(created.id))
      }
      await loadHistory(effectiveUserId)
      setShowSuccessModal(true)
    } catch (err) {
      console.error('❌ Gagal mengirim inquiry:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error status:', err.response?.status)
      console.error('Error headers:', err.response?.headers)
      
      const message = extractBackendErrorMessage(err) || 'Gagal mengirim inquiry. Coba lagi.'
      showAlertMessage(message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  const handleModalClose = () => {
    setShowSuccessModal(false)
    
    // Reset form
    setFormData({
      userId: String((currentUser?.nik ?? currentUser?.NIK ?? currentUser?.no_ktp ?? currentUser?.noKtp ?? currentUser?.id ?? currentUser?.user_id ?? currentUser?.customer_id ?? currentUser?.customerId ?? currentUserId) || ''),
      unitId: resolvedUnitId,
      purchaseType: 'rent',
      address: '',
      idCardPhoto: null
    })
    setPhotoPreview(null)
    
    // Refresh riwayat setelah submit berhasil
    loadHistory(currentUserId)
    // After submitting an inquiry, send user to payments to continue the flow
    const qs = lastCreatedInquiryId ? `?inquiry_id=${encodeURIComponent(String(lastCreatedInquiryId))}` : ''
    navigate(`/payments${qs}`)
  }

  return (
    <>
      <Navbar />
      <div className="bg-slate-50 min-h-screen">
        <Container className="py-5 px-3">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-lg">
                <Card.Body className="p-4 p-md-5">
                  <div className="text-center mb-4">
                    <h2 className="fw-bold mb-2">Form Inquiry</h2>
                    <p className="text-muted">Lengkapi data di bawah untuk melanjutkan proses</p>
                  </div>

                  {alert.show && (
                    <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: '' })}>
                      {alert.message}
                    </Alert>
                  )}

                  {!resolvedUnitId ? (
                    <Alert variant="warning" className="mb-0">
                      Inquiry harus diajukan dari halaman detail apartemen agar unit terikat otomatis.
                      <div className="mt-3 d-flex gap-2 flex-wrap">
                        <Button variant="dark" onClick={() => navigate('/apartments')}>Lihat Daftar Apartemen</Button>
                        <Button variant="outline-secondary" onClick={() => navigate(-1)}>Kembali</Button>
                      </div>
                    </Alert>
                  ) : (
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>User ID / NIK</Form.Label>
                      <Form.Control
                        type="text"
                        name="userId"
                        placeholder="User ID"
                        value={formData.userId}
                        readOnly
                        disabled
                      />
                      <small className="text-muted">Diambil dari akun yang sedang login.</small>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={currentUserEmail || currentUser?.email || ''}
                        readOnly
                        disabled
                        placeholder="Email"
                      />
                      <small className="text-muted">Hanya untuk informasi, tidak dikirim sebagai user_id.</small>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Unit</Form.Label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800">
                        <div className="fw-semibold">
                          {loadingSelectedUnit
                            ? 'Memuat unit...'
                            : (selectedUnit?.name || selectedUnit?.type || `Unit ID: ${resolvedUnitId}`)}
                        </div>
                        {!loadingSelectedUnit && selectedUnit?.floor && (
                          <div className="text-muted small">Lantai {selectedUnit.floor}</div>
                        )}
                      </div>
                      <small className="text-muted">Unit terikat otomatis dari halaman detail apartemen.</small>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Tipe Transaksi</Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          label="Sewa"
                          name="purchaseType"
                          value="rent"
                          checked={formData.purchaseType === 'rent'}
                          onChange={handleInputChange}
                          id="rent-option"
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="Beli"
                          name="purchaseType"
                          value="sale"
                          checked={formData.purchaseType === 'sale'}
                          onChange={handleInputChange}
                          id="sale-option"
                        />
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Alamat Lengkap</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="address"
                        placeholder="Masukkan alamat lengkap Anda"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Foto KTP</Form.Label>
                      
                      {!photoPreview && !showCamera && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                          <div className="d-grid gap-2">
                            <Button 
                              variant="outline-secondary" 
                              className="rounded-full"
                              onClick={startCamera}
                            >
                              Buka Kamera (wajib)
                            </Button>
                          </div>
                          <small className="text-muted d-block mt-2">
                            Unggah dari galeri dinonaktifkan. Gunakan kamera untuk mengambil foto KTP.
                          </small>
                        </div>
                      )}

                      {showCamera && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline
                            className="w-full rounded-xl border border-slate-200"
                          />
                          <canvas ref={canvasRef} style={{ display: 'none' }} />
                          <div className="d-flex gap-2 mt-3">
                            <Button variant="primary" onClick={capturePhoto} className="flex-grow-1 rounded-full">
                              Ambil Foto
                            </Button>
                            <Button variant="secondary" onClick={stopCamera} className="rounded-full">
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}

                      {photoPreview && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                          <img src={photoPreview} alt="KTP Preview" className="mx-auto max-h-64 w-auto rounded-xl object-contain" />
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={removePhoto}
                            className="mt-2 rounded-full"
                          >
                            Ambil Ulang Foto
                          </Button>
                        </div>
                      )}
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button variant="dark" type="submit" size="lg" className="rounded-full" disabled={submitting}>
                        {submitting ? 'Mengirim...' : 'Kirim Inquiry'}
                      </Button>
                      <Button variant="outline-secondary" onClick={() => navigate(-1)} className="rounded-full" disabled={submitting}>
                        Batal
                      </Button>
                    </div>
                  </Form>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="justify-content-center mt-4">
            <Col lg={8}>
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h4 className="mb-0">Riwayat Inquiry Anda</h4>
                    <span className="text-muted small">{history.length} permintaan</span>
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={() => loadHistory(currentUserId)} disabled={loadingHistory}>
                        {loadingHistory ? 'Menyinkronkan...' : 'Sinkronkan sekarang'}
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={() => navigate('/payments')}>
                        Lihat Pembayaran
                      </Button>
                    </div>
                  </div>

                  {history.length === 0 && (
                    <div className="text-muted">Belum ada inquiry yang tercatat.</div>
                  )}

                  {loadingHistory ? (
                    <div className="text-muted">Memuat riwayat inquiry...</div>
                  ) : (
                    <div className="space-y-3">
                      {history.map(item => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                            <div>
                              <div className="fw-bold text-dark">{item.unitId || 'Unit tidak diketahui'}</div>
                              <div className="text-muted small">{item.purchaseType === 'sale' ? 'Beli' : 'Sewa'} - {item.address || 'Alamat tidak tersedia'}</div>
                            </div>
                            <span className={`badge rounded-pill bg-${statusMeta[item.status]?.variant || 'secondary'}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          <div className="text-muted small mt-2">
                            {new Date(item.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          {Array.isArray(item.timeline) && item.timeline.length > 0 && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                              {item.timeline.map((t) => (
                                <span key={`${t.status}-${t.at}`} className="badge bg-light text-dark border">
                                  {getStatusLabel(t.status)} - {new Date(t.at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.status === 'approved' && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                              <Button
                                variant="dark"
                                size="sm"
                                className="rounded-full"
                                onClick={() => navigate(`/payments?inquiry_id=${encodeURIComponent(String(item.id || ''))}`)}
                              >
                                Lanjut ke Pembayaran
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Success Modal */}
      <Modal 
        show={showSuccessModal} 
        onHide={handleModalClose}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body className="text-center p-5">
          <div className="mb-4">
            <div 
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#28a745',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '40px',
                color: 'white'
              }}
            >
              OK
            </div>
          </div>
          <h3 className="fw-bold mb-3">Inquiry Berhasil Dikirim!</h3>
          <p className="text-muted mb-4">
            Terima kasih telah mengirimkan inquiry Anda. Tim kami akan segera menghubungi Anda untuk proses lebih lanjut.
          </p>
          <Button variant="dark" size="lg" onClick={handleModalClose} className="px-5">
            Lanjut ke Pembayaran
          </Button>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default Inquiry
