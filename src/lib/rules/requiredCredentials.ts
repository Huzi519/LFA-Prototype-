import { Trade, CredentialType } from "@/generated/prisma";

// Which credential types must be APPROVED (and unexpired) before a worker's
// profile can go LIVE for a given trade. See CLAUDE.md "Required credentials
// by trade" — this is an assumption pending client confirmation, so it's
// kept as a single configurable map rather than scattered through the app.
export const REQUIRED_CREDENTIALS_BY_TRADE: Record<Trade, CredentialType[]> =
  {
    PLUMBER: [
      CredentialType.TRADE_LICENCE,
      CredentialType.WHITE_CARD,
      CredentialType.PUBLIC_LIABILITY,
    ],
    ELECTRICIAN: [
      CredentialType.TRADE_LICENCE,
      CredentialType.WHITE_CARD,
      CredentialType.PUBLIC_LIABILITY,
    ],
    CARPENTER: [CredentialType.WHITE_CARD, CredentialType.PUBLIC_LIABILITY],
    LABOURER: [CredentialType.WHITE_CARD],
  };

export function requiredCredentialsFor(trade: Trade): CredentialType[] {
  return REQUIRED_CREDENTIALS_BY_TRADE[trade];
}
