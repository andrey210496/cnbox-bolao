# 🟢 Bolão CNBOX — Brasil x Marrocos

Sistema completo e profissional de bolão com pagamento via **PIX (Asaas)**.
O usuário dá o palpite (placar exato), faz um pré-cadastro (nome + CPF), paga
R$10 no PIX e o palpite entra no bolão após a confirmação do pagamento.

Stack: **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS v4** ·
**Prisma + SQLite** · **Asaas** (PIX).

---

## 🚀 Como rodar localmente

```bash
npm install
npm run db:push      # cria o banco SQLite (dev.db) e gera o Prisma Client
npm run dev          # http://localhost:3000
```

> O `.env` já vem com valores padrão. Só falta colar a **API Key do Asaas**.

---

## 🔑 Configuração do Asaas (PRODUÇÃO)

1. Acesse o painel Asaas → **Configurações → Integrações → API**.
2. Copie sua **API Key de produção** (começa com `$aact_prod_...`).
3. Cole no arquivo `.env`:

```env
ASAAS_API_KEY="$aact_prod_SUA_CHAVE_AQUI"
ASAAS_ENV="production"
```

4. **Webhook** (para confirmar pagamentos automaticamente):
   - No Asaas: **Configurações → Webhooks → Adicionar**
   - URL: `https://SEU_DOMINIO.com/api/webhook/asaas`
   - Eventos: marque os de **Cobrança** (PAYMENT_RECEIVED, PAYMENT_CONFIRMED)
   - **Token de autenticação**: use o mesmo valor de `ASAAS_WEBHOOK_TOKEN` no `.env`

> Mesmo sem webhook configurado, a tela de pagamento confirma sozinha: ela
> consulta o status no Asaas a cada 4 segundos (fallback automático).

---

## ⚙️ Variáveis de ambiente (`.env`)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão do banco (SQLite por padrão) |
| `ASAAS_API_KEY` | **Sua chave de produção do Asaas** |
| `ASAAS_ENV` | `production` ou `sandbox` |
| `ASAAS_WEBHOOK_TOKEN` | Segredo do webhook (igual ao configurado no Asaas) |
| `NEXT_PUBLIC_BET_PRICE` | Valor de cada palpite (padrão `10`) |
| `NEXT_PUBLIC_MATCH_DATE` | Data/hora do jogo (ISO, fuso -03:00) — **ajuste para o jogo real** |
| `ADMIN_PASSWORD` | Senha do painel `/admin` |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site |

---

## 🗺️ Páginas

| Rota | O que é |
|---|---|
| `/` | Home premium: logo, hero, cartão do jogo, **contador regressivo**, como funciona, últimos palpites |
| `/palpite` | Pré-cadastro: nome + CPF + seletor de placar → gera o PIX |
| `/pagamento/[id]` | QR Code + Copia e Cola, confirma o pagamento em tempo real |
| `/ranking` | Ranking público: palpites mais apostados, lista de participantes, apuração de vencedores |
| `/admin` | Painel do organizador (protegido por senha) |

### Painel Admin (`/admin`)
- Total de palpites, confirmados, pendentes e **valor arrecadado**
- Lista completa de palpites (nome, CPF, placar, status, data)
- **Lançar o placar final** → apura automaticamente os vencedores no ranking

---

## 🎨 Logo

A logo CNBOX foi recriada em vetor (`components/Logo.tsx`). Para usar o arquivo
oficial: coloque-o em `public/logo-cnbox.png` e troque o conteúdo do componente
por `<img src="/logo-cnbox.png" alt="CNBOX" />`.

---

## ☁️ Deploy (EasyPanel / VPS)

1. Suba o código para um repositório Git.
2. No EasyPanel, crie um app **Next.js** apontando para o repositório.
3. Configure as variáveis de ambiente (as mesmas do `.env`).
4. Para persistir o SQLite, monte um volume na pasta do banco **ou** troque para
   PostgreSQL (recomendado em produção — veja abaixo).

### Trocar SQLite → PostgreSQL
No `prisma/schema.prisma`, mude `provider = "postgresql"` e ajuste a
`DATABASE_URL` no `.env`. Depois rode `npm run db:push`.

---

## 🔒 Fluxo de pagamento (resumo técnico)

1. `POST /api/palpites` → valida → cria **cliente** no Asaas → cria **cobrança PIX**
   → busca **QR Code dinâmico** → salva o palpite como `PENDING`.
2. Usuário paga o PIX.
3. `POST /api/webhook/asaas` (ou polling da tela) marca o palpite como `CONFIRMED`.
4. Palpite confirmado aparece no ranking e conta na arrecadação.
