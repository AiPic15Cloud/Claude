import { NextResponse } from "next/server";
import { getDealById, getDealDocuments, getDealNotes, getOperatorById } from "@/lib/data";
import { generateDealAnalysis } from "@/lib/atlas/analyst";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dealId = body?.dealId;

  if (!dealId || typeof dealId !== "string") {
    return NextResponse.json({ generated: false, reason: "dealId manquant." }, { status: 400 });
  }

  const deal = await getDealById(dealId);
  if (!deal) {
    return NextResponse.json({ generated: false, reason: "Dossier introuvable." }, { status: 404 });
  }

  const [operator, notes, documents] = await Promise.all([
    getOperatorById(deal.operator_id),
    getDealNotes(dealId),
    getDealDocuments(dealId),
  ]);

  const result = await generateDealAnalysis(deal, operator, notes, documents);
  return NextResponse.json(result);
}
