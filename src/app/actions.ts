"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { requireUser, getAuth } from "@/lib/auth";
import * as domain from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { getDb } from "@/lib/db";
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
export async function addPlaceAction(value: unknown) {
  return execute((id) => domain.addPlace(id, value));
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
export async function renameAction(name: string) {
  return execute((id) => domain.renameGlobe(id, name));
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
  await getAuth().api.signOut({ headers: await headers() });
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
    await getAuth().api.signOut({ headers: await headers() });
  });
  if (result.error) return result;
  redirect("/");
}
