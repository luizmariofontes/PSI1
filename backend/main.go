package main

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	_ "whoiso/backend/migrations"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/osutils"
	"github.com/pocketbase/pocketbase/tools/types"
)

type signupRequest struct {
	CompanyName string `json:"companyName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type accountRequest struct {
	CompanyName     string `json:"companyName"`
	Email           string `json:"email"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type verifyOTPRequest struct {
	ChallengeID string `json:"challengeId"`
	Code        string `json:"code"`
}

type auditRequest struct {
	Module    string        `json:"module"`
	AuditDate string        `json:"auditDate"`
	Responses types.JSONRaw `json:"responses"`
}

type authUserResponse struct {
	ID          string `json:"id"`
	CompanyName string `json:"companyName"`
	Email       string `json:"email"`
	CreatedAt   string `json:"createdAt"`
}

type authResponse struct {
	Token string           `json:"token"`
	User  authUserResponse `json:"user"`
}

type authChallengeResponse struct {
	ChallengeID string `json:"challengeId"`
	Email       string `json:"email"`
	Purpose     string `json:"purpose"`
	Message     string `json:"message"`
}

type auditResponse struct {
	ID          string        `json:"id"`
	AuditNumber int           `json:"auditNumber"`
	CompanyName string        `json:"companyName"`
	AuditDate   string        `json:"auditDate"`
	Module      string        `json:"module"`
	Responses   types.JSONRaw `json:"responses"`
	CreatedAt   string        `json:"createdAt"`
}

type auditLogResponse struct {
	ID               string        `json:"id"`
	AuditID          string        `json:"auditId"`
	Action           string        `json:"action"`
	ActorEmail       string        `json:"actorEmail"`
	ActorCompanyName string        `json:"actorCompanyName"`
	AuditNumber      int           `json:"auditNumber"`
	OccurredAt       string        `json:"occurredAt"`
	PreviousHash     string        `json:"previousHash"`
	Hash             string        `json:"hash"`
	Payload          types.JSONRaw `json:"payload"`
	CreatedAt        string        `json:"createdAt"`
}

func main() {
	loadEnvFile()

	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: osutils.IsProbablyGoRun(),
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.BindFunc(cors)

		group := se.Router.Group("/api/whoiso")
		group.POST("/auth/signup", handleSignup)
		group.POST("/auth/login", handleLogin)
		group.POST("/auth/verify", handleVerifyOTP)
		group.GET("/me", handleMe).Bind(apis.RequireAuth("users"))
		group.PATCH("/account", handleUpdateAccount).Bind(apis.RequireAuth("users"))
		group.GET("/audits", handleListAudits).Bind(apis.RequireAuth("users"))
		group.POST("/audits", handleCreateAudit).Bind(apis.RequireAuth("users"))
		group.PUT("/audits/{id}", handleUpdateAudit).Bind(apis.RequireAuth("users"))
		group.GET("/audits/{id}/logs", handleAuditLogs).Bind(apis.RequireAuth("users"))

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func cors(e *core.RequestEvent) error {
	origin := e.Request.Header.Get("Origin")
	if isAllowedDevOrigin(origin) {
		e.Response.Header().Set("Access-Control-Allow-Origin", origin)
		e.Response.Header().Set("Vary", "Origin")
	}
	e.Response.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	e.Response.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

	if e.Request.Method == http.MethodOptions {
		return e.NoContent(http.StatusNoContent)
	}

	return e.Next()
}

func isAllowedDevOrigin(origin string) bool {
	return strings.HasPrefix(origin, "http://localhost:") ||
		strings.HasPrefix(origin, "http://127.0.0.1:")
}

func handleSignup(e *core.RequestEvent) error {
	data := signupRequest{}
	if err := e.BindBody(&data); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}

	data.CompanyName = strings.TrimSpace(data.CompanyName)
	data.Email = strings.ToLower(strings.TrimSpace(data.Email))

	if data.CompanyName == "" || data.Email == "" || data.Password == "" {
		return e.BadRequestError("Informe nome da empresa, email e senha.", nil)
	}

	if len(data.Password) < 6 {
		return e.BadRequestError("A senha deve ter pelo menos 6 caracteres.", nil)
	}

	if existing, _ := e.App.FindAuthRecordByEmail("users", data.Email); existing != nil {
		return e.BadRequestError("Este email ja esta cadastrado.", nil)
	}

	collection, err := e.App.FindCollectionByNameOrId("users")
	if err != nil {
		return e.InternalServerError("Colecao de usuarios nao encontrada.", err)
	}

	record := core.NewRecord(collection)
	record.SetEmail(data.Email)
	record.SetPassword(data.Password)
	record.SetVerified(false)
	record.Set("companyName", data.CompanyName)

	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("Nao foi possivel criar o usuario.", err)
	}

	challenge, err := issueOTP(e, record, "signup")
	if err != nil {
		_ = e.App.Delete(record)
		return e.InternalServerError("Nao foi possivel enviar o codigo de verificacao.", err)
	}

	return e.JSON(http.StatusAccepted, challenge)
}

