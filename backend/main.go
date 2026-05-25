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
	"github.com/pocketbase/pocketbase/tools/filesystem"
	"github.com/pocketbase/pocketbase/tools/osutils"
	"github.com/pocketbase/pocketbase/tools/types"
)

const maxEvidenceFileSize = 5 * 1024 * 1024 // 5MB

type signupRequest struct {
	Mode        string `json:"mode"` // "user" ou "company" (default: "company")
	CompanyName string `json:"companyName"`
	Name        string `json:"name"`
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
	CompanyID   string `json:"companyId"`
	Email       string `json:"email"`
	CreatedAt   string `json:"createdAt"`
}

type companyMemberResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	IsOwner   bool   `json:"isOwner"`
	CreatedAt string `json:"createdAt"`
}

type companyResponse struct {
	ID        string                  `json:"id"`
	Name      string                  `json:"name"`
	OwnerID   string                  `json:"ownerId"`
	CreatedAt string                  `json:"createdAt"`
	Members   []companyMemberResponse `json:"members"`
}

type companyUpdateRequest struct {
	Name string `json:"name"`
}

type companyInviteRequest struct {
	Email string `json:"email"`
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
		group.GET("/company", handleGetCompany).Bind(apis.RequireAuth("users"))
		group.PATCH("/company", handleRenameCompany).Bind(apis.RequireAuth("users"))
		group.POST("/company/invite", handleInviteMember).Bind(apis.RequireAuth("users"))
		group.DELETE("/company/members/{id}", handleRemoveMember).Bind(apis.RequireAuth("users"))
		group.POST("/audits/{id}/evidences", handleUploadEvidence).Bind(apis.RequireAuth("users"))
		// Sem RequireAuth: o handler aceita token via query string para suportar
		// downloads abertos diretamente em uma nova aba via <a href>.
		group.GET("/evidences/{id}", handleDownloadEvidence)
		group.DELETE("/evidences/{id}", handleDeleteEvidence).Bind(apis.RequireAuth("users"))

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

	mode := strings.ToLower(strings.TrimSpace(data.Mode))
	if mode == "" {
		mode = "company"
	}
	if mode != "user" && mode != "company" {
		return e.BadRequestError("Modo de cadastro invalido.", nil)
	}

	data.CompanyName = strings.TrimSpace(data.CompanyName)
	data.Name = strings.TrimSpace(data.Name)
	data.Email = strings.ToLower(strings.TrimSpace(data.Email))

	if data.Email == "" || data.Password == "" {
		return e.BadRequestError("Informe email e senha.", nil)
	}
	if mode == "company" && data.CompanyName == "" {
		return e.BadRequestError("Informe o nome da empresa.", nil)
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
	// `companyName` no usuario eh apenas um nome de exibicao fallback
	if mode == "company" {
		record.Set("companyName", data.CompanyName)
	} else if data.Name != "" {
		record.Set("companyName", data.Name)
	} else {
		record.Set("companyName", data.Email)
	}
	if data.Name != "" {
		record.Set("name", data.Name)
	}

	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("Nao foi possivel criar o usuario.", err)
	}

	var company *core.Record
	if mode == "company" {
		company, err = createCompanyForUser(e, record, data.CompanyName)
		if err != nil {
			_ = e.App.Delete(record)
			return e.InternalServerError("Nao foi possivel criar a empresa.", err)
		}

		record.Set("company", company.Id)
		if err := e.App.Save(record); err != nil {
			_ = e.App.Delete(company)
			_ = e.App.Delete(record)
			return e.InternalServerError("Nao foi possivel vincular a empresa ao usuario.", err)
		}
	}

	challenge, err := issueOTP(e, record, "signup")
	if err != nil {
		_ = e.App.Delete(record)
		if company != nil {
			_ = e.App.Delete(company)
		}
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

	return e.JSON(http.StatusOK, authResponse{Token: token, User: newAuthUserResponse(e.App, user)})
}

func handleMe(e *core.RequestEvent) error {
	return e.JSON(http.StatusOK, newAuthUserResponse(e.App, e.Auth))
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
		// Fallback de desenvolvimento: imprime o OTP no log para que o auditor
		// consiga testar o fluxo localmente sem configurar a Resend.
		log.Printf("[DEV-OTP] empresa=%q destinatario=%s motivo=%s codigo=%s", companyName, to, purpose, code)
		return nil
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
				  <div style="font-size:28px;line-height:1;font-weight:800;color:#0f172a;">Who<span style="color:#38bdf8;">ISO</span></div>
				  <div style="margin-top:8px;font-size:12px;letter-spacing:3px;font-weight:600;color:#64748b;">AUDITORIA LTDA</div>
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

	if email == "" {
		return e.BadRequestError("Informe um email.", nil)
	}

	// companyName so eh atualizado quando informado (usuarios sem empresa nao enviam o campo)
	if companyName != "" {
		e.Auth.Set("companyName", companyName)
	}
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

	// Mantem o "nome de exibicao" sincronizado com a empresa caso o usuario seja o owner.
	if companyID := e.Auth.GetString("company"); companyID != "" {
		if company, err := e.App.FindRecordById("companies", companyID); err == nil {
			if company.GetString("owner") == e.Auth.Id {
				company.Set("name", companyName)
				_ = e.App.Save(company)
			}
		}
	}

	return e.JSON(http.StatusOK, newAuthUserResponse(e.App, e.Auth))
}

func handleListAudits(e *core.RequestEvent) error {
	companyID := e.Auth.GetString("company")

	filter := "user = {:user}"
	params := dbx.Params{"user": e.Auth.Id}
	if companyID != "" {
		filter = "company = {:company}"
		params = dbx.Params{"company": companyID}
	}

	records, err := e.App.FindRecordsByFilter(
		"audits",
		filter,
		"-created",
		0,
		0,
		params,
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

	companyID := e.Auth.GetString("company")
	companyName := e.Auth.GetString("companyName")
	if companyID != "" {
		if companyRecord, err := e.App.FindRecordById("companies", companyID); err == nil {
			companyName = companyRecord.GetString("name")
		}
	}

	audit.Set("user", e.Auth.Id)
	audit.Set("auditNumber", auditNumber)
	audit.Set("companyName", companyName)
	audit.Set("company", companyID)
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
	if err != nil || !canAccessAudit(e, audit) {
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
	if err != nil || !canAccessAudit(e, audit) {
		return e.NotFoundError("Auditoria nao encontrada.", err)
	}

	records, err := e.App.FindRecordsByFilter(
		"audit_logs",
		"audit = {:audit}",
		"created",
		0,
		0,
		dbx.Params{"audit": audit.Id},
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
	companyID := e.Auth.GetString("company")
	filter := "user = {:user}"
	params := dbx.Params{"user": e.Auth.Id}
	if companyID != "" {
		filter = "company = {:company}"
		params = dbx.Params{"company": companyID}
	}

	records, err := e.App.FindRecordsByFilter(
		"audits",
		filter,
		"-auditNumber",
		1,
		0,
		params,
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

func newAuthUserResponse(app core.App, record *core.Record) authUserResponse {
	companyID := record.GetString("company")
	companyName := record.GetString("companyName")
	if app != nil && companyID != "" {
		if company, err := app.FindRecordById("companies", companyID); err == nil {
			companyName = company.GetString("name")
		}
	}
	return authUserResponse{
		ID:          record.Id,
		CompanyName: companyName,
		CompanyID:   companyID,
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

func createCompanyForUser(e *core.RequestEvent, user *core.Record, name string) (*core.Record, error) {
	collection, err := e.App.FindCollectionByNameOrId("companies")
	if err != nil {
		return nil, err
	}

	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		trimmed = "Empresa de " + user.Email()
	}

	company := core.NewRecord(collection)
	company.Set("name", trimmed)
	company.Set("owner", user.Id)
	company.Set("members", []string{user.Id})

	if err := e.App.Save(company); err != nil {
		return nil, err
	}
	return company, nil
}

// canAccessAudit verifica se o usuario autenticado pode ver/editar uma auditoria
// (criador, ou membro da mesma empresa).
func canAccessAudit(e *core.RequestEvent, audit *core.Record) bool {
	if audit.GetString("user") == e.Auth.Id {
		return true
	}
	companyID := audit.GetString("company")
	if companyID == "" || companyID != e.Auth.GetString("company") {
		return false
	}
	return true
}

func loadCompanyForAuth(e *core.RequestEvent) (*core.Record, error) {
	companyID := e.Auth.GetString("company")
	if companyID == "" {
		return nil, errMessage("Usuario nao esta vinculado a uma empresa.")
	}
	company, err := e.App.FindRecordById("companies", companyID)
	if err != nil {
		return nil, err
	}
	return company, nil
}

func newCompanyResponse(app core.App, company *core.Record) companyResponse {
	memberIDs := company.GetStringSlice("members")
	members := make([]companyMemberResponse, 0, len(memberIDs))
	ownerID := company.GetString("owner")

	for _, id := range memberIDs {
		member, err := app.FindRecordById("users", id)
		if err != nil {
			continue
		}
		members = append(members, companyMemberResponse{
			ID:        member.Id,
			Email:     member.Email(),
			IsOwner:   member.Id == ownerID,
			CreatedAt: member.GetDateTime("created").String(),
		})
	}

	return companyResponse{
		ID:        company.Id,
		Name:      company.GetString("name"),
		OwnerID:   ownerID,
		CreatedAt: company.GetDateTime("created").String(),
		Members:   members,
	}
}

func handleGetCompany(e *core.RequestEvent) error {
	company, err := loadCompanyForAuth(e)
	if err != nil {
		return e.NotFoundError("Empresa nao encontrada.", err)
	}
	return e.JSON(http.StatusOK, newCompanyResponse(e.App, company))
}

func handleRenameCompany(e *core.RequestEvent) error {
	var req companyUpdateRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return e.BadRequestError("Informe o nome da empresa.", nil)
	}

	company, err := loadCompanyForAuth(e)
	if err != nil {
		return e.NotFoundError("Empresa nao encontrada.", err)
	}
	if company.GetString("owner") != e.Auth.Id {
		return e.ForbiddenError("Apenas o proprietario pode renomear a empresa.", nil)
	}

	company.Set("name", name)
	if err := e.App.Save(company); err != nil {
		return e.BadRequestError("Nao foi possivel atualizar a empresa.", err)
	}

	return e.JSON(http.StatusOK, newCompanyResponse(e.App, company))
}

func handleInviteMember(e *core.RequestEvent) error {
	var req companyInviteRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Dados invalidos.", err)
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return e.BadRequestError("Informe um email.", nil)
	}

	company, err := loadCompanyForAuth(e)
	if err != nil {
		return e.NotFoundError("Empresa nao encontrada.", err)
	}
	if company.GetString("owner") != e.Auth.Id {
		return e.ForbiddenError("Apenas o proprietario pode adicionar membros.", nil)
	}

	invitee, err := e.App.FindAuthRecordByEmail("users", email)
	if err != nil || invitee == nil {
		return e.BadRequestError("Usuario nao encontrado. Peca para a pessoa criar uma conta primeiro.", err)
	}

	// Se o usuario ja era de outra empresa, removemos a referencia anterior antes de movê-lo.
	if previousID := invitee.GetString("company"); previousID != "" && previousID != company.Id {
		if previous, err := e.App.FindRecordById("companies", previousID); err == nil {
			previousMembers := filterStringSlice(previous.GetStringSlice("members"), invitee.Id)
			previous.Set("members", previousMembers)
			_ = e.App.Save(previous)
		}
	}

	members := company.GetStringSlice("members")
	if !containsString(members, invitee.Id) {
		members = append(members, invitee.Id)
		company.Set("members", members)
		if err := e.App.Save(company); err != nil {
			return e.BadRequestError("Nao foi possivel adicionar o membro.", err)
		}
	}

	invitee.Set("company", company.Id)
	if err := e.App.Save(invitee); err != nil {
		return e.BadRequestError("Nao foi possivel atualizar o membro.", err)
	}

	return e.JSON(http.StatusOK, newCompanyResponse(e.App, company))
}

func handleRemoveMember(e *core.RequestEvent) error {
	memberID := e.Request.PathValue("id")
	if memberID == "" {
		return e.BadRequestError("Informe o id do membro.", nil)
	}

	company, err := loadCompanyForAuth(e)
	if err != nil {
		return e.NotFoundError("Empresa nao encontrada.", err)
	}
	isOwner := company.GetString("owner") == e.Auth.Id
	if !isOwner && memberID != e.Auth.Id {
		return e.ForbiddenError("Sem permissao para remover este membro.", nil)
	}
	if memberID == company.GetString("owner") {
		return e.BadRequestError("O proprietario nao pode ser removido.", nil)
	}

	members := filterStringSlice(company.GetStringSlice("members"), memberID)
	company.Set("members", members)
	if err := e.App.Save(company); err != nil {
		return e.BadRequestError("Nao foi possivel remover o membro.", err)
	}

	if member, err := e.App.FindRecordById("users", memberID); err == nil {
		if member.GetString("company") == company.Id {
			member.Set("company", "")
			_ = e.App.Save(member)
		}
	}

	return e.JSON(http.StatusOK, newCompanyResponse(e.App, company))
}

type evidenceResponse struct {
	ID        string `json:"id"`
	AuditID   string `json:"auditId"`
	ControlID string `json:"controlId"`
	FileName  string `json:"fileName"`
	Size      int64  `json:"size"`
	CreatedAt string `json:"createdAt"`
}

func newEvidenceResponse(app core.App, record *core.Record) evidenceResponse {
	fileName := record.GetString("file")
	var size int64
	if fileName != "" {
		if fsys, err := app.NewFilesystem(); err == nil {
			defer fsys.Close()
			key := record.BaseFilesPath() + "/" + fileName
			if attrs, err := fsys.Attributes(key); err == nil {
				size = attrs.Size
			}
		}
	}
	return evidenceResponse{
		ID:        record.Id,
		AuditID:   record.GetString("audit"),
		ControlID: record.GetString("controlId"),
		FileName:  fileName,
		Size:      size,
		CreatedAt: record.GetDateTime("created").String(),
	}
}

func handleUploadEvidence(e *core.RequestEvent) error {
	auditID := e.Request.PathValue("id")
	audit, err := e.App.FindRecordById("audits", auditID)
	if err != nil || !canAccessAudit(e, audit) {
		return e.NotFoundError("Auditoria nao encontrada.", err)
	}

	// limita o tamanho da requisicao a 5MB + buffer pequeno para campos do form
	e.Request.Body = http.MaxBytesReader(e.Response, e.Request.Body, maxEvidenceFileSize+512*1024)
	if err := e.Request.ParseMultipartForm(maxEvidenceFileSize); err != nil {
		return e.BadRequestError("Arquivo invalido ou maior que 5MB.", err)
	}

	controlID := strings.TrimSpace(e.Request.FormValue("controlId"))
	if controlID == "" {
		return e.BadRequestError("controlId obrigatorio.", nil)
	}

	file, header, err := e.Request.FormFile("file")
	if err != nil {
		return e.BadRequestError("Arquivo obrigatorio.", err)
	}
	file.Close()
	if header.Size > maxEvidenceFileSize {
		return e.BadRequestError("Arquivo excede o limite de 5MB.", nil)
	}

	uploaded, err := filesystem.NewFileFromMultipart(header)
	if err != nil {
		return e.BadRequestError("Nao foi possivel processar o arquivo.", err)
	}

	collection, err := e.App.FindCollectionByNameOrId("audit_evidences")
	if err != nil {
		return e.InternalServerError("Colecao de evidencias indisponivel.", err)
	}

	record := core.NewRecord(collection)
	record.Set("user", e.Auth.Id)
	record.Set("audit", audit.Id)
	record.Set("controlId", controlID)
	record.Set("file", uploaded)

	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("Nao foi possivel salvar a evidencia.", err)
	}

	return e.JSON(http.StatusCreated, newEvidenceResponse(e.App, record))
}

func handleDownloadEvidence(e *core.RequestEvent) error {
	// Aceita token via header Authorization ou via query string (?token=...),
	// para permitir downloads em nova aba via <a href>.
	auth, err := resolveAuthForDownload(e)
	if err != nil || auth == nil {
		return e.UnauthorizedError("Token invalido ou ausente.", err)
	}

	record, err := e.App.FindRecordById("audit_evidences", e.Request.PathValue("id"))
	if err != nil {
		return e.NotFoundError("Evidencia nao encontrada.", err)
	}
	audit, err := e.App.FindRecordById("audits", record.GetString("audit"))
	if err != nil {
		return e.NotFoundError("Evidencia nao encontrada.", err)
	}
	if !canAccessAuditAs(auth, audit) {
		return e.NotFoundError("Evidencia nao encontrada.", nil)
	}

	fileName := record.GetString("file")
	if fileName == "" {
		return e.NotFoundError("Arquivo ausente.", nil)
	}

	fsys, err := e.App.NewFilesystem()
	if err != nil {
		return e.InternalServerError("Storage indisponivel.", err)
	}
	defer fsys.Close()

	key := record.BaseFilesPath() + "/" + fileName
	return fsys.Serve(e.Response, e.Request, key, fileName)
}

// resolveAuthForDownload extrai e valida o JWT a partir do header Authorization
// ou do parametro de query ?token=. Retorna o registro de usuario autenticado.
func resolveAuthForDownload(e *core.RequestEvent) (*core.Record, error) {
	token := ""
	if header := e.Request.Header.Get("Authorization"); strings.HasPrefix(header, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	}
	if token == "" {
		token = e.Request.URL.Query().Get("token")
	}
	if token == "" {
		return nil, errMessage("Token ausente.")
	}
	return e.App.FindAuthRecordByToken(token, core.TokenTypeAuth)
}

// canAccessAuditAs eh uma variante de canAccessAudit que recebe o usuario
// explicitamente (em vez de ler de e.Auth), util para handlers que fazem
// autenticacao manual.
func canAccessAuditAs(user *core.Record, audit *core.Record) bool {
	if audit.GetString("user") == user.Id {
		return true
	}
	companyID := audit.GetString("company")
	if companyID == "" || companyID != user.GetString("company") {
		return false
	}
	return true
}

func handleDeleteEvidence(e *core.RequestEvent) error {
	record, err := e.App.FindRecordById("audit_evidences", e.Request.PathValue("id"))
	if err != nil {
		return e.NotFoundError("Evidencia nao encontrada.", err)
	}
	audit, err := e.App.FindRecordById("audits", record.GetString("audit"))
	if err != nil || !canAccessAudit(e, audit) {
		return e.NotFoundError("Evidencia nao encontrada.", err)
	}
	if err := e.App.Delete(record); err != nil {
		return e.BadRequestError("Nao foi possivel remover a evidencia.", err)
	}
	return e.NoContent(http.StatusNoContent)
}

func containsString(values []string, target string) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}

func filterStringSlice(values []string, target string) []string {
	result := make([]string, 0, len(values))
	for _, v := range values {
		if v != target {
			result = append(result, v)
		}
	}
	return result
}
