import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  try {
    // Ensure we always request JSON responses
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Accept', 'application/json');
    } else {
      config.headers = { ...(typeof config.headers === 'object' && config.headers ? config.headers : {}), Accept: 'application/json' };
    }

    if (token) {
      // Axios v1 may use AxiosHeaders; support both plain objects and AxiosHeaders
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else if (config.headers && typeof config.headers === 'object') {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      }
    }
  } catch (err) {
    // Never let an interceptor crash block requests; fallback to plain headers
    const safeHeaders = (typeof config.headers === 'object' && config.headers) ? config.headers : {}
    config.headers = { ...safeHeaders, Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : null) }
    if (import.meta?.env?.DEV) {
      console.warn('Auth header injection failed, using fallback headers:', err)
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Helps debugging cases where GET works but /user or POST fails
    if (import.meta?.env?.DEV) {
      const status = err?.response?.status
      const url = err?.config?.url
      if (status === 401 || status === 403) {
        console.warn('Unauthorized/Forbidden response', { url, status, data: err?.response?.data })
      }
    }
    return Promise.reject(err)
  }
)

const normalizeUserResponse = (payload) => {
  if (!payload) return null
  // Common Laravel shapes: { user: {...} }, { data: {...} }, or direct user object
  const candidate = payload?.user || payload?.data?.user || payload?.data || payload
  return (candidate && typeof candidate === 'object') ? candidate : null
}

const authAPI = {
  async login(email, password) {
    const { data } = await api.post("/login", { email, password });
    return data;
  },

  async register(payload) {
    const { data } = await api.post("/register", payload);
    return data;
  },

  async getProfile() {
    const { data } = await api.get("/user");
    return normalizeUserResponse(data) || data;
  },

  // Alias used by some pages/teams
  async getUser() {
    return authAPI.getProfile()
  },

  async logout() {
    const { data } = await api.post("/logout");
    return data;
  },
};

const unitsAPI = {
  async getAll() {
    const { data } = await api.get("/unit");
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/unit", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/unit/${id}`, payload);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/unit/${id}`);
    return data;
  },
};

const unitTypesAPI = {
  async getAll() {
    const { data } = await api.get("/unit-type");
    return data;
  },

  async getOne(id) {
    const { data } = await api.get(`/unit-type/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/unit-type", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/unit-type/${id}`, payload);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/unit-type/${id}`);
    return data;
  },
};

const inquiriesAPI = {
  async getAll(params = {}) {
    const { data } = await api.get("/inquiry", { params });
    return data;
  },

  async getOne(id) {
    const { data } = await api.get(`/inquiry/${id}`);
    return data;
  },

  async create(payload) {
    const formData = new FormData();

    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;

      // Allow array-style fields (e.g., identity_card[])
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item === undefined || item === null || item === "") return;
          formData.append(`${key}[]`, item);
        });
        return;
      }

      formData.append(key, value);
    });

    // Let axios set multipart boundaries automatically; auth header is injected by interceptor
    const { data } = await api.post("/inquiry", formData);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/inquiry/${id}`, payload);
    return data;
  },

  async updateStatus(id, status) {
    const { data } = await api.patch(`/inquiry/${id}`, { status });
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/inquiry/${id}`);
    return data;
  },
};

const paymentsAPI = {
  async getAll(params = {}) {
    const { data } = await api.get("/payment", { params });
    return data;
  },

  async getOne(id) {
    const { data } = await api.get(`/payment/${id}`);
    return data;
  },

  async getByInquiry(inquiryId, params = {}) {
    const { data } = await api.get("/payment", { params: { ...params, inquiry_id: inquiryId } });
    return data;
  },

  async create(payload) {
    // Backend requires multipart proof upload on create in some implementations.
    // Support both JSON payloads and FormData payloads.
    if (payload instanceof FormData) {
      const { data } = await api.post("/payment", payload);
      return data;
    }

    const proof = payload?.proof
    const isFile = (v) => typeof File !== 'undefined' && v instanceof File
    const proofIsArray = Array.isArray(proof)
    const proofHasFiles = proofIsArray ? proof.some(isFile) : isFile(proof)

    if (proofHasFiles) {
      const formData = new FormData();

      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        if (key === 'proof') {
          // Backend expects proof as array: proof[]
          if (Array.isArray(value)) {
            value.filter(isFile).forEach((file) => formData.append('proof[]', file))
          } else if (isFile(value)) {
            formData.append('proof[]', value)
          }
          return;
        }

        formData.append(key, value);
      });

      const { data } = await api.post("/payment", formData);
      return data;
    }

    const { data } = await api.post("/payment", payload);
    return data;
  },

  async attachProof(id, file) {
    const formData = new FormData();
    formData.append("proof", file);

    const { data } = await api.post(`/payment/${id}/proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/payment/${id}`, payload);
    return data;
  },

  async updateStatus(id, status) {
    const { data } = await api.patch(`/payment/${id}`, { status });
    return data;
  },
};

export { api, authAPI, unitsAPI, unitTypesAPI, inquiriesAPI, paymentsAPI };
export default api;