func handleLogin(e *core.RequestEvent) error {
	data := loginRequest{}
	if err := e.BindBody(&data); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}

	data.Email = strings.ToLower(strings.TrimSpace(data.Email))

	if data.Email == "" || data.Password == "" {
		return e.BadRequestError("Informe email e senha.", nil)
	}

	record, err := e.App.FindAuthRecordByEmail("users", data.Email)
	if err != nil || record == nil || !record.ValidatePassword(data.Password) {
		return e.UnauthorizedError("Credenciais invalidas.", err)
	}

	purpose := "login"
	if !record.Verified() {
		purpose = "signup"
	}

	challenge, err := issueOTP(e, record, purpose)
	if err != nil {
		return e.InternalServerError("Nao foi possivel enviar o codigo de verificacao.", err)
	}

	return e.JSON(http.StatusAccepted, challenge)
}

func handleVerifyOTP(e *core.RequestEvent) error {
	var req verifyOTPRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}

	code := strings.TrimSpace(req.Code)
	if len(code) != 6 || req.ChallengeID == "" {
		return e.BadRequestError("Codigo invalido.", nil)
	}

	otp, err := e.App.FindRecordById("auth_otps", req.ChallengeID)
	if err != nil {
		return e.BadRequestError("Codigo invalido ou expirado.", err)
	}

	if otp.GetString("usedAt") != "" || otp.GetInt("attempts") >= 5 {
		return e.BadRequestError("Codigo invalido ou expirado.", nil)
	}

	expiresAt, err := time.Parse(time.RFC3339, otp.GetString("expiresAt"))
	if err != nil || time.Now().UTC().After(expiresAt) {
		return e.BadRequestError("Codigo expirado.", err)
	}

	if hashOTP(code, otp.Id, otp.GetString("email"), otp.GetString("purpose")) != otp.GetString("codeHash") {
		otp.Set("attempts", otp.GetInt("attempts")+1)
		_ = e.App.Save(otp)
		return e.BadRequestError("Codigo invalido.", nil)
	}

	user, err := e.App.FindRecordById("users", otp.GetString("user"))
	if err != nil {
		return e.BadRequestError("Usuario nao encontrado.", err)
	}

	otp.Set("usedAt", time.Now().UTC().Format(time.RFC3339))
	if err := e.App.Save(otp); err != nil {
		return e.InternalServerError("Nao foi possivel validar o codigo.", err)
	}

	if otp.GetString("purpose") == "signup" && !user.Verified() {
		user.SetVerified(true)
		if err := e.App.Save(user); err != nil {
			return e.InternalServerError("Nao foi possivel verificar o email.", err)
		}
	}

	token, err := user.NewAuthToken()
	if err != nil {
		return e.InternalServerError("Nao foi possivel autenticar o usuario.", err)
	}

	return e.JSON(http.StatusOK, authResponse{Token: token, User: newAuthUserResponse(user)})
}

