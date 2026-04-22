import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { updatePublicEquipmentSchema } from "@/lib/public-site-admin";
import {
  deletePublicEquipment,
  getPublicEquipmentById,
  updatePublicEquipment,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicEquipmentPaths(...slugs: Array<string | undefined>) {
  const paths = new Set(["/", "/sitemap.xml"]);

  for (const slug of slugs) {
    if (slug) {
      paths.add(`/equipamentos/${slug}`);
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
    const previousEquipment = await getPublicEquipmentById(id);
    const payload = updatePublicEquipmentSchema.parse(await request.json());
    await updatePublicEquipment(id, payload);
    const equipment = await getPublicEquipmentById(id);
    await revalidatePublicEquipmentPaths(previousEquipment?.slug, equipment?.slug);
    return NextResponse.json({ equipment });
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
    const previousEquipment = await getPublicEquipmentById(id);
    await deletePublicEquipment(id);
    await revalidatePublicEquipmentPaths(previousEquipment?.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
