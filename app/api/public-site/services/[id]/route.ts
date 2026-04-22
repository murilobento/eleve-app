import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { updatePublicServiceSchema } from "@/lib/public-site-admin";
import {
  deletePublicService,
  getPublicServiceById,
  updatePublicService,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicServicePaths(...slugs: Array<string | undefined>) {
  const paths = new Set(["/", "/sitemap.xml"]);

  for (const slug of slugs) {
    if (slug) {
      paths.add(`/servicos/${slug}`);
    }
  }

  await Promise.all(Array.from(paths).map(async (path) => {
    await revalidatePath(path);
  }));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "public-site.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const previousService = await getPublicServiceById(id);
    const payload = updatePublicServiceSchema.parse(await request.json());
    await updatePublicService(id, payload);
    const service = await getPublicServiceById(id);
    await revalidatePublicServicePaths(previousService?.slug, service?.slug);

    return NextResponse.json({ service });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "public-site.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const previousService = await getPublicServiceById(id);
    await deletePublicService(id);
    await revalidatePublicServicePaths(previousService?.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
