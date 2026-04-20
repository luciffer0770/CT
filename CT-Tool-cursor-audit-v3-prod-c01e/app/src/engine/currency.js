/** Display currency for rates and cost outputs (amounts are stored as numbers in the chosen currency per hour). */

export const CURRENCIES = {
  USD: { sym: "$", label: "US Dollar (USD)" },
  EUR: { sym: "€", label: "Euro (EUR)" },
  INR: { sym: "₹", label: "Indian Rupee (INR)" },
};

export function currencySymbol(code) {
  return CURRENCIES[code]?.sym ?? "$";
}

export function formatMoney(amount, currency = "USD", decimals = 2) {
  const sym = currencySymbol(currency);
  const n = Number(amount);
  const d = Number.isFinite(n) ? n : 0;
  return `${sym}${d.toFixed(decimals)}`;
}
