package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		companies, err := app.FindCollectionByNameOrId("companies")
		if err != nil {
			return err
		}

		if members, ok := companies.Fields.GetByName("members").(*core.RelationField); ok {
			members.MaxSelect = 999
			if err := app.Save(companies); err != nil {
				return err
			}
		}

		records, err := app.FindRecordsByFilter("companies", "id != ''", "", 0, 0, dbx.Params{})
		if err != nil {
			return err
		}

		for _, company := range records {
			members := mergeUniqueRelationIDs([]string{company.GetString("owner")}, company.GetStringSlice("members")...)

			users, err := app.FindRecordsByFilter(
				"users",
				"company = {:company}",
				"created",
				0,
				0,
				dbx.Params{"company": company.Id},
			)
			if err != nil {
				return err
			}
			for _, user := range users {
				members = appendUniqueRelationID(members, user.Id)
			}

			company.Set("members", members)
			if err := app.Save(company); err != nil {
				return err
			}
		}

		return nil
	}, nil)
}

func appendUniqueRelationID(values []string, target string) []string {
	if target == "" {
		return values
	}
	for _, value := range values {
		if value == target {
			return values
		}
	}
	return append(values, target)
}

func mergeUniqueRelationIDs(values []string, extras ...string) []string {
	result := make([]string, 0, len(values)+len(extras))
	for _, value := range values {
		result = appendUniqueRelationID(result, value)
	}
	for _, value := range extras {
		result = appendUniqueRelationID(result, value)
	}
	return result
}
