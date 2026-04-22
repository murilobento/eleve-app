import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createPublicTestimonialSchema } from "@/lib/public-site-admin";
import {
  createPublicTestimonial,
  getPublicTestimonialById,
  listPublicTestimonials,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function revalidatePublicHome() {
  await revalidatePath("/");
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const testimonials = await listPublicTestimonials(false);
    return NextResponse.json({ testimonials });
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

    const payload = createPublicTestimonialSchema.parse(await request.json());
    const testimonialId = await createPublicTestimonial(payload);
    const testimonial = await getPublicTestimonialById(testimonialId);
    await revalidatePublicHome();
    return NextResponse.json({ testimonial });
  } catch (error) {
    return getErrorResponse(error);
  }
}
