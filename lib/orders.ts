export const UNIT_PRICE = 2495;
export class ValidationError extends Error {}
const field = (data: Record<string, unknown>, name: string, min: number, max: number) => {
  if (typeof data[name] !== 'string') throw new ValidationError('გთხოვ, შეავსე ყველა სავალდებულო ველი.');
  const value = data[name].trim();
  if (value.length < min || value.length > max) throw new ValidationError('გადაამოწმე შევსებული ველები.');
  return value;
};
export function validateOrder(data: Record<string, unknown>) {
  if (data.website) throw new ValidationError('მოთხოვნა ვერ დამუშავდა.');
  const requestKey = field(data, 'requestKey', 36, 36);
  if (!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(requestKey)) throw new ValidationError('განაახლე გვერდი და სცადე ხელახლა.');
  const phone = field(data, 'phone', 9, 24).replace(/[\s()+-]/g, '');
  if (!/^(?:995)?\d{9}$/.test(phone)) throw new ValidationError('ჩაწერე საქართველოს მოქმედი ტელეფონის ნომერი.');
  const postalCode = field(data, 'postalCode', 4, 4);
  if (!/^\d{4}$/.test(postalCode)) throw new ValidationError('საფოსტო ინდექსი უნდა შეიცავდეს 4 ციფრს.');
  const quantity = data.quantity;
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) throw new ValidationError('აირჩიე სწორი რაოდენობა.');
  return {
    requestKey, customerName: field(data, 'customerName', 2, 100),
    phone: phone.length === 9 ? '995' + phone : phone,
    city: field(data, 'city', 2, 80), address: field(data, 'address', 5, 250),
    apartment: field(data, 'apartment', 0, 80), postalCode,
    notes: field(data, 'notes', 0, 500), quantity: quantity as number,
  };
}
export async function payloadDigest(data: ReturnType<typeof validateOrder>) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
}
export function isOrderAdmin(request: Request, adminEmail?: string) {
  return !!adminEmail && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === adminEmail.toLowerCase();
}
