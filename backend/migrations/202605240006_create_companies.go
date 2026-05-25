package migrations

import (
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		// Cria a colecao "companies" caso ainda nao exista
		companies, err := app.FindCollectionByNameOrId("companies")
		if err != nil {
			companies = core.NewBaseCollection("companies")
		}

		// Criacao/edicao acontece pelo backend (rotas autenticadas /api/whoiso/company)
		companies.CreateRule = nil
		companies.UpdateRule = nil
		companies.DeleteRule = nil
		// As regras de leitura referenciam "members" -- definidas mais abaixo apos o campo existir.
		companies.ListRule = nil
		companies.ViewRule = nil

		ensureField(companies, &core.TextField{Name: "name", Required: true, Max: 120})
		ensureField(companies, &core.RelationField{Name: "owner", CollectionId: users.Id, Required: false, MaxSelect: 1})
		ensureField(companies, &core.RelationField{Name: "members", CollectionId: users.Id, Required: false, MaxSelect: 0})
		ensureField(companies, &core.AutodateField{Name: "created", System: true, OnCreate: true})
		ensureField(companies, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

		if err := app.Save(companies); err != nil {
			return err
		}

		// Adiciona o campo "company" no usuario (multi-tenant: cada usuario pertence a uma empresa)
		if users.Fields.GetByName("company") == nil {
			users.Fields.Add(&core.RelationField{
				Name:         "company",
				CollectionId: companies.Id,
				Required:     false,
				MaxSelect:    1,
			})
			if err := app.Save(users); err != nil {
				return err
			}
		}

		// Agora que o campo "members" existe, aplicamos as regras de leitura
		memberRule := types.Pointer("members.id ?= @request.auth.id")
		companies.ListRule = memberRule
		companies.ViewRule = memberRule
		if err := app.Save(companies); err != nil {
			return err
		}

		// Adiciona o campo "company" nas auditorias
		audits, err := app.FindCollectionByNameOrId("audits")
		if err != nil {
			return err
		}
		if audits.Fields.GetByName("company") == nil {
			audits.Fields.Add(&core.RelationField{
				Name:         "company",
				CollectionId: companies.Id,
				Required:     false,
				MaxSelect:    1,
			})
		}

		// Atualiza regras para considerar a empresa do usuario (usuario continua dono mas seus pares da empresa tambem leem)
		audits.ListRule = types.Pointer("user = @request.auth.id || company.members.id ?= @request.auth.id")
		audits.ViewRule = types.Pointer("user = @request.auth.id || company.members.id ?= @request.auth.id")
		audits.CreateRule = types.Pointer("@request.auth.id != '' && user = @request.auth.id")
		audits.UpdateRule = types.Pointer("user = @request.auth.id || company.members.id ?= @request.auth.id")
		audits.DeleteRule = nil

		if err := app.Save(audits); err != nil {
			return err
		}

		// Backfill: cria uma empresa para cada usuario existente sem company
		usersList, err := app.FindRecordsByFilter("users", "id != ''", "", 0, 0, dbx.Params{})
		if err != nil {
			return err
		}

		for _, user := range usersList {
			if user.GetString("company") != "" {
				continue
			}
			name := strings.TrimSpace(user.GetString("companyName"))
			if name == "" {
				name = "Empresa de " + user.Email()
			}

			company := core.NewRecord(companies)
			company.Set("name", name)
			company.Set("owner", user.Id)
			company.Set("members", []string{user.Id})
			if err := app.Save(company); err != nil {
				return err
			}

			user.Set("company", company.Id)
			if err := app.Save(user); err != nil {
				return err
			}
		}

		// Backfill: associa auditorias existentes a empresa do criador
		auditsList, err := app.FindRecordsByFilter("audits", "company = ''", "", 0, 0, dbx.Params{})
		if err == nil {
			for _, audit := range auditsList {
				userID := audit.GetString("user")
				if userID == "" {
					continue
				}
				user, err := app.FindRecordById("users", userID)
				if err != nil {
					continue
				}
				companyID := user.GetString("company")
				if companyID == "" {
					continue
				}
				audit.Set("company", companyID)
				if err := app.Save(audit); err != nil {
					return err
				}
			}
		}

		// Por fim, atualiza tambem a colecao users para permitir leitura cruzada de membros (mesma empresa)
		users.ListRule = types.Pointer("id = @request.auth.id || company.members.id ?= @request.auth.id")
		users.ViewRule = types.Pointer("id = @request.auth.id || company.members.id ?= @request.auth.id")
		if err := app.Save(users); err != nil {
			return err
		}

		return nil
	}, nil)
}
