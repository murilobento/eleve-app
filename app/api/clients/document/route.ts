import { NextResponse } from "next/server";

import type { CnpjLookupResult } from "@/lib/clients-admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requirePermission } from "@/lib/rbac";

const LOOKUP_WINDOW_MS = 60_000;
const DOCUMENT_LIMIT = 10;

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  message?: string;
};

function normalizeDigits(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "eleve-app/1.0 (+http://localhost:3000)",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as BrasilApiCnpjResponse | null;

  if (!response.ok) {
    const message =
      payload?.message ||
      (response.status === 404
        ? "CNPJ not found."
        : response.status === 403
          ? "BrasilAPI denied the request for this server. Check network access or API restrictions and try again."
          : response.status === 429
            ? "BrasilAPI rate limit exceeded. Please try again in a few moments."
            : "Failed to look up the CNPJ.");

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (!payload?.razao_social) {
    throw new Error("CNPJ not found.");
  }

  return {
    document: normalizeDigits(payload.cnpj ?? cnpj),
    legalName: payload.razao_social,
    tradeName: payload.nome_fantasia ?? "",
    email: payload.email ?? "",
    phone: payload.ddd_telefone_1 ?? payload.ddd_telefone_2 ?? "",
    postalCode: normalizeDigits(payload.cep),
    street: payload.logradouro ?? "",
    number: payload.numero ?? "",
    complement: payload.complemento ?? "",
    district: payload.bairro ?? "",
    city: payload.municipio ?? "",
    state: payload.uf ?? "",
  };
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "clients.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { searchParams } = new URL(request.url);
    const cnpj = normalizeDigits(searchParams.get("cnpj"));

    if (cnpj.length !== 14) {
      return NextResponse.json({ error: "Enter a valid CNPJ." }, { status: 400 });
    }

    const rateLimitResponse = enforceRateLimit({
      key: `lookup:cnpj:clients:${permission.session.user.id}`,
      limit: DOCUMENT_LIMIT,
      windowMs: LOOKUP_WINDOW_MS,
      request,
      userId: permission.session.user.id,
      event: "lookup.rate_limited",
      message: "Too many CNPJ lookups. Try again later.",
      details: {
        scope: "clients.document",
      },
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const result = await lookupCnpj(cnpj);

    return NextResponse.json({ document: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
    const status =
      typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
        ? error.status
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
