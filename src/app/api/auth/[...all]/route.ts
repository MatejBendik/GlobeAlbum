import { getAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
export const runtime = "nodejs";
async function handler(request: Request) {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    return handleError(error);
  }
}
export { handler as GET, handler as POST };
