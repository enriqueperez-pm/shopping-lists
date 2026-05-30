/** UUIDs of household members with shared access to shopping + budget data. */
export const HOUSEHOLD_MEMBER_IDS = [
  "71aa401e-ad23-4413-b72e-5e17c62bb507",
  "6a09dedf-b6bb-45ed-9606-091a66286875",
] as const;

/** Primary user whose user_financial_payload row both members sync to. */
export const HOUSEHOLD_PAYLOAD_USER_ID = "71aa401e-ad23-4413-b72e-5e17c62bb507";

export function resolveCloudPayloadUserId(
  authUserId: string | null | undefined
): string | null {
  if (!authUserId) return null;
  if ((HOUSEHOLD_MEMBER_IDS as readonly string[]).includes(authUserId)) {
    return HOUSEHOLD_PAYLOAD_USER_ID;
  }
  return authUserId;
}
