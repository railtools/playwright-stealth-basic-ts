# ProfileVault Browser Server

Servidor de sessões de browser com **Playwright + puppeteer-stealth + noVNC** para o ProfileVault.
O usuário interage com o browser em tempo real via iframe (noVNC).

---

## Deploy no Railway (mais rápido)

### Opção 1 — Via GitHub (recomendado)

1. Copie a pasta `railway-server/` para um repositório GitHub novo
2. No [railway.app](https://railway.app), clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório
4. Railway detecta o `Dockerfile` e faz o build automaticamente

### Opção 2 — Via CLI

```bash
npm install -g @railway/cli
railway login
cd railway-server
railway init
railway up
```

---

## Variáveis de ambiente obrigatórias no Railway

| Variável | Valor |
|---|---|
| `SERVICE_SECRET` | Mesmo valor do secret `RAILWAY_SERVICE_SECRET` no ProfileVault |
| `PORT` | Preenchido automaticamente pelo Railway |

---

## Após o deploy

1. Copie a URL do serviço Railway (ex: `https://profilevault-xxx.up.railway.app`)
2. No ProfileVault, configure o secret `RAILWAY_SERVER_URL` com essa URL

---

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/session/start` | Inicia sessão de browser |
| POST | `/session/stop` | Encerra sessão |
| GET | `/session/:id` | Status da sessão |
| GET | `/health` | Health check |

---

## Como funciona

- Cada perfil abre um **Chromium com stealth** em um display virtual (Xvfb)
- O x11vnc captura o display e o websockify expõe via WebSocket
- O noVNC transmite a tela via iframe no ProfileVault
- Proxy, cookies, user-agent e fingerprint são aplicados no launch
