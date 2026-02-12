# 🔧 Quick Fix - Como Ativar a IA

## TL;DR - Solução Rápida

```bash
# Na Digital Ocean (via SSH):
npx tsx src/scripts/enable-ai.ts
```

Isso vai:
- ✅ Ativar a IA globalmente
- ✅ Ativar a IA em todos os chats
- ✅ Mostrar o status atualizado

---

## Diagnóstico Completo

Se quiser entender o que está errado antes de corrigir:

```bash
npx tsx src/scripts/check-ai-status.ts
```

Este script vai mostrar:
- Status da configuração da IA
- Variáveis de ambiente (OPENAI_API_KEY)
- Conexões WhatsApp ativas
- Chats com/sem IA
- Últimas mensagens da IA

---

## Problemas Comuns

### 1. "A IA ESTÁ DESATIVADA" 

**Solução:**
```bash
npx tsx src/scripts/enable-ai.ts
```

### 2. "Nenhuma conexão WhatsApp está CONECTADA"

**Solução:**
1. Acesse o painel admin
2. Vá em "Inbox Pirata"
3. Conecte um número via QR Code

### 3. "OPENAI_API_KEY não está configurada"

**Solução na Digital Ocean:**
```bash
# Editar arquivo .env
nano .env

# Adicionar/atualizar:
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# Reiniciar o servidor
pm2 restart seu-app
```

### 4. "A IA NUNCA respondeu nenhuma mensagem"

**Possíveis causas:**
- Nenhuma mensagem chegou ainda
- Debounce de 10s não completou
- Todas as mensagens são de grupos (IA ignora grupos)
- Todos os chats estão em modo humano

**Solução:**
1. Envie uma mensagem de teste
2. Aguarde 10 segundos
3. Verifique os logs:
```bash
pm2 logs seu-app --lines 50
```

---

## Como Funciona a IA

### Momento da Resposta
1. Cliente envia mensagem → Sistema aguarda 10 segundos
2. Se cliente enviar mais mensagens → Timer reseta (aguarda mais 10s)
3. Após 10s sem novas mensagens → IA processa TODAS as mensagens juntas
4. IA gera resposta contextual
5. Sistema envia resposta

### Condições para IA Responder

A IA SÓ responde se:
- ✅ Mensagem NÃO é do próprio sistema
- ✅ Chat NÃO é grupo
- ✅ Chat tem `isAIActive = true`
- ✅ Chat NÃO tem `isHumanTakeover = true`
- ✅ Chat NÃO está fechado
- ✅ Configuração global está ativa

### Quando a IA Para de Responder

A IA se desativa automaticamente quando:
- Cliente pede para falar com humano
- IA detecta frustração
- IA não sabe responder
- Atendente humano assume o chat

---

## Logs para Monitorar

```bash
# Ver logs em tempo real
pm2 logs seu-app

# Buscar logs da IA
pm2 logs seu-app | grep "🤖"
```

Logs que indicam IA funcionando:
```
🤖 Connection #1: Debounce set for 5511999999999@s.whatsapp.net
🤖 Connection #1: Processing AI response for João
🤖 Connection #1: AI response sent to João
```

---

## Depois de Corrigir

1. Commit e push das mudanças:
```bash
git add .
git commit -m "fix: ativar IA no sistema"
git push origin main
```

2. Aguarde auto-deploy na Digital Ocean

3. Execute os scripts via SSH:
```bash
ssh servidor
cd projeto
npx tsx src/scripts/enable-ai.ts
```

4. Teste enviando uma mensagem

5. Aguarde 10 segundos

6. Verifique se a IA respondeu ✅
