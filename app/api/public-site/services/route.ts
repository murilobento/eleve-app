import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createPublicServiceSchema } from "@/lib/public-site-admin";
import {
  createPublicService,
  getPublicServiceById,
  listPublicServices,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicServicePaths(slug?: string) {
  const paths = new Set(["/", "/sitemap.xml"]);

  if (slug) {
    paths.add(`/servicos/${slug}`);
  }

  await Promise.all(Array.from(paths).map(async (path) => {
    await revalidatePath(path);
  }));
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const services = await listPublicServices(false);
    return NextResponse.json({ services });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createPublicServiceSchema.parse(await request.json());
    const serviceId = await createPublicService(payload);
    const service = await getPublicServiceById(serviceId);
    await revalidatePublicServicePaths(service?.slug);
    return NextResponse.json({ service });
  } catch (error) {
    return getErrorResponse(error);
  }
}
