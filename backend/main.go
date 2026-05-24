package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
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
	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: osutils.IsProbablyGoRun(),
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.BindFunc(cors)

		group := se.Router.Group("/api/whoiso")
		group.POST("/auth/signup", handleSignup)
		group.POST("/auth/login", handleLogin)
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
	record.SetVerified(true)
	record.Set("companyName", data.CompanyName)

	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("Nao foi possivel criar o usuario.", err)
	}

	token, err := record.NewAuthToken()
	if err != nil {
		return e.InternalServerError("Nao foi possivel autenticar o usuario.", err)
	}

	return e.JSON(http.StatusCreated, authResponse{Token: token, User: newAuthUserResponse(record)})
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

	token, err := record.NewAuthToken()
	if err != nil {
		return e.InternalServerError("Nao foi possivel autenticar o usuario.", err)
	}

	return e.JSON(http.StatusOK, authResponse{Token: token, User: newAuthUserResponse(record)})
}

func handleMe(e *core.RequestEvent) error {
	return e.JSON(http.StatusOK, newAuthUserResponse(e.Auth))
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
