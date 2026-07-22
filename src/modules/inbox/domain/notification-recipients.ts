export function notificationRecipients(
  interestedMembershipIds: readonly string[],
  actorMembershipId: string,
): string[] {
  return [...new Set(interestedMembershipIds)]
    .filter((membershipId) => membershipId !== actorMembershipId);
}
