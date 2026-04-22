import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { updatePublicCompanySchema } from "@/lib/public-site-admin";
import {
  getPublicCompany,
  listPublicEquipment,
  listPublicServices,
  upsertPublicCompany,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicCompanyPaths() {
  const [services, equipment] = await Promise.all([
    listPublicServices(true),
    listPublicEquipment(true),
  ]);
  const paths = new Set([
    "/",
    "/sitemap.xml",
    ...services.map((service) => `/servicos/${service.slug}`),
    ...equipment.map((item) => `/equipamentos/${item.slug}`),
  ]);

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

    const company = await getPublicCompany();
    return NextResponse.json({ company });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = updatePublicCompanySchema.parse(await request.json());
    await upsertPublicCompany(payload);
    const company = await getPublicCompany();
    await revalidatePublicCompanyPaths();

    return NextResponse.json({ company });
  } catch (error) {
    return getErrorResponse(error);
  }
}
