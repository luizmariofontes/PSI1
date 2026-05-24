# WhoISO Backend

PocketBase backend estendido em Go.

## Requisitos

- Go 1.25+

## Rodar localmente

```bash
go mod tidy
go run . serve --http=127.0.0.1:8090
```

O painel administrativo do PocketBase fica em:

```text
http://127.0.0.1:8090/_/
```

## Endpoints iniciais

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

Ambos retornam:

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
