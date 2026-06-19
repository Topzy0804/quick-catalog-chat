import { formatMoney } from "./format";

export interface InterestItem {
  name: string;
  price: number;
  qty: number;
}

/** Strip everything except digits; assumes international format already. */
export function normalizeWhatsappNumber(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

export function buildWhatsappOrderLink(opts: {
  number: string;
  businessName: string;
  items: InterestItem[];
  currency?: string;
  customerName?: string;
}) {
  const { number, businessName, items, currency = "NGN", customerName } = opts;
  const lines: string[] = [];
  lines.push(`Hi ${businessName}! I'd like to order:`);
  lines.push("");
  let total = 0;
  for (const it of items) {
    const sub = it.price * it.qty;
    total += sub;
    lines.push(`• ${it.qty} × ${it.name} — ${formatMoney(sub, currency)}`);
  }
  lines.push("");
  lines.push(`Total: ${formatMoney(total, currency)}`);
  if (customerName) {
    lines.push("");
    lines.push(`— ${customerName}`);
  }
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${normalizeWhatsappNumber(number)}?text=${text}`;
}

export function buildWhatsappReplyLink(opts: {
  number: string;
  customerName: string;
  orderSummary: string;
}) {
  const text = encodeURIComponent(
    `Hi ${opts.customerName}, thanks for your order:\n\n${opts.orderSummary}\n\nLet's confirm details.`,
  );
  return `https://wa.me/${normalizeWhatsappNumber(opts.number)}?text=${text}`;
}
