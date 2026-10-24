export const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
};

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export const formatPrice = (price, currency = 'USD') => {
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(num)) return '-';
  const curr = (currency || 'USD').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[curr] || '$';
  return `${symbol}${num.toFixed(2)} ${curr}`;
};
