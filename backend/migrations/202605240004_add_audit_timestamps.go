package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		for _, name := range []string{"audits", "audit_logs"} {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}

			ensureField(collection, &core.AutodateField{Name: "created", System: true, OnCreate: true})
			ensureField(collection, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

			if err := app.Save(collection); err != nil {
				return err
			}
		}

		return nil
	}, nil)
}
