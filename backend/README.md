# WhoISO Backend

PocketBase backend estendido em Go.

## Requisitos

- Go 1.25+

## Rodar localmente

```bash
go mod tidy
go run . serve --http=127.0.0.1:8090
```

Configure `backend/.env`:

```env
RESEND_API_KEY=...
OTP_HASH_SECRET=uma-string-longa-opcional
```

O painel administrativo do PocketBase fica em:

```text
http://127.0.0.1:8090/_/
```

## Endpoints

### Signup

```http
POST /api/whoiso/auth/signup
Content-Type: application/json

{
  "companyName": "Acme Segurança",
  "email": "voce@empresa.com",
  "password": "whoiso123"
}
```

### Login

```http
POST /api/whoiso/auth/login
Content-Type: application/json

{
  "email": "voce@empresa.com",
  "password": "whoiso123"
}
```

Signup e login retornam um desafio de MFA por email:

```json
{
  "challengeId": "...",
  "email": "voce@empresa.com",
  "purpose": "signup",
  "message": "Enviamos um codigo de 6 digitos para o email informado."
}
```

Depois valide o código:

```http
POST /api/whoiso/auth/verify
Content-Type: application/json

{
  "challengeId": "...",
  "code": "123456"
}
```

A verificação retorna:

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "companyName": "Acme Segurança",
    "email": "voce@empresa.com",
    "createdAt": "..."
  }
}
```

### Rotas autenticadas

Enviar o token no header:

```http
Authorization: Bearer <token>
```

```http
GET /api/whoiso/me
PATCH /api/whoiso/account
GET /api/whoiso/audits
POST /api/whoiso/audits
PUT /api/whoiso/audits/{id}
GET /api/whoiso/audits/{id}/logs
```

Payload de auditoria:

```json
{
  "module": "iso27001",
  "auditDate": "2026-05-24",
  "responses": [
    { "controlId": "5.1", "status": "conforme" }
  ]
}
```

Os logs em `audit_logs` são criados somente pelo backend. Cada criação/edição gera um hash SHA-256 com o estado da auditoria, usuário, data do evento e `previousHash`, formando uma cadeia de integridade.
