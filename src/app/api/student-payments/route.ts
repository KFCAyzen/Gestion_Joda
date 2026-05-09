import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleGetStudentPayments(_req: NextRequest, session: AuthSession) {
    if (session.user.role !== "student") {
        return NextResponse.json({ error: "Réservé aux étudiants" }, { status: 403 });
    }

    const { data: student } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("created_by", session.user.id)
        .single();

    if (!student) {
        return NextResponse.json({ error: "Étudiant introuvable" }, { status: 404 });
    }

    const { data: payments, error } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(payments ?? []);
}

export const GET = requireAuth(handleGetStudentPayments);
