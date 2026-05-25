package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

const evidenceMaxSize = 5 * 1024 * 1024 // 5MB

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		audits, err := app.FindCollectionByNameOrId("audits")
		if err != nil {
			return err
		}

		collection, err := app.FindCollectionByNameOrId("audit_evidences")
		if err != nil {
			collection = core.NewBaseCollection("audit_evidences")
		}

		// Apenas o criador ou um membro da empresa do dono da auditoria pode ler.
		// Criacao/edicao/remocao acontecem pelos handlers autenticados em /api/whoiso/...
		readRule := types.Pointer("audit.user = @request.auth.id || audit.company.members.id ?= @request.auth.id")
		collection.ListRule = readRule
		collection.ViewRule = readRule
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		ensureField(collection, &core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: false})
		ensureField(collection, &core.RelationField{Name: "audit", CollectionId: audits.Id, Required: true, CascadeDelete: true})
		ensureField(collection, &core.TextField{Name: "controlId", Required: true, Max: 60})
		ensureField(collection, &core.FileField{
			Name:      "file",
			Required:  true,
			MaxSelect: 1,
			MaxSize:   evidenceMaxSize,
		})
		ensureField(collection, &core.AutodateField{Name: "created", System: true, OnCreate: true})
		ensureField(collection, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

		return app.Save(collection)
	}, nil)
}
