// Helper Formatters for Currency, Dates, Time, and WhatsApp Direct Links

export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatDateIndonesian = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const formatTime = (timeString) => {
  if (!timeString) return '-';
  return timeString.substring(0, 5); // Returns HH:mm
};

export const formatWaUrl = (phone) => {
  if (!phone) return '#';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
};
