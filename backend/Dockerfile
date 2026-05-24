FROM golang:1.26-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/whoiso-backend .

FROM alpine:3.22
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/whoiso-backend /app/whoiso-backend

EXPOSE 8090
CMD ["/app/whoiso-backend", "serve", "--http=0.0.0.0:8090"]