func handleMe(e *core.RequestEvent) error {
	return e.JSON(http.StatusOK, newAuthUserResponse(e.Auth))
}

func issueOTP(e *core.RequestEvent, user *core.Record, purpose string) (authChallengeResponse, error) {
	code, err := generateOTPCode()
	if err != nil {
		return authChallengeResponse{}, err
	}

	if err := invalidateOpenOTPs(e, user.Id, purpose); err != nil {
		return authChallengeResponse{}, err
	}

	collection, err := e.App.FindCollectionByNameOrId("auth_otps")
	if err != nil {
		return authChallengeResponse{}, err
	}

	expiresAt := time.Now().UTC().Add(10 * time.Minute).Format(time.RFC3339)
	otp := core.NewRecord(collection)
	otp.Set("user", user.Id)
	otp.Set("email", user.Email())
	otp.Set("purpose", purpose)
	otp.Set("expiresAt", expiresAt)
	otp.Set("attempts", 0)

	if err := e.App.Save(otp); err != nil {
		return authChallengeResponse{}, err
	}

	otp.Set("codeHash", hashOTP(code, otp.Id, user.Email(), purpose))
	if err := e.App.Save(otp); err != nil {
		return authChallengeResponse{}, err
	}

	if err := sendOTPEmail(user.Email(), user.GetString("companyName"), purpose, code); err != nil {
		otp.Set("usedAt", time.Now().UTC().Format(time.RFC3339))
		_ = e.App.Save(otp)
		return authChallengeResponse{}, err
	}

	return authChallengeResponse{
		ChallengeID: otp.Id,
		Email:       user.Email(),
		Purpose:     purpose,
		Message:     "Enviamos um codigo de 6 digitos para o email informado.",
	}, nil
}

func invalidateOpenOTPs(e *core.RequestEvent, userID string, purpose string) error {
	records, err := e.App.FindRecordsByFilter(
		"auth_otps",
		"user = {:user} && purpose = {:purpose} && usedAt = ''",
		"",
		0,
		0,
		dbx.Params{"user": userID, "purpose": purpose},
	)
	if err != nil {
		return err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	for _, record := range records {
		record.Set("usedAt", now)
		if err := e.App.Save(record); err != nil {
			return err
		}
	}

	return nil
}

func generateOTPCode() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func hashOTP(code string, challengeID string, email string, purpose string) string {
	pepper := os.Getenv("OTP_HASH_SECRET")
	if pepper == "" {
		pepper = os.Getenv("RESEND_API_KEY")
	}
	sum := sha256.Sum256([]byte(code + "." + challengeID + "." + strings.ToLower(email) + "." + purpose + "." + pepper))
	return hex.EncodeToString(sum[:])
}

func sendOTPEmail(to string, companyName string, purpose string, code string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY nao configurada")
	}

	subject := "Seu codigo WhoISO"
	if purpose == "signup" {
		subject = "Confirme seu email no WhoISO"
	}

	body := map[string]any{
		"from":    "WhoISO <notreply@whoiso.lsx.li>",
		"to":      []string{to},
		"subject": subject,
		"html":    otpEmailHTML(companyName, purpose, code),
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		data, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("resend status %d: %s", resp.StatusCode, strings.TrimSpace(string(data)))
	}

	return nil
}

