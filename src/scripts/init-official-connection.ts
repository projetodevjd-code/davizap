
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Manual env loading because we are running as a script
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes
            process.env[key] = value;
        }
    });
}

const prisma = new PrismaClient();

async function main() {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
        console.error('❌ WHATSAPP_PHONE_NUMBER_ID is not defined in environment variables.');
        process.exit(1);
    }

    console.log(`🔄 Checking for existing Official Connection with Phone Number ID: ${phoneNumberId}...`);

    // Check if connection already exists
    const existingConnection = await prisma.whatsAppConnection.findFirst({
        where: {
            phoneNumberId: phoneNumberId,
            type: 'OFFICIAL'
        }
    });

    if (existingConnection) {
        console.log(`✅ Connection already exists (ID: ${existingConnection.id}). Updating status to CONNECTED...`);
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: {
                status: 'CONNECTED',
                lastConnectedAt: new Date(),
            }
        });
        console.log('✅ Status updated.');
        return;
    }

    // Find an Admin user to assign ownership
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    const userId = adminUser ? adminUser.id : 1; // Fallback to ID 1 if no admin found (dangerous but likely to exist)

    console.log(`👤 creating connection for User ID: ${userId}`);

    // Create new connection
    const newConnection = await prisma.whatsAppConnection.create({
        data: {
            type: 'OFFICIAL',
            status: 'CONNECTED',
            createdByUserId: userId,
            displayName: 'WhatsApp Oficial',
            phoneNumberId: phoneNumberId,
            isShared: true,
            lastConnectedAt: new Date(),
        }
    });

    console.log(`🎉 Official Connection created successfully! ID: ${newConnection.id}`);

    // Grant access to the creator
    await prisma.numberAccess.create({
        data: {
            userId: userId,
            connectionId: newConnection.id,
            canRead: true,
            canWrite: true,
            canManage: true,
        }
    });

    console.log('✅ Access granted to creator.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
