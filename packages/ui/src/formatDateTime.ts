const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function datePart(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const hours = d.getHours() % 12 || 12;
  return `${datePart(d)} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export function formatDateOnly(iso: string): string {
  return datePart(new Date(iso));
}
