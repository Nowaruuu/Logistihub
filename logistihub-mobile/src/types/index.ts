export interface Tenant {
  tenant_id: number;
  company_name: string;
  business_type: string;
  slug: string;
  plan: string;
  status: string;
}

export interface AppUser {
  user_id: number;
  tenant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  created_at: string;
  profile_picture?: string;
}

export interface AuthState {
  user: AppUser | null;
  tenant: Tenant | null;
  token: string | null;
  isLoading: boolean;
}
