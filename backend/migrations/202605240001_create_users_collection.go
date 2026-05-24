package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			collection = core.NewAuthCollection("users")
		}

		collection.ListRule = types.Pointer("id = @request.auth.id")
		collection.ViewRule = types.Pointer("id = @request.auth.id")
		collection.UpdateRule = types.Pointer("id = @request.auth.id")
		collection.DeleteRule = types.Pointer("id = @request.auth.id")
		collection.AuthRule = types.Pointer("verified = true")
		collection.PasswordAuth.Enabled = true
		collection.PasswordAuth.IdentityFields = []string{"email"}

		if collection.Fields.GetByName("companyName") == nil {
			collection.Fields.Add(&core.TextField{
				Name:     "companyName",
				Required: true,
				Max:      120,
			})
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return nil
		}

		return app.Delete(collection)
	})
}
