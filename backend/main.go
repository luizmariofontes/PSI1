package main

import (
	"log"
	"net/http"
	"strings"

	_ "whoiso/backend/migrations"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/osutils"
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
	e.Response.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")

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
		return e.BadRequestError("Dados inválidos.", err)
	}

	if data.CompanyName == "" || data.Email == "" || data.Password == "" {
		return e.BadRequestError("Informe nome da empresa, email e senha.", nil)
	}

	if len(data.Password) < 6 {
		return e.BadRequestError("A senha deve ter pelo menos 6 caracteres.", nil)
	}

	if existing, _ := e.App.FindAuthRecordByEmail("users", data.Email); existing != nil {
		return e.BadRequestError("Este email já está cadastrado.", nil)
	}

	collection, err := e.App.FindCollectionByNameOrId("users")
	if err != nil {
		return e.InternalServerError("Coleção de usuários não encontrada.", err)
	}

	record := core.NewRecord(collection)
	record.SetEmail(data.Email)
	record.SetPassword(data.Password)
	record.SetVerified(true)
	record.Set("companyName", data.CompanyName)

	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("Não foi possível criar o usuário.", err)
	}

	token, err := record.NewAuthToken()
	if err != nil {
		return e.InternalServerError("Não foi possível autenticar o usuário.", err)
	}

	return e.JSON(http.StatusCreated, newAuthResponse(token, record))
}

func handleLogin(e *core.RequestEvent) error {
	data := loginRequest{}
	if err := e.BindBody(&data); err != nil {
		return e.BadRequestError("Dados inválidos.", err)
	}

	if data.Email == "" || data.Password == "" {
		return e.BadRequestError("Informe email e senha.", nil)
	}

	record, err := e.App.FindAuthRecordByEmail("users", data.Email)
	if err != nil || record == nil || !record.ValidatePassword(data.Password) {
		return e.UnauthorizedError("Credenciais inválidas.", err)
	}

	token, err := record.NewAuthToken()
	if err != nil {
		return e.InternalServerError("Não foi possível autenticar o usuário.", err)
	}

	return e.JSON(http.StatusOK, newAuthResponse(token, record))
}

func newAuthResponse(token string, record *core.Record) authResponse {
	return authResponse{
		Token: token,
		User: authUserResponse{
			ID:          record.Id,
			CompanyName: record.GetString("companyName"),
			Email:       record.Email(),
			CreatedAt:   record.GetDateTime("created").String(),
		},
	}
}
