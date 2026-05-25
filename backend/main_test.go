package main

import (
	"encoding/json"
	"testing"

	"github.com/pocketbase/pocketbase/tools/types"
)

// Testa a funcao de validacao do payload de auditoria, incluindo o cenario novo
// em que cada resposta pode carregar o campo "evidence".
func TestValidateAuditRequest_AcceptsEvidence(t *testing.T) {
	responses := []map[string]any{
		{
			"controlId": "5.1",
			"status":    "conforme",
			"evidence":  "Politica de seguranca da informacao PSI-001.pdf revisada em 2026-03-12",
		},
		{
			"controlId":         "5.2",
			"status":            "em-andamento",
			"inProgressDetails": "Politica aguardando aprovacao",
		},
	}
	raw, err := json.Marshal(responses)
	if err != nil {
		t.Fatalf("nao foi possivel serializar respostas: %v", err)
	}

	req := auditRequest{
		Module:    "iso27001",
		AuditDate: "2026-05-25",
		Responses: types.JSONRaw(raw),
	}

	if err := validateAuditRequest(req); err != nil {
		t.Fatalf("validacao falhou para payload com evidencia: %v", err)
	}
}

func TestValidateAuditRequest_RejectsInvalidModule(t *testing.T) {
	req := auditRequest{
		Module:    "iso9999",
		AuditDate: "2026-05-25",
		Responses: types.JSONRaw([]byte(`[]`)),
	}
	if err := validateAuditRequest(req); err == nil {
		t.Fatalf("esperava falha para modulo invalido")
	}
}

func TestValidateAuditRequest_RejectsEmptyResponses(t *testing.T) {
	req := auditRequest{
		Module:    "iso27001",
		AuditDate: "2026-05-25",
		Responses: types.JSONRaw([]byte(``)),
	}
	if err := validateAuditRequest(req); err == nil {
		t.Fatalf("esperava falha para respostas vazias")
	}
}

func TestValidateAuditRequest_RejectsEmptyDate(t *testing.T) {
	req := auditRequest{
		Module:    "iso27001",
		AuditDate: "   ",
		Responses: types.JSONRaw([]byte(`[]`)),
	}
	if err := validateAuditRequest(req); err == nil {
		t.Fatalf("esperava falha para data vazia")
	}
}

// containsString / filterStringSlice sao usadas para gerenciar a lista de membros
// da empresa (adicao e remocao). Garante o comportamento esperado.
func TestContainsString(t *testing.T) {
	values := []string{"a", "b", "c"}
	if !containsString(values, "b") {
		t.Fatalf("esperava encontrar 'b'")
	}
	if containsString(values, "z") {
		t.Fatalf("nao esperava encontrar 'z'")
	}
	if containsString(nil, "a") {
		t.Fatalf("slice nulo nunca deve conter elementos")
	}
}

func TestFilterStringSlice_RemovesTarget(t *testing.T) {
	values := []string{"a", "b", "c", "b"}
	result := filterStringSlice(values, "b")
	if len(result) != 2 || result[0] != "a" || result[1] != "c" {
		t.Fatalf("resultado inesperado: %v", result)
	}
}

func TestFilterStringSlice_NoMatchKeepsAll(t *testing.T) {
	values := []string{"a", "b", "c"}
	result := filterStringSlice(values, "z")
	if len(result) != 3 {
		t.Fatalf("esperava preservar slice completo, obtive %v", result)
	}
}

// Garante que o hash da trilha de auditoria seja deterministico para o mesmo
// payload e mude quando qualquer campo (incluindo a nova evidencia inserida em
// "responses") for alterado.
// Garante que o limite de tamanho do anexo de evidencia esta alinhado entre
// a migracao e o handler de upload (5MB). Se um lado mudar e o outro nao,
// este teste quebra antes de chegar em producao.
func TestEvidenceSizeLimitConstant(t *testing.T) {
	const expected = 5 * 1024 * 1024
	if maxEvidenceFileSize != expected {
		t.Fatalf("maxEvidenceFileSize (%d) != %d", maxEvidenceFileSize, expected)
	}
}

// Garante a serializacao JSON do payload de evidencia (chaves esperadas pelo frontend).
func TestEvidenceResponseJSONShape(t *testing.T) {
	resp := evidenceResponse{
		ID:        "abc",
		AuditID:   "aud",
		ControlID: "5.1",
		FileName:  "evidencia.pdf",
		Size:      2048,
		CreatedAt: "2026-05-25",
	}
	raw, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal falhou: %v", err)
	}
	got := string(raw)
	for _, expected := range []string{`"id":"abc"`, `"auditId":"aud"`, `"controlId":"5.1"`, `"fileName":"evidencia.pdf"`, `"size":2048`} {
		if !contains(got, expected) {
			t.Fatalf("payload nao contem %s: %s", expected, got)
		}
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (haystack == needle || indexOf(haystack, needle) >= 0)
}

func indexOf(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}

func TestHashAuditPayload_Deterministic(t *testing.T) {
	payload := auditHashPayload{
		AuditID:      "abc",
		UserID:       "u1",
		Action:       "created",
		AuditNumber:  1,
		CompanyName:  "Acme",
		Module:       "iso27001",
		AuditDate:    "2026-05-25",
		Responses:    []map[string]any{{"controlId": "5.1", "status": "conforme", "evidence": "doc-1"}},
		PreviousHash: "",
		OccurredAt:   "2026-05-25T12:00:00Z",
	}

	hashA, _, err := hashAuditPayload(payload)
	if err != nil {
		t.Fatalf("erro ao gerar hash A: %v", err)
	}
	hashB, _, err := hashAuditPayload(payload)
	if err != nil {
		t.Fatalf("erro ao gerar hash B: %v", err)
	}
	if hashA != hashB {
		t.Fatalf("hash deveria ser deterministico, obteve %s e %s", hashA, hashB)
	}

	// Alterando a evidencia deve mudar o hash.
	payload.Responses = []map[string]any{{"controlId": "5.1", "status": "conforme", "evidence": "doc-2"}}
	hashC, _, err := hashAuditPayload(payload)
	if err != nil {
		t.Fatalf("erro ao gerar hash C: %v", err)
	}
	if hashC == hashA {
		t.Fatalf("hash nao deveria ser igual quando a evidencia muda")
	}
}
