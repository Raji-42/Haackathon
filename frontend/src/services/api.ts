const API_BASE = '/api';

export class ApiService {
  private static getToken(): string | null {
    return localStorage.getItem('certiflow_token');
  }

  public static setToken(token: string) {
    localStorage.setItem('certiflow_token', token);
  }

  public static clearToken() {
    localStorage.removeItem('certiflow_token');
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  }

  // 1. Auth & Demo Switcher
  public static async login(email: string, password = 'Password123!') {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  public static async demoSwitch(demoKey: string) {
    const data = await this.request('/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ demoKey }),
    });
    this.setToken(data.token);
    return data;
  }

  public static async getProfile() {
    return this.request('/auth/me');
  }

  // 2. Batches
  public static async getBatches() {
    return this.request('/batches');
  }

  public static async getBatchById(id: string) {
    return this.request(`/batches/${id}`);
  }

  public static async uploadBatch(courseName: string, file: File) {
    const formData = new FormData();
    formData.append('courseName', courseName);
    formData.append('file', file);

    const token = this.getToken();
    const response = await fetch(`${API_BASE}/batches/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      const err: any = new Error(data.error || 'Upload failed');
      err.validation = data.validation;
      throw err;
    }
    return data;
  }

  public static async submitBatch(id: string) {
    return this.request(`/batches/${id}/submit`, { method: 'POST' });
  }

  public static async resubmitReturnedBatch(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const response = await fetch(`${API_BASE}/batches/${id}/resubmit-file`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      const err: any = new Error(data.error || 'Resubmission failed');
      err.validation = data.validation;
      throw err;
    }
    return data;
  }

  // 3. Approvals
  public static async districtApproval(batchId: string, action: 'APPROVED' | 'REJECTED' | 'RETURNED', remarks?: string) {
    return this.request('/approvals/district', {
      method: 'POST',
      body: JSON.stringify({ batchId, action, remarks }),
    });
  }

  public static async qualityReview(batchId: string, decision: 'APPROVED' | 'FLAGGED', observations: string) {
    return this.request('/approvals/quality', {
      method: 'POST',
      body: JSON.stringify({ batchId, decision, observations }),
    });
  }

  public static async stateApproval(batchId: string, action: 'APPROVED' | 'REJECTED', remarks?: string) {
    return this.request('/approvals/state', {
      method: 'POST',
      body: JSON.stringify({ batchId, action, remarks }),
    });
  }

  // 4. Certificates & Public Verification
  public static async publicVerify(query: string) {
    const response = await fetch(`${API_BASE}/public/verify/${encodeURIComponent(query)}`);
    return response.json();
  }

  public static async cancelCertificate(certNumber: string, reason: string) {
    return this.request(`/certificates/${certNumber}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public static async retryWhatsApp(notificationId: string) {
    return this.request(`/notifications/${notificationId}/retry`, { method: 'POST' });
  }

  // 5. System Configs
  public static async getConfigs() {
    return this.request('/system/configs');
  }

  public static async updateConfig(key: string, value: string) {
    return this.request('/system/configs', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }
}
