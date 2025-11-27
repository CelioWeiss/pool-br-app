import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Garante que o firebase-admin seja inicializado apenas uma vez
if (getApps().length === 0) {
  try {
     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
     initializeApp({
       credential: cert(serviceAccount)
     });
  } catch(e) {
    console.error("Firebase Admin initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set.", e);
  }
}

export async function POST(req: Request) {
  try {
    const { chamadoId } = await req.json();

    if (!chamadoId) {
      return NextResponse.json({ sucesso: false, error: "chamadoId é obrigatório" }, { status: 400 });
    }

    const message = {
      notification: {
        title: "Limpeza Finalizada",
        body: "A limpeza da sua piscina foi finalizada com sucesso. Acompanhe no portal.",
      },
      // O 'topic' é uma forma de enviar para dispositivos que "assinaram" este tópico.
      // No app cliente, você precisaria inscrever o usuário no tópico com o ID do chamado/cliente.
      topic: chamadoId.replace(/[^a-zA-Z0-9-_.~%]/g, '_'), // Nomes de tópicos têm restrições de caracteres
    };

    await getMessaging().send(message);

    return NextResponse.json({ sucesso: true });

  } catch (error: any) {
    console.error("Erro ao enviar notificação:", error);
    return NextResponse.json({ sucesso: false, error: error.message }, { status: 500 });
  }
}
