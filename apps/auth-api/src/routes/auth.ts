import { Router } from "express";
import type {
  ChooseProfileResponse,
  LoginRequest,
  LoginResponse,
  Profile,
  SelectProfileRequest,
} from "@riptacrm/shared-types";
import { prisma } from "../db";
import { verifyPassword } from "../lib/passwords";
import { signAuthToken, signPreAuthToken, verifyPreAuthToken } from "../lib/jwt";

export const authRouter = Router();

const ACCESS_MANAGEMENT_API_URL = process.env.ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";

// A valid bcrypt hash of a value nobody will ever type as a password. Comparing against
// this when the username isn't found means an unknown-username request takes roughly the
// same time as a wrong-password request, so response timing doesn't reveal which usernames
// exist in the database.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8y6ONf7A1YWyCZBOF/lHmqp6ecC9wS";

// Unlike every other cross-service read in this codebase (which fails soft — a degraded
// picker or an empty widget), login being unable to resolve the user's profile(s) must not
// silently issue a profile-less session (navItemIds: [] would be an invisible, hard-to-debug
// lockout). Failing loud — no token, a clear 503 — is the one deliberate exception to the
// "reads fail soft" convention documented in docs/architecture.md.
async function fetchProfilesForUser(userId: string): Promise<Profile[]> {
  const upstream = await fetch(`${ACCESS_MANAGEMENT_API_URL}/api/profiles?userId=${encodeURIComponent(userId)}`);
  if (!upstream.ok) {
    throw new Error(`access-management-api returned ${upstream.status}`);
  }
  const data: { results: Profile[] } = await upstream.json();
  return data.results;
}

function buildLoginResponse(user: { id: string; name: string; email: string }, profile: Profile): LoginResponse {
  const token = signAuthToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    profileId: profile.id,
    profileName: profile.name,
    dashboardType: profile.dashboardType,
    canStartInteractions: profile.canStartInteractions,
    navItemIds: profile.navItemIds,
  });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profileId: profile.id,
      profileName: profile.name,
      dashboardType: profile.dashboardType,
      canStartInteractions: profile.canStartInteractions,
      navItemIds: profile.navItemIds,
    },
  };
}

authRouter.post("/auth/login", async (req, res) => {
  const body = req.body as Partial<LoginRequest>;

  if (!body.username?.trim() || !body.password) {
    return res.status(400).json({ error: "username and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { username: body.username.trim() } });
  const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  let profiles: Profile[];
  try {
    profiles = await fetchProfilesForUser(user.id);
  } catch (err) {
    console.error("Failed to resolve profiles for login:", err);
    return res.status(503).json({ error: "Unable to verify account permissions. Try again shortly." });
  }

  if (profiles.length === 0) {
    return res.status(403).json({ error: "Your account has no assigned profile. Contact an administrator." });
  }

  if (profiles.length === 1) {
    return res.json(buildLoginResponse(user, profiles[0]));
  }

  const chooseResponse: ChooseProfileResponse = {
    status: "choose-profile",
    preAuthToken: signPreAuthToken({ sub: user.id, purpose: "profile-selection" }),
    profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
  };
  res.json(chooseResponse);
});

authRouter.post("/auth/select-profile", async (req, res) => {
  const body = req.body as Partial<SelectProfileRequest>;
  if (!body.preAuthToken?.trim() || !body.profileId?.trim()) {
    return res.status(400).json({ error: "preAuthToken and profileId are required." });
  }

  let claims;
  try {
    claims = verifyPreAuthToken(body.preAuthToken);
  } catch {
    return res.status(401).json({ error: "Profile selection has expired. Please log in again." });
  }

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) {
    return res.status(401).json({ error: "Account no longer exists." });
  }

  let profiles: Profile[];
  try {
    profiles = await fetchProfilesForUser(user.id);
  } catch (err) {
    console.error("Failed to resolve profiles for profile selection:", err);
    return res.status(503).json({ error: "Unable to verify account permissions. Try again shortly." });
  }

  const chosen = profiles.find((p) => p.id === body.profileId);
  if (!chosen) {
    return res.status(403).json({ error: "That profile is not assigned to your account." });
  }

  res.json(buildLoginResponse(user, chosen));
});
