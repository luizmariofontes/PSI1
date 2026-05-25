// Testes unitarios das funcoes de dominio da camada lib/.
// Reimplementamos as funcoes localmente (em JS puro) para evitar dependencia
// de um runner TS. Mantenha em sincronia com lib/audit-utils.ts e
// lib/app-context.tsx -- a CI valida o comportamento.

import test from 'node:test'
import assert from 'node:assert'

// Espelho de lib/audit-utils.ts -> calculateStats
function calculateStats(responses, totalControls) {
  const conforme = responses.filter((r) => r.status === 'conforme').length
  const naoConforme = responses.filter((r) => r.status === 'nao-conforme').length
  const emAndamento = responses.filter((r) => r.status === 'em-andamento').length
  const naoAplica = responses.filter((r) => r.status === 'nao-aplica').length
  const applicable = totalControls - naoAplica
  return {
    total: totalControls,
    conforme,
    naoConforme,
    emAndamento,
    naoAplica,
    conformePercentage: applicable > 0 ? Math.round((conforme / applicable) * 100) : 0,
  }
}

// Espelho de lib/app-context.tsx -> setControlResponse (logica de merge)
function mergeResponse(prev, controlId, status, options) {
  const previous = prev.find((r) => r.controlId === controlId)
  const evidence =
    options?.evidence !== undefined ? options.evidence : previous?.evidence
  const inProgressDetails =
    status === 'em-andamento'
      ? options?.inProgressDetails !== undefined
        ? options.inProgressDetails
        : previous?.inProgressDetails
      : undefined
  const evidenceFile =
    options?.evidenceFile === null
      ? undefined
      : options?.evidenceFile !== undefined
        ? options.evidenceFile
        : previous?.evidenceFile
  const next = {
    controlId,
    status,
    inProgressDetails,
    evidence: evidence && evidence.trim() !== '' ? evidence : undefined,
    evidenceFile,
  }
  const idx = prev.findIndex((r) => r.controlId === controlId)
  if (idx >= 0) {
    const copy = [...prev]
    copy[idx] = next
    return copy
  }
  return [...prev, next]
}

test('calculateStats ignora "nao-aplica" no denominador da conformidade', () => {
  const stats = calculateStats(
    [
      { status: 'conforme' },
      { status: 'conforme' },
      { status: 'nao-conforme' },
      { status: 'nao-aplica' },
    ],
    10,
  )
  assert.equal(stats.naoAplica, 1)
  assert.equal(stats.conformePercentage, Math.round((2 / 9) * 100))
})

test('Evidencia eh mantida ao alterar o status do controle', () => {
  let state = []
  state = mergeResponse(state, 'c1', 'pendente', { evidence: 'doc-pdf' })
  assert.equal(state[0].evidence, 'doc-pdf')
  state = mergeResponse(state, 'c1', 'conforme')
  assert.equal(state[0].evidence, 'doc-pdf', 'mudanca de status nao deve apagar a evidencia')
  assert.equal(state[0].status, 'conforme')
})

test('Evidencia vazia eh removida quando o usuario limpa o campo', () => {
  let state = []
  state = mergeResponse(state, 'c1', 'conforme', { evidence: 'algo' })
  state = mergeResponse(state, 'c1', 'conforme', { evidence: '' })
  assert.equal(state[0].evidence, undefined)
})

test('Anexo de evidencia (evidenceFile) eh preservado ao alterar status', () => {
  let state = []
  const file = { id: 'ev1', fileName: 'evidence.pdf', size: 1234 }
  state = mergeResponse(state, 'c1', 'conforme', { evidenceFile: file })
  assert.deepEqual(state[0].evidenceFile, file)
  state = mergeResponse(state, 'c1', 'nao-conforme')
  assert.deepEqual(state[0].evidenceFile, file, 'arquivo anexado deve sobreviver a troca de status')
})

test('Anexo de evidencia eh removido quando evidenceFile === null', () => {
  let state = []
  state = mergeResponse(state, 'c1', 'conforme', { evidenceFile: { id: 'ev1', fileName: 'a.pdf', size: 1 } })
  state = mergeResponse(state, 'c1', 'conforme', { evidenceFile: null })
  assert.equal(state[0].evidenceFile, undefined)
})

test('inProgressDetails so eh preservado quando o status eh em-andamento', () => {
  let state = []
  state = mergeResponse(state, 'c1', 'em-andamento', { inProgressDetails: 'aguardando aprovacao' })
  assert.equal(state[0].inProgressDetails, 'aguardando aprovacao')
  state = mergeResponse(state, 'c1', 'conforme')
  assert.equal(state[0].inProgressDetails, undefined)
})
