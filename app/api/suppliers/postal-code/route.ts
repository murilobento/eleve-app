import { NextResponse } from "next/server";

import type { PostalCodeLookupResult } from "@/lib/suppliers-admin";
import { requirePermission } from "@/lib/rbac";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function normalizePostalCode(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

async function lookupPostalCode(postalCode: string): Promise<PostalCodeLookupResult> {
  const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to look up the postal code.");
  }

  const payload = (await response.json()) as ViaCepResponse;

  if (payload.erro || !payload.logradouro || !payload.bairro || !payload.localidade || !payload.uf) {
    throw new Error("Postal code not found.");
  }

  return {
    postalCode: normalizePostalCode(payload.cep ?? postalCode),
    street: payload.logradouro,
    district: payload.bairro,
    city: payload.localidade,
    state: payload.uf,
  };
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "suppliers.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { searchParams } = new URL(request.url);
    const postalCode = normalizePostalCode(searchParams.get("postalCode"));

    if (postalCode.length !== 8) {
      return NextResponse.json({ error: "Enter a valid postal code." }, { status: 400 });
    }

    const result = await lookupPostalCode(postalCode);

    return NextResponse.json({ postalCode: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
