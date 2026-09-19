export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;
  const rest = digits.slice(2);
  const splitAt = digits.length > 10 ? 5 : 4;
  if (rest.length <= splitAt) return `(${ddd})${rest}`;
  return `(${ddd})${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
}
