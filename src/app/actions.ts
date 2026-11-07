"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUser, getAuth } from "@/lib/auth";
import * as domain from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { completeIdentityDeletion } from "@/lib/identity-cleanup";
import {
  profileAddressBase,
  availableProfileAddress,
} from "@/lib/profile-address";
import { displayNameSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

async function execute(
  operation: (id: string) => Promise<unknown>,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await operation(user.id);
    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message
          : errorMessage(error),
    };
  }
}
export async function previewProfileAction(name: string) {
  try {
    await requireUser();
    const base = profileAddressBase(displayNameSchema.parse(name));
    const [globes, retired] = await Promise.all([
      getDb().globe.findMany({
        where: { username: { startsWith: base.slice(0, 20) } },
        select: { username: true },
      }),
      getDb().retiredUsername.findMany({
        where: { username: { startsWith: base.slice(0, 20) } },
        select: { username: true },
      }),
    ]);
    return {
      username: availableProfileAddress(
        base,
        new Set([...globes, ...retired].map((row) => row.username)),
      ),
    };
  } catch {
    return { error: "Could not check your globe address. Please try again." };
  }
}
export async function onboardingAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const result = await execute((userId) =>
    domain.createGlobe(userId, Object.fromEntries(form)),
  );
  if (result.error) return result;
  redirect("/studio");
}
export async function addPlaceAction(
  value: unknown,
): Promise<ActionResult & { placeId?: string; visitId?: string }> {
  let created: { placeId: string; visitId: string } | undefined;
  const result = await execute(async (id) => {
    created = await domain.addPlace(id, value);
  });
  return result.success ? { ...result, ...created } : result;
}
export async function addVisitAction(value: unknown) {
  return execute((id) => domain.addVisit(id, value));
}
export async function editVisitAction(visitId: string, value: unknown) {
  return execute((id) => domain.editVisit(id, visitId, value));
}
export async function publicationAction(published: boolean) {
  return execute((id) => domain.setPublication(id, published));
}
export async function globeStyleAction(value: unknown) {
  return execute(async (id) => {
    const { username } = await domain.setGlobeStyle(id, value);
    revalidatePath(`/u/${username}`);
  });
}
export async function renameAction(name: string) {
  const result = await execute((id) => domain.renameGlobe(id, name));
  if (!result.error) revalidatePath("/settings");
  return result;
}
export async function countryAction(placeId: string, country: string) {
  return execute((id) => domain.correctCountry(id, placeId, country));
}
export async function captionAction(photoId: string, caption: string) {
  return execute((id) => domain.editCaption(id, photoId, caption));
}
export async function coverAction(placeId: string, photoId: string) {
  return execute((id) => domain.selectCover(id, placeId, photoId));
}
export async function deletePhotoAction(photoId: string) {
  return execute((id) => domain.deletePhoto(id, photoId));
}
export async function deleteVisitAction(visitId: string) {
  return execute((id) => domain.deleteVisit(id, visitId));
}
export async function signOutAction() {
  const { error } = await getAuth().signOut();
  if (error) throw new Error("Could not sign out. Please try again.");
  redirect("/");
}
export async function deleteAccountAction(
  confirmation: string,
): Promise<ActionResult> {
  const result = await execute(async (userId) => {
    const globe = await getDb().globe.findUnique({ where: { userId } });
    if (!globe || confirmation !== globe.username)
      throw new Error("Confirmation does not match.");
    await domain.deleteAccount(userId);
    // Revoke the current session while the provider identity still exists.
    // The database fence already denies all application access if sign-out fails.
    try {
      await getAuth().signOut();
    } catch {
      // Provider cleanup still proceeds; stale sessions cannot restore content.
    }
    await completeIdentityDeletion(userId);
  });
  if (result.error) return result;
  redirect("/");
}
