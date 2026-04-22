import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createPublicEquipmentSchema } from "@/lib/public-site-admin";
import {
  createPublicEquipment,
  getPublicEquipmentById,
  listPublicEquipment,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicEquipmentPaths(slug?: string) {
  const paths = new Set(["/", "/sitemap.xml"]);

  if (slug) {
    paths.add(`/equipamentos/${slug}`);
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

    const equipment = await listPublicEquipment(false);
    return NextResponse.json({ equipment });
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

    const payload = createPublicEquipmentSchema.parse(await request.json());
    const equipmentId = await createPublicEquipment(payload);
    const equipment = await getPublicEquipmentById(equipmentId);
    await revalidatePublicEquipmentPaths(equipment?.slug);
    return NextResponse.json({ equipment });
  } catch (error) {
    return getErrorResponse(error);
  }
}
