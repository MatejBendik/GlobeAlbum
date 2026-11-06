import { getAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  try {
    const handlers = getAuth().handler();
    return await handlers[request.method as keyof typeof handlers](
      request,
      context,
    );
  } catch (error) {
    return handleError(error);
  }
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
};
