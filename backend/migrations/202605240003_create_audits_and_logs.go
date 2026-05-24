package migrations

import (
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

		audits, err := app.FindCollectionByNameOrId("audits")
		if err != nil {
			audits = core.NewBaseCollection("audits")
		}

		ownerRule := types.Pointer("user = @request.auth.id")
		audits.ListRule = ownerRule
		audits.ViewRule = ownerRule
		audits.CreateRule = types.Pointer("@request.auth.id != '' && user = @request.auth.id")
		audits.UpdateRule = ownerRule
		audits.DeleteRule = nil

		ensureField(audits, &core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		ensureField(audits, &core.NumberField{Name: "auditNumber", Required: true, OnlyInt: true})
		ensureField(audits, &core.TextField{Name: "companyName", Required: true, Max: 120})
		ensureField(audits, &core.TextField{Name: "module", Required: true, Max: 20})
		ensureField(audits, &core.TextField{Name: "auditDate", Required: true, Max: 10})
		ensureField(audits, &core.JSONField{Name: "responses", Required: true})
		ensureField(audits, &core.AutodateField{Name: "created", System: true, OnCreate: true})
		ensureField(audits, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

		if err := app.Save(audits); err != nil {
			return err
		}

		logs, err := app.FindCollectionByNameOrId("audit_logs")
		if err != nil {
			logs = core.NewBaseCollection("audit_logs")
		}

		logs.ListRule = ownerRule
		logs.ViewRule = ownerRule
		logs.CreateRule = nil
		logs.UpdateRule = nil
		logs.DeleteRule = nil

		ensureField(logs, &core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		ensureField(logs, &core.RelationField{Name: "audit", CollectionId: audits.Id, Required: true, CascadeDelete: true})
		ensureField(logs, &core.TextField{Name: "action", Required: true, Max: 30})
		ensureField(logs, &core.TextField{Name: "actorEmail", Required: true, Max: 255})
		ensureField(logs, &core.TextField{Name: "actorCompanyName", Required: true, Max: 120})
		ensureField(logs, &core.NumberField{Name: "auditNumber", Required: true, OnlyInt: true})
		ensureField(logs, &core.TextField{Name: "occurredAt", Required: true, Max: 40})
		ensureField(logs, &core.TextField{Name: "previousHash", Max: 64})
		ensureField(logs, &core.TextField{Name: "hash", Required: true, Max: 64})
		ensureField(logs, &core.JSONField{Name: "payload", Required: true})
		ensureField(logs, &core.AutodateField{Name: "created", System: true, OnCreate: true})
		ensureField(logs, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

		return app.Save(logs)
	}, nil)
}

func ensureField(collection *core.Collection, field core.Field) {
	if collection.Fields.GetByName(field.GetName()) == nil {
		collection.Fields.Add(field)
	}
}
