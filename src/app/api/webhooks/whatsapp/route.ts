
import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookPayload } from '@/lib/whatsapp-official';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verified!');
            return new NextResponse(challenge, { status: 200 });
        } else {
            console.error('❌ Webhook verification failed. Tokens do not match.');
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await handleWebhookPayload(body);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
