/** Accept Pakistani mobile numbers with or without the country code. */
export function isValidGuardianPhone(value: string): boolean {
  const phone = value.trim();
  if (!/^\+?[0-9][0-9 ()-]*$/.test(phone)) return false;

  const digits = phone.replace(/\D/g, '');
  return (
    /^03[0-9]{9}$/.test(digits) ||
    /^3[0-9]{9}$/.test(digits) ||
    /^923[0-9]{9}$/.test(digits)
  );
}

export const GUARDIAN_PHONE_ERROR = 'Enter a valid Pakistani mobile number (e.g. 0300 1234567 or +92 300 1234567).';

export const DUPLICATE_STUDENT_ERROR = 'A student with this name and guardian phone number already exists.';
