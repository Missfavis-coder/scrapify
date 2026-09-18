import {
  createUser,
  findUserByEmail,
  findUserByTekcifyId,
  toAuthUser,
  updateUserCookieIdentity,
  updateUserTekcifyProfile,
} from "@/lib/server/db/queries/users";
import { sendEmailFireAndForget } from "@/lib/server/email/client";
import * as welcomeTemplate from "@/lib/server/email/templates/welcome";
import { EMAIL_LINKS } from "@/lib/constants/email";
import { SITE } from "@/lib/constants/site";
import type { AuthUser, TekcifyUserProfile } from "@/lib/types/auth";
import type { UserRow } from "@/lib/server/db/schema";

interface FindOrCreateTekcifyInput {
  tekcifyUser: TekcifyUserProfile;
  cookieIdentity: string | null;
}

export class EmailAlreadyInUseError extends Error {
  code: string;
  constructor(email: string) {
    super(`Email ${email} is already linked to another account`);
    this.name = "EmailAlreadyInUseError";
    this.code = "EMAIL_IN_USE";
  }
}

export async function findOrCreateUserFromTekcify(
  input: FindOrCreateTekcifyInput
): Promise<AuthUser> {
  const existing = await findUserByTekcifyId(input.tekcifyUser.sub);
  if (existing) {
    await updateUserTekcifyProfile({
      id: existing.id,
      email: input.tekcifyUser.email,
      displayName: input.tekcifyUser.name,
      avatarUrl: input.tekcifyUser.picture,
    });
    if (
      input.cookieIdentity &&
      existing.cookieIdentity !== input.cookieIdentity
    ) {
      await updateUserCookieIdentity(existing.id, input.cookieIdentity);
    }
    return toAuthUser({
      ...existing,
      email: input.tekcifyUser.email,
      displayName: input.tekcifyUser.name,
      avatarUrl: input.tekcifyUser.picture,
      cookieIdentity: input.cookieIdentity ?? existing.cookieIdentity,
    });
  }

  const collision = await findUserByEmail(input.tekcifyUser.email);
  if (collision) {
    throw new EmailAlreadyInUseError(input.tekcifyUser.email);
  }

  const created = await createUser({
    email: input.tekcifyUser.email,
    tekcifyId: input.tekcifyUser.sub,
    displayName: input.tekcifyUser.name,
    avatarUrl: input.tekcifyUser.picture,
    cookieIdentity: input.cookieIdentity,
  });
  fireWelcomeEmail(created);
  return toAuthUser(created);
}

function fireWelcomeEmail(user: UserRow): void {
  const displayName = user.displayName ?? user.email.split("@")[0] ?? null;
  const dashboardUrl = `${SITE.url}${EMAIL_LINKS.dashboard}`;
  sendEmailFireAndForget({
    to: user.email,
    subject: welcomeTemplate.subject(),
    text: welcomeTemplate.text({
      email: user.email,
      displayName,
      dashboardUrl,
    }),
    html: welcomeTemplate.html({
      email: user.email,
      displayName,
      dashboardUrl,
    }),
  });
}
