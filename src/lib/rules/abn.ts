// Australian Business Number validation, done locally (no ABR API call —
// see CLAUDE.md "Out of scope"). Algorithm reference:
// https://abr.business.gov.au/Help/AbnFormat
//
// 1. Subtract 1 from the first digit.
// 2. Multiply each of the 11 digits by its weighting factor.
// 3. Sum the products.
// 4. The ABN is valid if the sum is divisible by 89.

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** Strips spaces and non-digits so callers can pass user-typed input as-is. */
export function normaliseAbn(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidAbn(input: string): boolean {
  const digits = normaliseAbn(input);
  if (digits.length !== 11) return false;

  const weightedDigits = digits
    .split("")
    .map((d, i) => (i === 0 ? Number(d) - 1 : Number(d)));

  const sum = weightedDigits.reduce(
    (total, digit, i) => total + digit * WEIGHTS[i],
    0
  );

  return sum % 89 === 0;
}
