import { randomBytes } from 'crypto';
export function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex');
}

export function getConfirmationTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // Token expires in 24 hours
  return expiry;
}

export function generateTempPassword(): string {
  return randomBytes(12).toString('hex');
}