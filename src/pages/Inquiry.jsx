import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Form,
  Button,
  Card,
  Row,
  Col,
  Alert,
  Modal,
} from "react-bootstrap";
import Navbar from "../components/Navbar";
import { authAPI, inquiriesAPI, unitTypesAPI, unitsAPI } from "../services/api";

function Inquiry() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSelectedUnit, setLoadingSelectedUnit] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [resolvingUnitId, setResolvingUnitId] = useState(false);
  const [resolvedUnitId, setResolvedUnitId] = useState("");

  const unitIdFromUrl = (() => {
    const params = new URLSearchParams(location.search || "");
    return (
      params.get("unit_type_id") ||
      params.get("unitTypeId") ||
      params.get("unit_id") ||
      params.get("unitId") ||
      params.get("apartment_id") ||
      params.get("apartmentId") ||
      ""
    );
  })();

  const fixedUnitId = (() => {
    const fromState = (() => {
      if (!location.state || typeof location.state !== "object") return "";
      const s = location.state;

      return (
        s.unitTypeId ||
        s.unit_type_id ||
        s.unitId ||
        s.unit_id ||
        s.apartmentId ||
        s.apartment_id ||
        s.id ||
        s.unit?.unit_type_id ||
        s.unit?.id ||
        s.apartment?.unit_type_id ||
        s.apartment?.id ||
        ""
      );
    })();
    return String(fromState || unitIdFromUrl || "").trim();
  })();

  const [formData, setFormData] = useState({
    purchaseType: "rent",
    address: "",
    idCardPhoto: null,
  });
  const [history, setHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const [photoPreview, setPhotoPreview] = useState(null);

  const statusMeta = {
    sent: { label: "Terkirim", variant: "secondary" },
    contacted: { label: "Dihubungi", variant: "info" },
    scheduled: { label: "Dijadwalkan", variant: "primary" },
    completed: { label: "Selesai", variant: "success" },
    cancelled: { label: "Dibatalkan", variant: "danger" },
    pending: { label: "Diproses", variant: "warning" },
    approved: { label: "Disetujui", variant: "success" },
    rejected: { label: "Ditolak", variant: "danger" },
  };

  const getStatusLabel = (status) =>
    statusMeta[status]?.label || status || "Status tidak diketahui";

  const resolveImageUrl = (path) => {
    if (!path || typeof path !== "string") return path;

    // If already a full URL, ensure it uses HTTPS to prevent mixed content issues
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path.replace(/^http:\/\//i, "https://");
    }

    // Get base URL and ensure it uses HTTPS
    const base = (import.meta.env.VITE_API_BASE_URL || "")
      .replace(/\/?api\/?$/, "")
      .replace(/^http:\/\//i, "https://");

    // Clean up path and construct full URL
    const cleanPath = path.replace(/^\//, "");
    const fullUrl = `${base}/${cleanPath}`;

    return fullUrl.replace(/^http:\/\//i, "https://");
  };

  const normalizeInquiry = (raw) => {
    if (!raw) return null;
    return {
      id: raw.id || raw.inquiry_id || raw.uuid || raw._id || Date.now(),
      userId: raw.user_id || raw.userId || raw.user_identifier || "",
      unitId: raw.unit_id || raw.unitId || "",
      purchaseType: raw.purchase_type || raw.purchaseType || "rent",
      address: raw.address || "",
      status: (raw.status || "sent").toLowerCase(),
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      idCardPhotos: Array.isArray(raw.identity_card)
        ? raw.identity_card.map(resolveImageUrl)
        : raw.identity_card
        ? [resolveImageUrl(raw.identity_card)]
        : [],
      timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    };
  };

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      // Save current path to redirect back after login
      sessionStorage.setItem(
        "redirectAfterLogin",
        `${location.pathname}${location.search || ""}`
      );
      navigate("/login", { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // Unit ID is managed by fixedUnitId constant, not in formData
  // This ensures unit is always bound from URL/state and not editable

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (_err) {
      showAlertMessage(
        "Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.",
        "danger"
      );
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Ambil Base64 langsung dari canvas
      const base64Image = canvas.toDataURL("image/jpeg", 0.95);

      setFormData((prev) => ({
        ...prev,
        idCardPhoto: base64Image, // ✅ Base64 string
      }));

      setPhotoPreview(base64Image);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  };

  const removePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      idCardPhoto: null,
    }));
    setPhotoPreview(null);
  };

  const loadHistory = async (uid = "", email = "") => {
    setLoadingHistory(true);
    try {
      const response = await inquiriesAPI.getAll(uid ? { user_id: uid } : {});
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      const normalized = list
        .map(normalizeInquiry)
        .filter(Boolean)
        .filter((item) => {
          if (uid && String(item.userId) === String(uid)) return true;
          if (
            !uid &&
            email &&
            String(item.userId).toLowerCase() === String(email).toLowerCase()
          )
            return true;
          if (!uid && !email) return true;
          return false;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setHistory(normalized);
    } catch (err) {
      console.error("Gagal memuat riwayat inquiry", err);
      showAlertMessage("Gagal memuat riwayat inquiry. Coba lagi.", "danger");
    } finally {
      setLoadingHistory(false);
    }
  };

  const resolveUserName = (user) => {
    if (!user || typeof user !== "object") return "";
    return (
      user.name ||
      user.full_name ||
      user.username ||
      user.email || // fallback terakhir
      ""
    );
  };

  useEffect(() => {
    const bootstrapUser = async () => {
      const storedUser = localStorage.getItem("user");
      let parsed = null;
      if (storedUser) {
        try {
          parsed = JSON.parse(storedUser);
        } catch (err) {
          console.warn("Failed to parse stored user", err);
        }
      }

      const parsedEmail = parsed?.email || "";
      if (parsedEmail) setCurrentUserEmail(parsedEmail);

      try {
        // Always try to resolve a real backend user id via /user
        const profile = await authAPI.getProfile();
        // authAPI.getProfile() returns axios `data`, but backend shapes vary
        const profileUser =
          profile?.user || profile?.data?.user || profile?.data || profile;
        const mergedUser =
          profileUser && typeof profileUser === "object"
            ? {
                ...(parsed && typeof parsed === "object" ? parsed : {}),
                ...profileUser,
              }
            : parsed;

        if (mergedUser && typeof mergedUser === "object") {
          setCurrentUser(mergedUser);
          localStorage.setItem("user", JSON.stringify(mergedUser));

          const resolvedName = resolveUserName(mergedUser);
          if (resolvedName) {
            setCurrentUserName(resolvedName);
          }
        }

        const resolvedEmail = mergedUser?.email || parsedEmail || "";
        if (resolvedEmail) setCurrentUserEmail(resolvedEmail);

        const uid =
          mergedUser?.id ??
          mergedUser?.user_id ??
          mergedUser?.userId ??
          mergedUser?.uuid ??
          "";
        if (uid) setCurrentUserId(uid);
        // Prefer uid filter; fallback to email filter
        loadHistory(uid, resolvedEmail);
      } catch (_err) {
        // If profile cannot be fetched, fallback to stored user (must still have an id)
        const uid =
          parsed?.id ?? parsed?.user_id ?? parsed?.userId ?? parsed?.uuid ?? "";
        if (parsed && typeof parsed === "object") {
          setCurrentUser(parsed);

          const resolvedName = resolveUserName(parsed);
          if (resolvedName) {
            setCurrentUserName(resolvedName);
          }
        }
        const resolvedEmail = parsed?.email || "";
        if (resolvedEmail) setCurrentUserEmail(resolvedEmail);
        if (uid) setCurrentUserId(uid);
        loadHistory(uid, resolvedEmail);
      }
    };

    bootstrapUser();
  }, [navigate]);

  useEffect(() => {
    const loadSelectedUnit = async () => {
      if (!fixedUnitId) return;
      setLoadingSelectedUnit(true);
      try {
        const res = await unitTypesAPI.getOne(fixedUnitId);
        const data = res?.data || res;
        setSelectedUnit(data);
      } catch (err) {
        console.error("Gagal memuat detail unit untuk inquiry", err);
        setSelectedUnit(null);
      } finally {
        setLoadingSelectedUnit(false);
      }
    };

    loadSelectedUnit();
  }, [fixedUnitId]);

  useEffect(() => {
    const resolveUnitId = async () => {
      if (!fixedUnitId) {
        setResolvedUnitId("");
        return;
      }

      setResolvingUnitId(true);
      try {
        const res = await unitsAPI.getAll();
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

        const target = String(fixedUnitId).trim();
        const pickId = (u) => String(u?.id ?? u?.unit_id ?? u?.unitId ?? u?.uuid ?? "").trim();
        const pickTypeId = (u) =>
          String(
            u?.unit_type_id ??
              u?.unitTypeId ??
              u?.unit_type ??
              u?.unitType ??
              u?.type_id ??
              ""
          ).trim();

        // Accept either: fixedUnitId is already a unit id, OR it's a unit_type id.
        const byId = list.find((u) => pickId(u) && pickId(u) === target);
        const byType = list.find((u) => pickTypeId(u) && pickTypeId(u) === target);
        const chosen = byId || byType || null;
        const chosenId = chosen ? pickId(chosen) : "";

        setResolvedUnitId(chosenId);
      } catch (err) {
        console.error("Gagal memetakan unit_id untuk inquiry", err);
        setResolvedUnitId("");
      } finally {
        setResolvingUnitId(false);
      }
    };

    resolveUnitId();
  }, [fixedUnitId]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    const interval = setInterval(() => {
      loadHistory(currentUserId, currentUserEmail);
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUserId, currentUserEmail]);

  useEffect(() => () => stopCamera(), []);

  const showAlertMessage = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => {
      setAlert({ show: false, message: "", variant: "" });
    }, 4000);
  };

  const extractBackendErrorMessage = (err) => {
    const data = err?.response?.data;
    if (!data) return "";
    if (typeof data === "string") return data;
    if (data.errors && typeof data.errors === "object") {
      const lines = Object.values(data.errors).flat().filter(Boolean);
      if (lines.length) return lines.join("\n");
    }
    return data.message || data.error || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.idCardPhoto) {
      showAlertMessage(
        "Ambil foto KTP menggunakan kamera terlebih dahulu",
        "danger"
      );
      return;
    }
    console.log (formData.idCardPhoto);

    const effectiveUserId =
      currentUser?.id ?? currentUser?.user_id ?? currentUserId ?? "";
    if (!effectiveUserId) {
      showAlertMessage(
        "User ID tidak ditemukan. Silakan login ulang.",
        "danger"
      );
      return;
    }

    if (!fixedUnitId) {
      showAlertMessage(
        "Unit tidak ditemukan. Buka detail apartemen lalu ajukan inquiry dari sana.",
        "danger"
      );
      return;
    }

    if (!resolvedUnitId) {
      showAlertMessage(
        "Unit ID tidak valid di backend. Silakan coba lagi atau hubungi admin untuk sinkronisasi data unit.",
        "danger"
      );
      return;
    }

    const normalizedUserId = Number.isFinite(Number(effectiveUserId))
      ? Number(effectiveUserId)
      : effectiveUserId;
    const payload = {
      user_id: normalizedUserId,
      unit_id: resolvedUnitId,
      // Keep unit_type_id as extra context (some backends use it even if validation is on unit_id)
      unit_type_id: fixedUnitId,
      purchase_type: formData.purchaseType,
      duration: formData.rentDuration,
      address: formData.address,
      // Backend expects `identity_card` (required)
      identity_card: [formData.idCardPhoto],
      // Keep legacy key for compatibility
      id_card_photo: formData.idCardPhoto,
      // Email is sent separately for informational purposes only
      user_identifier: currentUserEmail || currentUser?.email || "",
    };

    console.log(payload);

    setSubmitting(true);
    try {
      const response = await inquiriesAPI.create(payload);
      const created = normalizeInquiry(response?.data || response);
      if (created) {
        setHistory((prev) => [created, ...prev]);
      }
      await loadHistory(effectiveUserId, currentUserEmail);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Gagal mengirim inquiry", err);
      const message =
        extractBackendErrorMessage(err) || "Gagal mengirim inquiry. Coba lagi.";
      showAlertMessage(message, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);

    // Reset form (keep user session data, only reset form inputs)
    setFormData({
      purchaseType: "rent",
      address: "",
      idCardPhoto: null,
    });
    setPhotoPreview(null);

    // Refresh riwayat setelah submit berhasil
    loadHistory(currentUserId, currentUserEmail);
    // Navigate to home
    navigate("/");
  };

  return (
    <>
      <div className="bg-slate-50 min-h-screen">
        <Container className="py-5 px-3">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-lg">
                <Card.Body className="p-4 p-md-5">
                  <div className="text-center mb-4">
                    <h2 className="fw-bold mb-2">Form Inquiry</h2>
                    <p className="text-muted">
                      Lengkapi data di bawah untuk melanjutkan proses
                    </p>
                  </div>

                  {alert.show && (
                    <Alert
                      variant={alert.variant}
                      dismissible
                      onClose={() =>
                        setAlert({ show: false, message: "", variant: "" })
                      }
                    >
                      {alert.message}
                    </Alert>
                  )}

                  {!fixedUnitId ? (
                    <Alert variant="warning" className="mb-0">
                      Inquiry harus diajukan dari halaman detail apartemen agar
                      unit terikat otomatis.
                      <div className="mt-3 d-flex gap-2 flex-wrap">
                        <Button
                          variant="dark"
                          onClick={() => navigate("/apartments")}
                        >
                          Lihat Daftar Apartemen
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => navigate(-1)}
                        >
                          Kembali
                        </Button>
                      </div>
                    </Alert>
                  ) : (
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nama Lengkap</Form.Label>
                        <Form.Control
                          type="text"
                          value={currentUserName || "Memuat..."}
                          readOnly
                          disabled
                          className="bg-slate-50"
                        />
                        <small className="text-muted">
                          ID pengguna dari akun yang sedang login.
                        </small>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Email (Informasi)</Form.Label>
                        <Form.Control
                          type="text"
                          value={currentUserEmail || "Memuat..."}
                          readOnly
                          disabled
                          className="bg-slate-50"
                        />
                        <small className="text-muted">
                          Email Anda (hanya untuk informasi, tidak digunakan
                          sebagai ID).
                        </small>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Unit</Form.Label>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800">
                          <div className="fw-semibold">
                            {loadingSelectedUnit
                              ? "Memuat unit..."
                              : selectedUnit?.name || `Unit ID: ${fixedUnitId}`}
                          </div>
                          {!loadingSelectedUnit && selectedUnit?.floor && (
                            <div className="text-muted small">
                              Lantai {selectedUnit.floor}
                              <br />
                              Unit {selectedUnit.unit_number}
                            </div>
                          )}
                        </div>
                        <small className="text-muted">
                          Unit terikat otomatis dari halaman detail apartemen.
                        </small>
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
                            checked={formData.purchaseType === "rent"}
                            onChange={handleInputChange}
                            id="rent-option"
                          />
                          <Form.Check
                            inline
                            type="radio"
                            label="Beli"
                            name="purchaseType"
                            value="sale"
                            checked={formData.purchaseType === "sale"}
                            onChange={handleInputChange}
                            id="sale-option"
                          />
                        </div>
                      </Form.Group>

                      {formData.purchaseType === "rent" && (
                      <Form.Group className="mb-3">
                        <Form.Label>Durasi Sewa</Form.Label>
                        <Form.Select
                          name="rentDuration"
                          value={formData.rentDuration || ""}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Pilih durasi</option>
                          <option value="1">1 Bulan</option>
                          <option value="3">3 Bulan</option>
                          <option value="6">6 Bulan</option>
                          <option value="12">12 Bulan</option>
                        </Form.Select>
                      </Form.Group>
                      )}

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
                              Unggah dari galeri dinonaktifkan. Gunakan kamera
                              untuk mengambil foto KTP.
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
                            <canvas
                              ref={canvasRef}
                              style={{ display: "none" }}
                            />
                            <div className="d-flex gap-2 mt-3">
                              <Button
                                variant="primary"
                                onClick={capturePhoto}
                                className="flex-grow-1 rounded-full"
                              >
                                Ambil Foto
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={stopCamera}
                                className="rounded-full"
                              >
                                Batal
                              </Button>
                            </div>
                          </div>
                        )}

                        {photoPreview && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                            <img
                              src={photoPreview}
                              alt="KTP Preview"
                              className="mx-auto max-h-64 w-auto rounded-xl object-contain"
                              crossOrigin="anonymous"
                              loading="lazy"
                            />
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
                        <Button
                          variant="dark"
                          type="submit"
                          size="lg"
                          className="rounded-full"
                          disabled={submitting || resolvingUnitId || !resolvedUnitId}
                        >
                          {resolvingUnitId
                            ? "Menyiapkan unit..."
                            : submitting
                            ? "Mengirim..."
                            : "Kirim Inquiry"}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => navigate(-1)}
                          className="rounded-full"
                          disabled={submitting}
                        >
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
                    <span className="text-muted small">
                      {history.length} permintaan
                    </span>
                    <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => loadHistory(currentUserId)}
                        disabled={loadingHistory}
                      >
                        {loadingHistory
                          ? "Menyinkronkan..."
                          : "Sinkronkan sekarang"}
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate("/payments")}
                      >
                        Lihat Pembayaran
                      </Button>
                    </div>
                  </div>

                  {history.length === 0 && (
                    <div className="text-muted">
                      Belum ada inquiry yang tercatat.
                    </div>
                  )}

                  {loadingHistory ? (
                    <div className="text-muted">Memuat riwayat inquiry...</div>
                  ) : (
                    <div className="space-y-3">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                            <div>
                              <div className="fw-bold text-dark">
                                {item.unitId || "Unit tidak diketahui"}
                              </div>
                              <div className="text-muted small">
                                {item.purchaseType === "sale" ? "Beli" : "Sewa"}{" "}
                                - {item.address || "Alamat tidak tersedia"}
                              </div>
                            </div>
                            <span
                              className={`badge rounded-pill bg-${
                                statusMeta[item.status]?.variant || "secondary"
                              }`}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          <div className="text-muted small mt-2">
                            {new Date(item.createdAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                          {Array.isArray(item.timeline) &&
                            item.timeline.length > 0 && (
                              <div className="mt-2 d-flex flex-wrap gap-2">
                                {item.timeline.map((t) => (
                                  <span
                                    key={`${t.status}-${t.at}`}
                                    className="badge bg-light text-dark border"
                                  >
                                    {getStatusLabel(t.status)} -{" "}
                                    {new Date(t.at).toLocaleString("id-ID", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                ))}
                              </div>
                            )}
                          {item.status === "approved" && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                              <Button
                                variant="dark"
                                size="sm"
                                className="rounded-full"
                                onClick={() => navigate("/payments")}
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
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#28a745",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                fontSize: "40px",
                color: "white",
              }}
            >
              OK
            </div>
          </div>
          <h3 className="fw-bold mb-3">Inquiry Berhasil Dikirim!</h3>
          <p className="text-muted mb-4">
            Terima kasih telah mengirimkan inquiry Anda. Tim kami akan segera
            menghubungi Anda untuk proses lebih lanjut.
          </p>
          <Button
            variant="dark"
            size="lg"
            onClick={handleModalClose}
            className="px-5"
          >
            Kembali ke Beranda
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Inquiry;