func otpEmailHTML(companyName string, purpose string, code string) string {
	title := "Codigo de acesso"
	description := "Use o codigo abaixo para acessar sua conta WhoISO."
	if purpose == "signup" {
		title = "Confirme seu email"
		description = "Use o codigo abaixo para concluir seu cadastro no WhoISO."
	}

	return fmt.Sprintf(`<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:32px;">
            <tr>
              <td>
				<div style="margin-bottom:28px;">
				  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 100" width="210" height="60" aria-label="WhoISO" role="img" style="display:block;">
				    <defs>
				      <linearGradient id="emailShield" x1="0%%" y1="0%%" x2="100%%" y2="100%%">
				        <stop offset="0%%" stop-color="#0f172a" stop-opacity="1"></stop>
				        <stop offset="100%%" stop-color="#334155" stop-opacity="1"></stop>
				      </linearGradient>
				      <linearGradient id="emailAccent" x1="0%%" y1="0%%" x2="100%%" y2="100%%">
				        <stop offset="0%%" stop-color="#3b82f6" stop-opacity="1"></stop>
				        <stop offset="100%%" stop-color="#06b6d4" stop-opacity="1"></stop>
				      </linearGradient>
				    </defs>
				    <path d="M45 15 L75 25 V55 C75 75 45 90 45 90 C45 90 15 75 15 55 V25 Z" fill="url(#emailShield)"></path>
				    <line x1="61" y1="56" x2="70" y2="65" stroke="url(#emailAccent)" stroke-width="5" stroke-linecap="round"></line>
				    <circle cx="50" cy="45" r="14" fill="none" stroke="url(#emailAccent)" stroke-width="4"></circle>
				    <text x="100" y="65" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="44" fill="#0f172a" letter-spacing="-1">Who<tspan fill="#38bdf8">ISO</tspan></text>
				    <text x="104" y="85" font-family="Arial,Helvetica,sans-serif" font-weight="500" font-size="12" fill="#64748b" letter-spacing="2">AUDITORIA LTDA</text>
				  </svg>
				</div>
                <h1 style="font-size:26px;line-height:1.2;margin:0 0 10px;color:#0f172a;">%s</h1>
                <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#475569;">%s</p>
                <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:16px;padding:24px;text-align:center;">
                  <div style="font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#2563eb;margin-bottom:10px;">Codigo de 6 digitos</div>
                  <div style="font-size:42px;letter-spacing:10px;font-weight:800;color:#0f172a;">%s</div>
                </div>
                <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#64748b;">Este codigo expira em 10 minutos. Se voce nao solicitou este acesso, ignore este email.</p>
                <p style="font-size:12px;line-height:1.6;margin:20px 0 0;color:#94a3b8;">Empresa: %s</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`, html.EscapeString(title), html.EscapeString(description), html.EscapeString(code), html.EscapeString(companyName))
}

func loadEnvFile() {
	for _, filename := range []string{".env", "backend/.env"} {
		content, err := os.ReadFile(filename)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(content), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			key, value, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			key = strings.TrimSpace(key)
			value = strings.Trim(strings.TrimSpace(value), `"'`)
			if key != "" && os.Getenv(key) == "" {
				_ = os.Setenv(key, value)
			}
		}
		return
	}
}

func handleUpdateAccount(e *core.RequestEvent) error {
	var req accountRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}

	companyName := strings.TrimSpace(req.CompanyName)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	newPassword := strings.TrimSpace(req.NewPassword)

	if companyName == "" || email == "" {
		return e.BadRequestError("Informe nome da empresa e email.", nil)
	}

	e.Auth.Set("companyName", companyName)
	e.Auth.SetEmail(email)

	if newPassword != "" {
		if len(newPassword) < 6 {
			return e.BadRequestError("A nova senha deve ter pelo menos 6 caracteres.", nil)
		}
		if !e.Auth.ValidatePassword(req.CurrentPassword) {
			return e.BadRequestError("Senha atual incorreta.", nil)
		}
		e.Auth.SetPassword(newPassword)
	}

	if err := e.App.Save(e.Auth); err != nil {
		return e.BadRequestError("Nao foi possivel atualizar a conta.", err)
	}

	return e.JSON(http.StatusOK, newAuthUserResponse(e.Auth))
}

