
import { prisma } from './prisma';
import { logActivity } from './permissions';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;

interface WhatsAppMessagePayload {
    messaging_product: 'whatsapp';
    to: string;
    type: 'text' | 'template' | 'image' | 'video' | 'document' | 'audio';
    text?: { body: string };
    template?: {
        name: string;
        language: { code: string };
        components?: any[];
    };
    image?: { link?: string; id?: string; caption?: string };
    video?: { link?: string; id?: string; caption?: string };
    document?: { link?: string; id?: string; caption?: string; filename?: string };
    audio?: { link?: string; id?: string };
}

/**
 * Send a message via Official WhatsApp API
 */
export async function sendMessageOfficial(
    to: string,
    message: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'document' | 'audio'
): Promise<any> {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
        throw new Error('WhatsApp Official API credentials not configured');
    }

    // Format phone number (remove non-digits)
    const formattedTo = to.replace(/\D/g, '');

    const payload: WhatsAppMessagePayload = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: mediaUrl && mediaType ? mediaType : 'text',
    };

    if (mediaUrl && mediaType) {
        // Handle media messages
        const mediaObject: any = { link: mediaUrl };
        if (mediaType !== 'audio' && message) {
            mediaObject.caption = message; // Audio doesn't support caption
        }

        if (mediaType === 'image') payload.image = mediaObject;
        else if (mediaType === 'video') payload.video = mediaObject;
        else if (mediaType === 'document') payload.document = mediaObject;
        else if (mediaType === 'audio') payload.audio = mediaObject;
        else {
            // Fallback to text if type mismatch (shouldn't happen with defined types)
            payload.type = 'text';
            payload.text = { body: `${message} ${mediaUrl}` };
        }

    } else {
        // Text only
        payload.text = { body: message };
    }

    console.log(`📤 Sending Official WhatsApp message to ${formattedTo}...`);

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Error sending WhatsApp message:', data);
            throw new Error(data.error?.message || 'Failed to send message');
        }

        console.log('✅ Message sent successfully:', data);
        return data;
    } catch (error) {
        console.error('❌ Network or API error sending message:', error);
        throw error;
    }
}

/**
 * Process incoming Webhook payload
 * This function extracts messages and statuses from the payload and saves them to the DB.
 */
export async function handleWebhookPayload(body: any) {
    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry.length > 0) {
            for (const entry of body.entry) {
                if (entry.changes && entry.changes.length > 0) {
                    for (const change of entry.changes) {
                        if (change.value && change.value.messages && change.value.messages.length > 0) {
                            // Handle incoming messages
                            for (const message of change.value.messages) {
                                await processIncomingMessage(message, change.value.metadata);
                            }
                        }

                        // Handle statuses (sent, delivered, read)
                        if (change.value && change.value.statuses && change.value.statuses.length > 0) {
                            for (const status of change.value.statuses) {
                                await processMessageStatus(status);
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Process a single incoming message from the Webhook
 */
async function processIncomingMessage(message: any, metadata: any) {
    console.log('📩 Processing incoming Official message:', message.id);

    const from = message.from; // Sender phone number
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);
    const type = message.type;
    const name = message.contacts?.[0]?.profile?.name || from;

    // Find the Official Connection in DB
    const connection = await prisma.whatsAppConnection.findFirst({
        where: {
            phoneNumberId: metadata.phone_number_id,
            type: 'OFFICIAL'
        }
    });

    if (!connection) {
        console.warn(`⚠️ Received message for unknown phone_number_id: ${metadata.phone_number_id}`);
        return;
    }

    const chatId = `${from}@s.whatsapp.net`; // Standardize ID formatting to match Baileys if possible, or keep raw
    // Baileys uses [number]@s.whatsapp.net. Let's try to maintain consistency.

    let text = '';
    let mediaUrl = null;
    let mediaType = null;
    let mediaMimeType = null;
    let mediaCaption = null;

    if (type === 'text') {
        text = message.text.body;
    } else if (type === 'image') {
        mediaType = 'image';
        mediaMimeType = message.image.mime_type;
        mediaCaption = message.image.caption;
        // We need to download the media using the ID, but for now let's just store the ID if we can't download immediately
        // Official API requires a separate call to get the media URL, then download it with Auth.
        // For this MVP, we might skip media download or implement a placeholder.
        text = `[Imagem] ${message.image.caption || ''}`;
        // TODO: Implement media download
    } else if (type === 'audio') {
        mediaType = 'audio';
        mediaMimeType = message.audio.mime_type;
        text = '[Áudio]';
    } else if (type === 'document') {
        mediaType = 'document';
        mediaMimeType = message.document.mime_type;
        mediaCaption = message.document.caption;
        text = `[Documento] ${message.document.filename || ''}`;
    } else if (type === 'video') {
        mediaType = 'video';
        mediaMimeType = message.video.mime_type;
        mediaCaption = message.video.caption;
        text = `[Vídeo] ${message.video.caption || ''}`;
    } else {
        text = `[Mensagem do tipo ${type}]`;
    }

    // Upsert Chat
    await prisma.chat.upsert({
        where: { id: chatId },
        update: {
            lastMessageAt: timestamp,
            lastMessagePreview: text.substring(0, 100),
            totalMessages: { increment: 1 },
            unreadCount: { increment: 1 },
        },
        create: {
            id: chatId,
            connectionId: connection.id,
            contactName: name,
            contactNumber: from,
            isGroup: false,
            lastMessageAt: timestamp,
            lastMessagePreview: text.substring(0, 100),
            totalMessages: 1,
            unreadCount: 1,
        }
    });

    // Create Message
    await prisma.message.create({
        data: {
            messageId: messageId,
            chatId: chatId,
            fromMe: false,
            text: text,
            hasMedia: !!mediaType,
            mediaType: mediaType,
            mediaUrl: mediaUrl, // TODO: URL after download
            mediaMimeType: mediaMimeType,
            mediaCaption: mediaCaption,
            status: 'DELIVERED', // Incoming messages are delivered to us
            senderNumber: from,
            senderName: name,
            timestamp: timestamp,
        }
    });

    console.log(`✅ Default message saved to DB: ${messageId}`);

}

async function processMessageStatus(status: any) {
    console.log(`🔄 Processing status update: ${status.status} for ${status.id}`);

    const messageId = status.id;
    const newStatus = status.status; // sent, delivered, read, failed

    // Map Meta status to our DB status
    let dbStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT';

    if (newStatus === 'sent') dbStatus = 'SENT';
    else if (newStatus === 'delivered') dbStatus = 'DELIVERED';
    else if (newStatus === 'read') dbStatus = 'READ';
    else if (newStatus === 'failed') dbStatus = 'FAILED';

    // Update message status in DB
    // Since messageId in DB is unique, we find the message first
    const message = await prisma.message.findFirst({
        where: { messageId: messageId }
    });

    if (message) {
        await prisma.message.update({
            where: { id: message.id },
            data: { status: dbStatus }
        });
        console.log(`✅ Message status updated to ${dbStatus}`);
    } else {
        // Might happen if we send a message and get status update before it's saved (async race), 
        // or for messages sent before this system was active.
        console.log(`⚠️ Message ${messageId} not found for status update`);
    }
}
