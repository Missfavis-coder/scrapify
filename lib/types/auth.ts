
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
}

export interface AuthenticationResponse {
  user?: AuthUser;
  message?: string;
  error?: string;
}


export interface CurrentUserResponse {
  user: AuthUser | null;
}

export interface LogoutResponse {
  message?: string;
  error?: string;
}