func handleListAudits(e *core.RequestEvent) error {
	records, err := e.App.FindRecordsByFilter(
		"audits",
		"user = {:user}",
		"-created",
		0,
		0,
		dbx.Params{"user": e.Auth.Id},
	)
	if err != nil {
		return err
	}

	result := make([]auditResponse, 0, len(records))
	for _, record := range records {
		result = append(result, newAuditResponse(record))
	}

	return e.JSON(http.StatusOK, result)
}

func handleCreateAudit(e *core.RequestEvent) error {
	var req auditRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}
	if err := validateAuditRequest(req); err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	collection, err := e.App.FindCollectionByNameOrId("audits")
	if err != nil {
		return err
	}

	audit := core.NewRecord(collection)
	auditNumber, err := nextAuditNumber(e)
	if err != nil {
		return err
	}

	audit.Set("user", e.Auth.Id)
	audit.Set("auditNumber", auditNumber)
	audit.Set("companyName", e.Auth.GetString("companyName"))
	audit.Set("module", req.Module)
	audit.Set("auditDate", req.AuditDate)
	audit.Set("responses", req.Responses)

	if err := e.App.Save(audit); err != nil {
		return e.BadRequestError("Nao foi possivel salvar a auditoria.", err)
	}
	if err := createAuditLog(e, audit, "created"); err != nil {
		return err
	}

	return e.JSON(http.StatusCreated, newAuditResponse(audit))
}

func handleUpdateAudit(e *core.RequestEvent) error {
	var req auditRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}
	if err := validateAuditRequest(req); err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	audit, err := e.App.FindRecordById("audits", e.Request.PathValue("id"))
	if err != nil || audit.GetString("user") != e.Auth.Id {
		return e.NotFoundError("Auditoria nao encontrada.", err)
	}

	audit.Set("companyName", e.Auth.GetString("companyName"))
	audit.Set("module", req.Module)
	audit.Set("auditDate", req.AuditDate)
	audit.Set("responses", req.Responses)

	if err := e.App.Save(audit); err != nil {
		return e.BadRequestError("Nao foi possivel atualizar a auditoria.", err)
	}
	if err := createAuditLog(e, audit, "updated"); err != nil {
		return err
	}

	return e.JSON(http.StatusOK, newAuditResponse(audit))
}

func handleAuditLogs(e *core.RequestEvent) error {
	audit, err := e.App.FindRecordById("audits", e.Request.PathValue("id"))
	if err != nil || audit.GetString("user") != e.Auth.Id {
		return e.NotFoundError("Auditoria nao encontrada.", err)
	}

	records, err := e.App.FindRecordsByFilter(
		"audit_logs",
		"audit = {:audit} && user = {:user}",
		"created",
		0,
		0,
		dbx.Params{"audit": audit.Id, "user": e.Auth.Id},
	)
	if err != nil {
		return err
	}

	result := make([]auditLogResponse, 0, len(records))
	for _, record := range records {
		result = append(result, newAuditLogResponse(record))
	}

	return e.JSON(http.StatusOK, result)
}

func validateAuditRequest(req auditRequest) error {
	if req.Module != "iso27001" && req.Module != "iso27701" {
		return errMessage("Modulo invalido.")
	}
	if strings.TrimSpace(req.AuditDate) == "" {
		return errMessage("Data da auditoria obrigatoria.")
	}
	if len(req.Responses) == 0 {
		return errMessage("Respostas obrigatorias.")
	}
	return nil
}

func nextAuditNumber(e *core.RequestEvent) (int, error) {
	records, err := e.App.FindRecordsByFilter(
		"audits",
		"user = {:user}",
		"-auditNumber",
		1,
		0,
		dbx.Params{"user": e.Auth.Id},
	)
	if err != nil {
		return 0, err
	}
	if len(records) == 0 {
		return 1, nil
	}
	return records[0].GetInt("auditNumber") + 1, nil
}

