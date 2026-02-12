/**
 * Script de diagnóstico para verificar o status da IA
 * Execute: npx tsx src/scripts/check-ai-status.ts
 */

import { prisma } from '../lib/prisma';

async function checkAIStatus() {
    console.log('🔍 Verificando configuração da IA...\n');

    try {
        // 1. Verificar configuração geral da IA
        const aiConfig = await prisma.aIConfig.findFirst();

        if (!aiConfig) {
            console.log('❌ PROBLEMA: Nenhuma configuração de IA encontrada no banco!');
            console.log('   Solução: Criar configuração inicial da IA\n');
            return;
        }

        console.log('✅ Configuração da IA encontrada:');
        console.log(`   - Ativa: ${aiConfig.isActive ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   - Modelo: ${aiConfig.model}`);
        console.log(`   - Temperature: ${aiConfig.temperature}`);
        console.log(`   - Max Tokens: ${aiConfig.maxTokens}`);
        console.log(`   - Max Messages Per Chat: ${aiConfig.maxMessagesPerChat}`);
        console.log(`   - Response Delay: ${aiConfig.responseDelay}s\n`);

        if (!aiConfig.isActive) {
            console.log('⚠️  A IA ESTÁ DESATIVADA globalmente!\n');
        }

        // 2. Verificar variáveis de ambiente
        console.log('🔑 Verificando variáveis de ambiente:');
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
        console.log(`   - OPENAI_API_KEY: ${hasOpenAIKey ? '✅ Configurada' : '❌ NÃO configurada'}`);
        if (hasOpenAIKey) {
            const keyPreview = process.env.OPENAI_API_KEY!.substring(0, 10) + '...';
            console.log(`     Preview: ${keyPreview}`);
        }
        console.log(`   - OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'não configurado (usando padrão)'}\n`);

        // 3. Verificar conexões WhatsApp ativas
        console.log('📱 Verificando conexões WhatsApp:');
        const connections = await prisma.whatsAppConnection.findMany({
            where: { type: 'PIRATE' },
            select: {
                id: true,
                displayName: true,
                phoneNumber: true,
                status: true,
                lastConnectedAt: true,
            }
        });

        if (connections.length === 0) {
            console.log('   ⚠️  Nenhuma conexão encontrada\n');
        } else {
            connections.forEach(conn => {
                const statusIcon = conn.status === 'CONNECTED' ? '✅' :
                    conn.status === 'CONNECTING' ? '🔄' : '❌';
                console.log(`   ${statusIcon} #${conn.id} - ${conn.displayName || 'Sem nome'}`);
                console.log(`      Phone: ${conn.phoneNumber || 'não conectado'}`);
                console.log(`      Status: ${conn.status}`);
                console.log(`      Última conexão: ${conn.lastConnectedAt ? new Date(conn.lastConnectedAt).toLocaleString('pt-BR') : 'nunca'}`);
            });
            console.log();
        }

        // 4. Verificar chats com IA ativa
        console.log('💬 Verificando chats:');
        const totalChats = await prisma.chat.count();
        const chatsWithAI = await prisma.chat.count({
            where: { isAIActive: true, isClosed: false, isHumanTakeover: false }
        });
        const chatsWithHuman = await prisma.chat.count({
            where: { isHumanTakeover: true, isClosed: false }
        });
        const closedChats = await prisma.chat.count({
            where: { isClosed: true }
        });

        console.log(`   - Total de chats: ${totalChats}`);
        console.log(`   - Chats com IA ativa: ${chatsWithAI} ✅`);
        console.log(`   - Chats com humano: ${chatsWithHuman}`);
        console.log(`   - Chats fechados: ${closedChats}\n`);

        // 5. Verificar mensagens recentes da IA
        console.log('🤖 Últimas mensagens da IA:');
        const recentAIMessages = await prisma.message.findMany({
            where: { sentByAI: true },
            orderBy: { timestamp: 'desc' },
            take: 5,
            select: {
                timestamp: true,
                chatId: true,
                text: true,
                chat: {
                    select: {
                        contactName: true
                    }
                }
            }
        });

        if (recentAIMessages.length === 0) {
            console.log('   ⚠️  NENHUMA mensagem da IA encontrada!');
            console.log('   Isso pode indicar que a IA nunca respondeu.\n');
        } else {
            recentAIMessages.forEach((msg, i) => {
                console.log(`   ${i + 1}. ${new Date(msg.timestamp).toLocaleString('pt-BR')}`);
                console.log(`      Para: ${msg.chat.contactName}`);
                console.log(`      Mensagem: ${msg.text?.substring(0, 60)}...`);
            });
            console.log();
        }

        // 6. Resumo e diagnóstico
        console.log('📊 RESUMO DO DIAGNÓSTICO:');
        const issues = [];

        if (!aiConfig.isActive) {
            issues.push('⚠️  A IA está DESATIVADA no banco de dados');
        }

        if (!hasOpenAIKey) {
            issues.push('❌ OPENAI_API_KEY não está configurada');
        }

        const hasConnectedConnection = connections.some(c => c.status === 'CONNECTED');
        if (!hasConnectedConnection) {
            issues.push('⚠️  Nenhuma conexão WhatsApp está CONECTADA');
        }

        if (chatsWithAI === 0 && totalChats > 0) {
            issues.push('⚠️  Todos os chats estão com IA desativada');
        }

        if (recentAIMessages.length === 0 && totalChats > 0) {
            issues.push('🔴 A IA NUNCA respondeu nenhuma mensagem');
        }

        if (issues.length === 0) {
            console.log('   ✅ Configuração parece OK!');
            console.log('   Se a IA não está respondendo, verifique:');
            console.log('      1. Os logs do servidor em tempo real');
            console.log('      2. Se há mensagens novas chegando');
            console.log('      3. Se o debounce está funcionando (aguarda 10s)\n');
        } else {
            console.log('   ❌ Problemas encontrados:\n');
            issues.forEach(issue => console.log(`      ${issue}`));
            console.log();
        }

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAIStatus();
