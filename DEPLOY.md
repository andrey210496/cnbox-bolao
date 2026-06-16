# Deploy — Bolão CNBOX v2 (EasyPanel)

Plataforma Next.js + PostgreSQL. Destino: VPS EasyPanel `143.95.209.76`,
subdomínio `bolaocnbox.salesflowoficial.com`. **Isolado do Viver Hub.**

## 1. DNS (Hostinger)
Zona DNS de `salesflowoficial.com` → adicionar registro:
- Tipo `A` · Nome `bolaocnbox` · Aponta para `143.95.209.76`

## 2. PostgreSQL (EasyPanel)
No projeto do EasyPanel, **Create → Postgres**:
- Nome do serviço: `cnbox-db` (ou similar)
- Anote a **connection string** interna (algo como
  `postgresql://postgres:SENHA@cnbox-db:5432/cnbox`).
- Defina um **limite de memória** (ex: 512MB) pra proteger o Viver Hub.

## 3. App (EasyPanel)
**Create → App** apontando para o repositório Git (suba o projeto pro GitHub
primeiro). EasyPanel detecta Next.js (Nixpacks) e builda sozinho.

- **Build command:** `npm run build` (já roda `prisma generate`)
- **Start command:** `npm run start`
- **Porta:** 3000
- **Limite de memória:** ex. 768MB–1GB (protege o Viver Hub)
- **Domínio:** adicione `bolaocnbox.salesflowoficial.com` → SSL automático

### Variáveis de ambiente (Environment)
Cole as do `.env.example`, com os valores reais:
- `DATABASE_URL` = a connection string do passo 2
- `ASAAS_API_KEY` = `\$aact_prod_...` (mantenha a `\` antes do `$`)
- `ASAAS_ENV` = `production`
- `ASAAS_WEBHOOK_TOKEN`, `CRON_SECRET`, `SESSION_SECRET` = segredos fortes
- `ADMIN_USER`, `ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL` = `https://bolaocnbox.salesflowoficial.com`

## 4. Criar as tabelas
Após o primeiro deploy, rode uma vez (no terminal do app no EasyPanel, ou local
apontando o `DATABASE_URL` pro Postgres):
```
npx prisma db push
npm run db:seed   # configurações + unidades de exemplo (opcional)
```

## 5. Webhook do Asaas
Asaas → Configurações → Webhooks → Adicionar:
- URL: `https://bolaocnbox.salesflowoficial.com/api/webhook/asaas`
- Token: igual ao `ASAAS_WEBHOOK_TOKEN`
- Eventos: Cobranças (PAYMENT_*) e Transferências (TRANSFER_*)

## 6. Cron de reconciliação (backup)
Agende (EasyPanel → cron, ou cron-job.org) a cada 1–2 min:
```
GET https://bolaocnbox.salesflowoficial.com/api/cron/reconcile?key=SEU_CRON_SECRET
```

## 7. Saldo para os prêmios
Os prêmios são pagos por **Transferência PIX do Asaas**, debitando o **saldo da
conta Asaas** (alimentado pelas entradas recebidas). Garanta saldo suficiente
antes de disparar os pagamentos na tela de Apuração.

## Checklist de segurança
- [ ] `SESSION_SECRET`, `ADMIN_PASSWORD`, `ASAAS_WEBHOOK_TOKEN`, `CRON_SECRET` fortes e únicos
- [ ] HTTPS ativo (EasyPanel)
- [ ] Limites de memória nos containers (app + db)
- [ ] Backup automático do Postgres (EasyPanel → Backups)
- [ ] Testar 1 palpite real (sandbox antes, se possível) e 1 repasse
