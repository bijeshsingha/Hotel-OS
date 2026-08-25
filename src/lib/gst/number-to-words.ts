/**
 * Converts a numeric currency amount into Indian English words (Lakhs, Crores, Thousands, Rupees & Paise)
 * e.g. 2000 => "TWO THOUSAND RUPEES ONLY"
 * e.g. 0 => "ZERO RUPEES ONLY"
 * e.g. 1904.76 => "ONE THOUSAND NINE HUNDRED FOUR RUPEES AND SEVENTY-SIX PAISE ONLY"
 */

const ones = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const tens = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + " HUNDRED ";
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ones[n] + " ";
  }
  return str.trim();
}

export function numberToWordsINR(amount: number): string {
  if (!amount || amount === 0) return "ZERO RUPEES ONLY";

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let rupeesStr = "";
  let rem = rupees;

  // Crores (1,00,00,000)
  const crores = Math.floor(rem / 10000000);
  if (crores > 0) {
    rupeesStr += convertBelowThousand(crores) + " CRORE ";
    rem %= 10000000;
  }

  // Lakhs (1,00,000)
  const lakhs = Math.floor(rem / 100000);
  if (lakhs > 0) {
    rupeesStr += convertBelowThousand(lakhs) + " LAKH ";
    rem %= 100000;
  }

  // Thousands (1,000)
  const thousands = Math.floor(rem / 1000);
  if (thousands > 0) {
    rupeesStr += convertBelowThousand(thousands) + " THOUSAND ";
    rem %= 1000;
  }

  // Remaining below thousand
  if (rem > 0) {
    rupeesStr += convertBelowThousand(rem) + " ";
  }

  rupeesStr = rupeesStr.trim();
  if (!rupeesStr) rupeesStr = "ZERO";

  let result = (isNegative ? "MINUS " : "") + rupeesStr + " RUPEES";

  if (paise > 0) {
    result += " AND " + convertBelowThousand(paise) + " PAISE";
  }

  result += " ONLY";
  return result;
}
