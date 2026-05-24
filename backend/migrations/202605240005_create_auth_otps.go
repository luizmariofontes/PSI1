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

		collection, err := app.FindCollectionByNameOrId("auth_otps")
		if err != nil {
			collection = core.NewBaseCollection("auth_otps")
		}

		collection.ListRule = nil
		collection.ViewRule = nil
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		ensureField(collection, &core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		ensureField(collection, &core.EmailField{Name: "email", Required: true})
		ensureField(collection, &core.TextField{Name: "purpose", Required: true, Max: 20})
		ensureField(collection, &core.TextField{Name: "codeHash", Max: 64, Hidden: true})
		ensureField(collection, &core.TextField{Name: "expiresAt", Required: true, Max: 40})
		ensureField(collection, &core.TextField{Name: "usedAt", Max: 40})
		ensureField(collection, &core.NumberField{Name: "attempts", OnlyInt: true})
		ensureField(collection, &core.AutodateField{Name: "created", System: true, OnCreate: true})
		ensureField(collection, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

		if err := app.Save(collection); err != nil {
			return err
		}

		users.AuthRule = types.Pointer("verified = true")
		return app.Save(users)
	}, nil)
}
