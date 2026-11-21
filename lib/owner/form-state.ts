import type { CredentialsFieldErrors, OwnerPropertyFieldErrors } from '@/lib/owner/validation';

export interface AuthFormState {
  status: 'idle' | 'error' | 'confirmation_sent';
  message: string | null;
  errors: CredentialsFieldErrors;
}

export const initialAuthFormState: AuthFormState = {
  status: 'idle',
  message: null,
  errors: {},
};

export interface RegisteredSummary {
  mansionName: string;
  buildingName: string | null;
  roomNumber: string;
}

export interface OwnerPropertyFormState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
  errors: OwnerPropertyFieldErrors;
  registered: RegisteredSummary | null;
}

export const initialOwnerPropertyFormState: OwnerPropertyFormState = {
  status: 'idle',
  message: null,
  errors: {},
  registered: null,
};
