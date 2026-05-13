import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentReminder } from '@/app/lib/emailService';
import { sendSmsToPhone } from '@/app/lib/smsService';
import { DEFAULT_PAYMENT_CONFIGS, getBourseServiceType } from '@/app/types/payment-config';
import type { ServiceType } from '@/app/types/payment-config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    // Charger la config des frais depuis la DB (avec fallback sur les defaults)
    const feeConfigs = { ...DEFAULT_PAYMENT_CONFIGS };
    const { data: configRows } = await supabaseAdmin.from('payment_config').select('*');
    if (configRows) {
      for (const row of configRows) {
        const st = row.service_type as ServiceType;
        if (feeConfigs[st]) {
          feeConfigs[st] = { ...feeConfigs[st], ...row, tranches: row.tranches ?? feeConfigs[st].tranches };
        }
      }
    }

    const today = new Date();
    const results = {
      checked: 0,
      late: 0,
      emailsSent: 0,
      smsSent: 0,
      errors: 0,
    };

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        student_id,
        type,
        tranche,
        montant,
        status,
        date_limite,
        penalites,
        students (
          nom,
          prenom,
          email,
          telephone
        )
      `)
      .in('status', ['attente', 'retard']);

    if (paymentsError) {
      console.error('[Cron] Erreur récupération paiements:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        message: 'Aucun paiement en attente',
        results,
      });
    }

    results.checked = payments.length;

    for (const payment of payments) {
      // Déterminer la config applicable
      const serviceType: ServiceType = payment.type === 'bourse'
        ? getBourseServiceType((payment as any).niveau)
        : (payment.type as ServiceType);
      const cfg = feeConfigs[serviceType] ?? DEFAULT_PAYMENT_CONFIGS[serviceType];
      const graceDays = cfg?.grace_days ?? 3;

      const dueDate = new Date(payment.date_limite);
      const graceEnd = new Date(dueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);
      const diffTime = today.getTime() - graceEnd.getTime();
      const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysLate > 0) {
        results.late++;

        // Mettre à jour le statut et les pénalités
        const penalties = daysLate * (cfg?.daily_penalty ?? 10000);
        if (payment.status !== 'retard') {
          await supabaseAdmin
            .from('payments')
            .update({ status: 'retard', penalites: penalties })
            .eq('id', payment.id);
        } else {
          await supabaseAdmin
            .from('payments')
            .update({ penalites: penalties })
            .eq('id', payment.id);
        }

        const reminderDays = [1, 3, 7, 14, 30];
        if (reminderDays.includes(daysLate)) {
          const student = payment.students as any;

          if (student) {
            const studentName = `${student.prenom} ${student.nom}`;
            const typeLabel = payment.type === 'bourse' ? 'Procédure Bourse'
              : payment.type === 'mandarin' ? 'Cours Mandarin' : 'Cours Anglais';
            const formattedAmount = new Intl.NumberFormat('fr-FR').format(payment.montant);

            if (student.email) {
              const emailSent = await sendPaymentReminder({
                studentName,
                studentEmail: student.email,
                paymentType: payment.type as 'bourse' | 'mandarin' | 'anglais',
                tranche: payment.tranche,
                amount: payment.montant,
                dueDate: payment.date_limite,
                daysLate,
                penalties: payment.penalites || 0,
              });

              if (emailSent) {
                results.emailsSent++;
                await supabaseAdmin.from('email_logs').insert({
                  recipient: student.email,
                  type: 'payment_reminder',
                  payment_id: payment.id,
                  days_late: daysLate,
                  sent_at: new Date().toISOString(),
                });
              } else {
                results.errors++;
              }
            }

            if (student.telephone) {
              const urgency = daysLate <= 3 ? 'modéré' : daysLate <= 7 ? 'important' : 'critique';
              const smsSent = await sendSmsToPhone(
                student.telephone,
                `JODA - RAPPEL PAIEMENT (${urgency}): ${studentName}, votre paiement ${typeLabel} Tranche ${payment.tranche} (${formattedAmount} FCFA) a ${daysLate} jour(s) de retard. Regularisez sur gestion-joda.vercel.app`
              );
              if (smsSent) results.smsSent++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Vérification terminée',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
