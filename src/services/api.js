import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    return data;
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

    // Only append defined fields to keep the payload clean
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      }
    });

    const { data } = await api.post("/inquiry", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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