func createAuditLog(e *core.RequestEvent, audit *core.Record, action string) error {
	collection, err := e.App.FindCollectionByNameOrId("audit_logs")
	if err != nil {
		return err
	}

	previousHash := ""
	previous, err := e.App.FindRecordsByFilter(
		"audit_logs",
		"audit = {:audit} && user = {:user}",
		"-created",
		1,
		0,
		dbx.Params{"audit": audit.Id, "user": e.Auth.Id},
	)
	if err != nil {
		return err
	}
	if len(previous) > 0 {
		previousHash = previous[0].GetString("hash")
	}

	occurredAt := time.Now().UTC().Format(time.RFC3339Nano)
	payload := auditHashPayload{
		AuditID:      audit.Id,
		UserID:       e.Auth.Id,
		Action:       action,
		AuditNumber:  audit.GetInt("auditNumber"),
		CompanyName:  audit.GetString("companyName"),
		Module:       audit.GetString("module"),
		AuditDate:    audit.GetString("auditDate"),
		Responses:    audit.Get("responses"),
		PreviousHash: previousHash,
		OccurredAt:   occurredAt,
	}
	hash, rawPayload, err := hashAuditPayload(payload)
	if err != nil {
		return err
	}

	logRecord := core.NewRecord(collection)
	logRecord.Set("user", e.Auth.Id)
	logRecord.Set("audit", audit.Id)
	logRecord.Set("action", action)
	logRecord.Set("actorEmail", e.Auth.Email())
	logRecord.Set("actorCompanyName", e.Auth.GetString("companyName"))
	logRecord.Set("auditNumber", audit.GetInt("auditNumber"))
	logRecord.Set("occurredAt", occurredAt)
	logRecord.Set("previousHash", previousHash)
	logRecord.Set("hash", hash)
	logRecord.Set("payload", rawPayload)

	return e.App.Save(logRecord)
}

type auditHashPayload struct {
	AuditID      string `json:"auditId"`
	UserID       string `json:"userId"`
	Action       string `json:"action"`
	AuditNumber  int    `json:"auditNumber"`
	CompanyName  string `json:"companyName"`
	Module       string `json:"module"`
	AuditDate    string `json:"auditDate"`
	Responses    any    `json:"responses"`
	PreviousHash string `json:"previousHash"`
	OccurredAt   string `json:"occurredAt"`
}

func hashAuditPayload(payload auditHashPayload) (string, types.JSONRaw, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), types.JSONRaw(raw), nil
}

func newAuthUserResponse(record *core.Record) authUserResponse {
	return authUserResponse{
		ID:          record.Id,
		CompanyName: record.GetString("companyName"),
		Email:       record.Email(),
		CreatedAt:   record.GetDateTime("created").String(),
	}
}

func newAuditResponse(record *core.Record) auditResponse {
	return auditResponse{
		ID:          record.Id,
		AuditNumber: record.GetInt("auditNumber"),
		CompanyName: record.GetString("companyName"),
		AuditDate:   record.GetString("auditDate"),
		Module:      record.GetString("module"),
		Responses:   jsonRaw(record.Get("responses")),
		CreatedAt:   record.GetDateTime("created").String(),
	}
}

func newAuditLogResponse(record *core.Record) auditLogResponse {
	return auditLogResponse{
		ID:               record.Id,
		AuditID:          record.GetString("audit"),
		Action:           record.GetString("action"),
		ActorEmail:       record.GetString("actorEmail"),
		ActorCompanyName: record.GetString("actorCompanyName"),
		AuditNumber:      record.GetInt("auditNumber"),
		OccurredAt:       record.GetString("occurredAt"),
		PreviousHash:     record.GetString("previousHash"),
		Hash:             record.GetString("hash"),
		Payload:          jsonRaw(record.Get("payload")),
		CreatedAt:        record.GetDateTime("created").String(),
	}
}

func jsonRaw(value any) types.JSONRaw {
	raw, err := types.ParseJSONRaw(value)
	if err != nil {
		return types.JSONRaw([]byte("null"))
	}
	return raw
}

type errMessage string

func (e errMessage) Error() string {
	return string(e)
}
