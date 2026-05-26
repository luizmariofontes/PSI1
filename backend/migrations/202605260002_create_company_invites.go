package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		companies, err := app.FindCollectionByNameOrId("companies")
		if err != nil {
			return err
		}
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		invites, err := app.FindCollectionByNameOrId("company_invites")
		if err != nil {
			invites = core.NewBaseCollection("company_invites")
		}

		invites.ListRule = nil
		invites.ViewRule = nil
		invites.CreateRule = nil
		invites.UpdateRule = nil
		invites.DeleteRule = nil

		ensureField(invites, &core.RelationField{Name: "company", CollectionId: companies.Id, Required: true, MaxSelect: 1, CascadeDelete: true})
		ensureField(invites, &core.RelationField{Name: "inviter", CollectionId: users.Id, Required: true, MaxSelect: 1, CascadeDelete: false})
		ensureField(invites, &core.RelationField{Name: "invitee", CollectionId: users.Id, Required: true, MaxSelect: 1, CascadeDelete: true})
		ensureField(invites, &core.EmailField{Name: "email", Required: true})
		ensureField(invites, &core.TextField{Name: "tokenHash", Required: true, Max: 64})
		ensureField(invites, &core.TextField{Name: "expiresAt", Required: true, Max: 40})
		ensureField(invites, &core.TextField{Name: "acceptedAt", Max: 40})
		ensureField(invites, &core.AutodateField{Name: "created", System: true, OnCreate: true})
		ensureField(invites, &core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})

		return app.Save(invites)
	}, nil)
}
