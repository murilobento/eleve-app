import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { updatePublicTestimonialSchema } from "@/lib/public-site-admin";
import {
  deletePublicTestimonial,
  getPublicTestimonialById,
  updatePublicTestimonial,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicHome() {
  await revalidatePath("/");
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
    const payload = updatePublicTestimonialSchema.parse(await request.json());
    await updatePublicTestimonial(id, payload);
    const testimonial = await getPublicTestimonialById(id);
    await revalidatePublicHome();
    return NextResponse.json({ testimonial });
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
    await deletePublicTestimonial(id);
    await revalidatePublicHome();
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
