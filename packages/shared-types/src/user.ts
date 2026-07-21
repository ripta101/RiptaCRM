export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
