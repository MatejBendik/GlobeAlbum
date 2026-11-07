import { getAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  try {
    const handlers = getAuth().handler();
    // Next.js falls back to GET for HEAD, but Neon forwards the request method.
    if (request.method === "HEAD") {
      const response = await handlers.GET(
        new Request(request.url, {
          headers: request.headers,
          signal: request.signal,
        }),
        context,
      );
      return new Response(null, {
        status: response.status,
        headers: response.headers,
      });
    }
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
