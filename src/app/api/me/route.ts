import { requireActor } from "@/server/auth/guards";
import { handler,json } from "@/server/http";
export const GET = handler(async (request,id) => json(await requireActor(request.headers),id));
