/**
 * Script para ativar a IA globalmente e em todos os chats
 * Execute: npx tsx src/scripts/enable-ai.ts
 */

import { prisma } from '../lib/prisma';

async function enableAI() {
    console.log('🔧 Ativando IA no sistema...\n');

    try {
        // 1. Verificar/criar configuração da IA
        let aiConfig = await prisma.aIConfig.findFirst();

        if (!aiConfig) {
            console.log('📝 Criando configuração padrão da IA...');
            aiConfig = await prisma.aIConfig.create({
                data: {
                    isActive: true,
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    temperature: 0.7,
                    maxTokens: 1000,
                    systemPrompt: `Você é um assistente virtual profissional e educado.
Seja breve, claro e use emojis ocasionalmente.

HANDOFF PARA HUMANO:
Se o cliente pedir para falar com humano, expressar frustração, ou você não souber responder, 
inclua [HANDOFF] no início da resposta e explique que vai transferir.`,
                    maxMessagesPerChat: 20,
                    responseDelay: 2,
                }
            });
            console.log('✅ Configuração criada!\n');
        } else if (!aiConfig.isActive) {
            console.log('🔄 Ativando configuração existente...');
            aiConfig = await prisma.aIConfig.update({
                where: { id: aiConfig.id },
                data: { isActive: true }
            });
            console.log('✅ IA ativada globalmente!\n');
        } else {
            console.log('✅ IA já está ativa globalmente!\n');
        }

        // 2. Ativar IA em todos os chats que não estão em modo humano
        console.log('🔄 Ativando IA em todos os chats elegíveis...');
        const result = await prisma.chat.updateMany({
            where: {
                isHumanTakeover: false,
                isClosed: false,
            },
            data: {
                isAIActive: true
            }
        });

        console.log(`✅ IA ativada em ${result.count} chat(s)!\n`);

        // 3. Mostrar resumo
        console.log('📊 Status atual:');
        const totalChats = await prisma.chat.count();
        const aiChats = await prisma.chat.count({
            where: { isAIActive: true, isClosed: false }
        });
        const humanChats = await prisma.chat.count({
            where: { isHumanTakeover: true, isClosed: false }
        });

        console.log(`   - Total de chats: ${totalChats}`);
        console.log(`   - Chats com IA: ${aiChats}`);
        console.log(`   - Chats com humano: ${humanChats}\n`);

        console.log('✅ Processo concluído!');
        console.log('💡 A IA agora deve responder novas mensagens em ~10 segundos.\n');

    } catch (error) {
        console.error('❌ Erro ao ativar IA:', error);
    } finally {
        await prisma.$disconnect();
    }
}

enableAI();
