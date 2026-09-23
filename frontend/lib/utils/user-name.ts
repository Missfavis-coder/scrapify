interface UserNameSource {
  displayName?: string | null;
  email?: string | null;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getFirstName(user: UserNameSource): string {
  if (user.displayName) {
    const first = user.displayName.trim().split(/\s+/)[0];
    if (first) return capitalize(first);
  }
  if (user.email) {
    const prefix = user.email.split("@")[0] ?? "";
    const first = prefix.split(/[._-]/)[0];
    if (first) return capitalize(first);
  }
  return "there";
}
