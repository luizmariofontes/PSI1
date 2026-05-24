# Sistema de Diagnóstico de Conformidade ISO/IEC 27001 e 27701

> **Projeto de Segurança I (PSI)**\: Ferramenta para diagnóstico de conformidade com as normas **ABNT NBR ISO/IEC 27001** (Sistema de Gestão de Segurança da Informação) e **ABNT NBR ISO/IEC 27701** (Sistema de Gestão da Privacidade da Informação), utilizando a **ABNT NBR ISO/IEC 27002** como base de avaliação para a conformidade da 27001.

---

## Sumário

- [Descrição do Sistema](#-descrição-do-sistema)
- [Objetivos](#-objetivos)
- [Requisitos Funcionais](#-requisitos-funcionais)
- [Requisitos Não Funcionais](#️-requisitos-não-funcionais)
- [Arquitetura Conceitual](#️-arquitetura-conceitual)
- [Diagramas UML](#-diagramas-uml)
  - [Diagrama de Casos de Uso](#diagrama-de-casos-de-uso)
  - [Diagrama de Classes](#diagrama-de-classes)
  - [Diagrama de Atividades](#diagrama-de-atividades)
- [Tecnologias](#️-tecnologias)
- [Referências](#-referências)

---

## Descrição do Sistema

O **Sistema de Diagnóstico de Conformidade ISO 27001/27701** é uma ferramenta acadêmica desenvolvida no contexto da disciplina **Projeto de Segurança I (PSI)** cujo objetivo é auxiliar auditores, profissionais de segurança da informação e responsáveis pelo programa de privacidade de uma organização a realizar **autoavaliações de conformidade** frente a duas das principais normas internacionais da família ISO/IEC 27000:

- **ABNT NBR ISO/IEC 27001**: Estabelece os requisitos para um Sistema de Gestão de Segurança da Informação (SGSI).
- **ABNT NBR ISO/IEC 27701:2026**: Estende a 27001 para a gestão da privacidade de informações pessoais, sendo a referência para um Sistema de Gestão da Privacidade da Informação (SGPI). É aplicável tanto a controladores quanto a operadores de dados pessoais (DP) e está mapeada à LGPD (Lei nº 13.709/2018).
- **ABNT NBR ISO/IEC 27002:2022**: Fornece o catálogo detalhado de controles utilizados como **base de diagnóstico** para a 27001, organizados em quatro temas (Organizacional, Pessoas, Físico e Tecnológico), totalizando 93 controles.

A ferramenta permite que o usuário **selecione o módulo de auditoria** (27001 ou 27701), informe os dados da empresa avaliada, percorra todos os controles aplicáveis e classifique cada um como **Conforme**, **Não Conforme** ou **Não se Aplica**. Quando um controle for considerado não conforme, o sistema registra também se existe **trabalho em andamento** para sua adequação. Ao final, os dados são consolidados em um **dashboard** com indicadores parciais (por tipo de controle) e geral de conformidade, além de permitir a geração de **relatórios** e **análise comparativa** com auditorias anteriores (até as 3 últimas).

---

## Objetivos

- Permitir a realização de auditorias internas guiadas, baseadas nos controles da ABNT NBR ISO/IEC 27002 e do Anexo A da ABNT NBR ISO/IEC 27701.
- Apoiar o diagnóstico de **conformidade** organizacional para 27001 (segurança) e 27701 (privacidade).
- Consolidar os resultados em **dashboard visual** com gráficos de conformidade total e por categoria.
- Manter o **histórico das três últimas auditorias** para análise de evolução.
- Gerar **relatórios** atuais e comparativos, completos ou segmentados por tipo de controle.

---

## Requisitos Funcionais

Os requisitos funcionais (RF) descrevem **o que o sistema deve fazer**, as funcionalidades observáveis pelo usuário final. Cada requisito abaixo está vinculado a um trecho do enunciado do PSI e/ou a uma cláusula normativa.

> 💡 *Clique em cada requisito para expandir os detalhes.*

<details>
<summary><strong>RF01 - Seleção de Módulo Normativo</strong></summary>

<br>

O sistema deve permitir que o usuário selecione, no início de cada auditoria, entre dois módulos mutuamente exclusivos: **ISO/IEC 27001** (segurança da informação) ou **ISO/IEC 27701** (privacidade da informação). A escolha do módulo determina o catálogo de controles que será carregado para a avaliação subsequente.

- **Prioridade:** Essencial
- **Origem:** PSI - "Um módulo para 27001 e outro para 27701"

</details>

<details>
<summary><strong>RF02 - Carregamento do Catálogo de Controles</strong></summary>

<br>

O sistema deve carregar automaticamente os controles aplicáveis ao módulo escolhido. Para o módulo **27001**, deve utilizar os 93 controles da **ISO/IEC 27002:2022**, distribuídos nos quatro temas (Organizacional, Pessoas, Físico e Tecnológico). Para o módulo **27701**, deve utilizar os controles do **Anexo A da ISO/IEC 27701:2026**, abrangendo as Tabelas A.1 (controladores), A.2 (operadores) e A.3 (considerações de segurança comuns).

- **Prioridade:** Essencial
- **Origem:** PSI - "Utilizar 27002 para diagnóstico da conformidade de 27001"

</details>

<details>
<summary><strong>RF03 - Cadastro da Empresa Auditada</strong></summary>

<br>

O sistema deve permitir o cadastro da organização sob avaliação, capturando, no mínimo, o **nome (razão social)** e o **CNPJ**. Empresas previamente cadastradas devem poder ser reutilizadas em novas auditorias sem necessidade de recadastro.

- **Prioridade:** Essencial
- **Origem:** PSI - "Perguntar nome da empresa"

</details>

<details>
<summary><strong>RF04 - Registro da Data da Auditoria</strong></summary>

<br>

O sistema deve registrar a data de realização da auditoria (preferencialmente capturada de forma automática), associando-a ao registro da auditoria para fins de rastreabilidade temporal e comparativo histórico.

- **Prioridade:** Essencial
- **Origem:** PSI - "Armazenar os dados e data de auditoria"

</details>

<details>
<summary><strong>RF05 - Classificação Individual de Controles</strong></summary>

<br>

Para cada controle apresentado, o sistema deve permitir que o auditor atribua **uma única** das três classificações mutuamente exclusivas: **Conforme**, **Não Conforme** ou **Não se Aplica**. A classificação deve poder ser acompanhada de uma **observação textual opcional** justificando a decisão.

- **Prioridade:** Essencial
- **Origem:** PSI - "Para cada controle, perguntar se está conforme ou não está conforme ou não se aplica"

</details>

<details>
<summary><strong>RF06 - Registro de Trabalho em Andamento para Não Conformidades</strong></summary>

<br>

Sempre que um controle for classificado como **Não Conforme**, o sistema deve perguntar se há **trabalho em andamento** para a sua adequação. A resposta (Sim/Não) deve ser armazenada como atributo da resposta ao controle, permitindo distinguir não conformidades já em remediação daquelas ainda sem tratamento.

- **Prioridade:** Essencial
- **Origem:** PSI - "Caso não esteja conforme, perguntar se existe alguma trabalho em andamento"

</details>

<details>
<summary><strong>RF07 - Persistência da Auditoria</strong></summary>

<br>

Ao finalizar a avaliação dos controles, o sistema deve **persistir** todos os dados da auditoria (empresa, módulo, data, respostas, observações) em armazenamento durável, garantindo que possam ser recuperados em sessões posteriores.

- **Prioridade:** Essencial
- **Origem:** PSI - "Armazenar os dados"

</details>

<details>
<summary><strong>RF08 - Manutenção de Histórico das 3 Últimas Auditorias</strong></summary>

<br>

O sistema deve preservar, por combinação de **empresa + módulo**, o registro das **três auditorias mais recentes** para fins de comparativo evolutivo. Registros mais antigos podem ser arquivados, descartados ou ficar inacessíveis ao módulo de comparação.

- **Prioridade:** Essencial
- **Origem:** PSI - "Armazenar os dados e data de auditoria para efeitos comparativos (3 últimas auditorias)"

</details>

<details>
<summary><strong>RF09 - Cálculo da Conformidade Geral</strong></summary>

<br>

O sistema deve calcular o **percentual geral de conformidade** da auditoria, definido como a razão entre o número de controles classificados como "Conforme" e o total de controles **aplicáveis** (excluindo do denominador os classificados como "Não se Aplica").

- **Prioridade:** Essencial

</details>

<details>
<summary><strong>RF10 - Cálculo da Conformidade por Tipo de Controle</strong></summary>

<br>

O sistema deve calcular percentuais **parciais** de conformidade segregados por **tipo de controle**, conforme a taxonomia adotada pelo módulo: as quatro categorias da ISO/IEC 27002 para o módulo 27001 (Organizacional, Pessoas, Físico, Tecnológico) ou as categorias do Anexo A da ISO/IEC 27701 para o módulo de privacidade.

- **Prioridade:** Essencial
- **Origem:** PSI - "Agrupar os dados por tipos de controle (27002)"

</details>

<details>
<summary><strong>RF11 - Dashboard de Conformidade</strong></summary>

<br>

O sistema deve apresentar um **painel consolidado (dashboard)** exibindo simultaneamente: (i) o percentual geral de conformidade, (ii) os percentuais parciais por tipo de controle, e (iii) elementos gráficos que facilitem a leitura visual dos resultados.

- **Prioridade:** Essencial
- **Origem:** PSI - "Apresentar os dados no formato de dashboard"

</details>

<details>
<summary><strong>RF12 - Visualização Gráfica dos Resultados</strong></summary>

<br>

O dashboard deve oferecer pelo menos **dois tipos de gráficos**: um gráfico de **pizza** (ou rosca) representando a distribuição entre Conforme / Não Conforme / Não se Aplica, e um gráfico de **barras** comparando o percentual de conformidade entre os tipos de controle.

- **Prioridade:** Importante
- **Origem:** PSI - "gráficos (pizza ou barra)"

</details>

<details>
<summary><strong>RF13 - Geração de Relatório por Tipo de Controle</strong></summary>

<br>

O sistema deve permitir gerar um **relatório segmentado por categoria de controle**, listando para cada tipo todos os controles avaliados, sua classificação, indicação de trabalho em andamento (quando aplicável) e observações registradas pelo auditor.

- **Prioridade:** Essencial
- **Origem:** PSI - "Apresentar relatórios por tipos de controle"

</details>

<details>
<summary><strong>RF14 - Geração de Relatório Completo</strong></summary>

<br>

O sistema deve permitir gerar um **relatório completo** consolidando todos os controles avaliados na auditoria atual, em ordem de catálogo, com classificação, indicação de andamento e observações.

- **Prioridade:** Essencial
- **Origem:** PSI - "relatório completo de conformidade"

</details>

<details>
<summary><strong>RF15 - Geração de Relatório Comparativo</strong></summary>

<br>

O sistema deve permitir gerar **relatórios comparativos** confrontando a auditoria atual com as anteriores (até as 3 últimas) da mesma empresa e módulo, evidenciando a **evolução** dos indicadores de conformidade. O comparativo deve estar disponível tanto para o formato por tipo quanto para o completo.

- **Prioridade:** Essencial
- **Origem:** PSI - "Funcionalidade de comparativo / mostrar evolução de conformidade"

</details>

<details>
<summary><strong>RF16 - Restrição Temporal para Geração de Relatórios</strong></summary>

<br>

A funcionalidade de relatórios deve estar disponível **somente após a conclusão (finalização)** da auditoria corrente. Auditorias em andamento não podem produzir relatórios definitivos, apenas pré-visualizações de progresso.

- **Prioridade:** Importante
- **Origem:** PSI - "Relatórios (somente após a conclusão de auditoria)"

</details>

---

## Requisitos Não Funcionais

Os requisitos não funcionais (RNF) descrevem **atributos de qualidade** do sistema, como ele deve se comportar e quais restrições deve respeitar.

> 💡 *Clique em cada requisito para expandir os detalhes.*

<details>
<summary><strong>RNF01 - Usabilidade</strong></summary>

<br>

Considerando que uma auditoria 27001 envolve a avaliação sequencial de até 93 controles (e a 27701 pode envolver número equivalente ou superior), a interface deve ser **clara, objetiva e de baixa carga cognitiva**. Cada controle deve ser apresentado com seu código, título, descrição original da norma e os três botões de classificação visíveis simultaneamente, sem necessidade de rolagem excessiva.

</details>

<details>
<summary><strong>RNF02 - Confiabilidade dos Dados</strong></summary>

<br>

Nenhum dado de auditoria pode ser **perdido entre sessões** ou em caso de falha de aplicação durante o preenchimento. Recomenda-se persistência incremental (salvamento automático a cada controle respondido) e mecanismo de recuperação de auditoria em andamento.

</details>

<details>
<summary><strong>RNF03 - Segurança da Aplicação</strong></summary>

<br>

Por tratar de dados sensíveis de auditoria, o próprio sistema deve seguir boas práticas de segurança alinhadas à ISO/IEC 27002, incluindo:

- **Autenticação** de usuários antes do acesso a auditorias.
- **Controle de acesso** restringindo a visualização de auditorias por empresa/perfil.
- **Registro de eventos (log)** das ações relevantes (criação, edição, exclusão de auditorias e relatórios).
- **Backup periódico** dos dados persistidos.

</details>

<details>
<summary><strong>RNF04 - Conformidade Normativa do Catálogo</strong></summary>

<br>

O catálogo de controles embutido na ferramenta deve refletir as **edições vigentes** das normas de referência: ABNT NBR ISO/IEC 27002:2022 e ABNT NBR ISO/IEC 27701:2026. Quaisquer atualizações normativas devem poder ser incorporadas por meio de atualização do catálogo, sem necessidade de retrabalho nos dados históricos.

</details>

<details>
<summary><strong>RNF05 - Performance e Tempo de Resposta</strong></summary>

<br>

Operações de leitura (carregamento de controles, exibição do dashboard, recuperação de histórico) devem responder em até **2 segundos** em uma carga típica de uso. A geração de relatórios e gráficos comparativos pode admitir tempos maiores (até 5 segundos), por envolver agregação histórica.

</details>

<details>
<summary><strong>RNF06 - Portabilidade</strong></summary>

<br>

O sistema deve poder ser executado em ambientes de uso comum em organizações (navegadores web modernos ou plataformas desktop multiplataforma), sem dependência de sistema operacional específico para a interface do usuário.

</details>

<details>
<summary><strong>RNF07 - Manutenibilidade</strong></summary>

<br>

A separação clara entre o **catálogo de controles** (dados normativos), as **regras de cálculo de conformidade** (lógica de domínio) e a **camada de persistência** deve permitir que evoluções em uma camada não impactem desnecessariamente as demais. A arquitetura é guiada pelo princípio de **separação de responsabilidades**.

</details>

<details>
<summary><strong>RNF08 - Auditabilidade</strong></summary>

<br>

Sendo a aplicação uma ferramenta de auditoria, o próprio sistema deve ser **auditável**: cada resposta registrada deve ser inalterável após o fechamento da auditoria, e qualquer alteração subsequente (caso permitida administrativamente) deve gerar trilha de auditoria com autor, data e justificativa.

</details>

<details>
<summary><strong>RNF09 - Idioma e Localização</strong></summary>

<br>

A interface, o catálogo de controles e os relatórios gerados devem estar em **português brasileiro**, refletindo a terminologia adotada pelas normas ABNT NBR e pela LGPD (por exemplo: "dados pessoais" em vez de "PII", "operador" e "controlador" em vez de "processor" e "controller").

</details>

<details>
<summary><strong>RNF10 - Privacidade dos Dados de Auditoria</strong></summary>

<br>

Os dados de auditoria, embora não sejam dados pessoais em sentido estrito, podem conter informações sensíveis sobre a postura de segurança das organizações avaliadas. O sistema deve adotar boas práticas de **minimização**, **controle de acesso** e **proteção em repouso** — coerentes com as próprias normas que ele ajuda a avaliar.

</details>

---

## Arquitetura Conceitual

O sistema é estruturado em camadas:

- **Apresentação**: Interface do usuário (formulários de auditoria, dashboard e relatórios).
- **Aplicação / Domínio**: Regras de negócio: classificação de controles, cálculo de percentuais de conformidade, comparação histórica.
- **Persistência**: Armazenamento das auditorias, respostas e metadados (data, empresa, módulo).

A separação entre **módulos** (27001 e 27701) e **tipos de controle** (categorias da 27002 e do Anexo A da 27701) é refletida diretamente no modelo de classes apresentado adiante.

---

## Diagramas UML

### Diagrama de Casos de Uso

Apresenta as interações entre o ator principal (**Auditor**) e as funcionalidades do sistema.

```mermaid
flowchart LR
    Auditor(("👤<br/>Auditor"))

    subgraph SISTEMA["Sistema de Diagnóstico de Conformidade"]
        UC1(["Selecionar Módulo<br/>(27001 / 27701)"])
        UC2(["Cadastrar Empresa"])
        UC3(["Realizar Auditoria"])
        UC4(["Classificar Controle"])
        UC5(["Registrar Andamento"])
        UC6(["Visualizar Dashboard"])
        UC7(["Gerar Relatório Atual"])
        UC8(["Gerar Relatório Comparativo"])
        UC9(["Consultar Histórico"])
    end

    Auditor --- UC1
    Auditor --- UC2
    Auditor --- UC3
    Auditor --- UC6
    Auditor --- UC7
    Auditor --- UC8
    Auditor --- UC9

    UC3 -. «include» .-> UC4
    UC4 -. «extend» .-> UC5
    UC7 -. «include» .-> UC6
    UC8 -. «include» .-> UC9
```

**Notas de leitura:**
- `«include»` indica que o caso de uso é **sempre** executado como parte do caso de uso de origem.
- `«extend»` indica execução **condicional** (somente quando o controle é "Não Conforme").

---

### Diagrama de Classes

Modelo de domínio do sistema. As enumerações representam valores fixos definidos pelas normas.

```mermaid
classDiagram
    direction LR

    class Empresa {
        -int id
        -String nome
        -String cnpj
        +cadastrar()
        +listarAuditorias() List~Auditoria~
    }

    class Auditoria {
        -int id
        -Date dataAuditoria
        -Modulo modulo
        +iniciar()
        +finalizar()
        +calcularConformidadeGeral() float
        +calcularConformidadePorTipo() Map
    }

    class Modulo {
        <<enumeration>>
        ISO_27001
        ISO_27701
    }

    class Controle {
        -String codigo
        -String descricao
        -TipoControle tipo
        -Modulo modulo
    }

    class TipoControle {
        <<enumeration>>
        ORGANIZACIONAL
        PESSOAS
        FISICO
        TECNOLOGICO
    }

    class RespostaControle {
        -StatusConformidade status
        -boolean emAndamento
        -String observacao
    }

    class StatusConformidade {
        <<enumeration>>
        CONFORME
        NAO_CONFORME
        NAO_APLICA
    }

    class Dashboard {
        +gerarGraficoPizza()
        +gerarGraficoBarra()
        +calcularPercentuais() Map
    }

    class Relatorio {
        <<abstract>>
        -Auditoria auditoria
        -Date dataGeracao
        +gerar()*
    }

    class RelatorioCompleto {
        +gerar()
    }

    class RelatorioPorTipo {
        -TipoControle tipo
        +gerar()
    }

    class RelatorioComparativo {
        -List~Auditoria~ auditoriasAnteriores
        +compararEvolucao()
        +gerar()
    }

    Empresa "1" --> "0..*" Auditoria : possui
    Auditoria "1" --> "1" Modulo : refere-se a
    Auditoria "1" --> "1..*" RespostaControle : contém
    RespostaControle "*" --> "1" Controle : avalia
    Controle "*" --> "1" TipoControle : categorizado por
    Controle "*" --> "1" Modulo : pertence a
    RespostaControle --> StatusConformidade : tem
    Auditoria "1" --> "1" Dashboard : gera
    Auditoria "1" --> "0..*" Relatorio : produz
    Relatorio <|-- RelatorioCompleto
    Relatorio <|-- RelatorioPorTipo
    Relatorio <|-- RelatorioComparativo
```

**Principais relacionamentos:**
- Uma `Empresa` pode ter **várias** `Auditorias` (limitadas a 3 últimas para fins comparativos).
- Cada `Auditoria` está vinculada a **um único** `Modulo` (27001 **ou** 27701).
- Cada `RespostaControle` referencia **um** `Controle` e armazena seu `StatusConformidade`.
- `Relatorio` é uma classe abstrata especializada em três tipos concretos.

---

### Diagrama de Atividades

O fluxo da ferramenta foi organizado em **quatro fases lógicas** (Preparação, Execução, Análise e Relatórios), com **processamento paralelo** na fase de análise (cálculo de indicadores, agrupamento e geração de gráficos ocorrem concorrentemente) e **tratamento de exceção** quando não há histórico suficiente para comparativo.

```mermaid
flowchart TD
    Inicio([Início]) --> Fase1

    subgraph Fase1["Fase 1 — Preparação"]
        direction TB
        P1[Autenticar auditor] --> P2{Empresa<br/>já cadastrada?}
        P2 -->|Não| P3[Cadastrar nova empresa<br/>nome + CNPJ]
        P2 -->|Sim| P4[Selecionar empresa<br/>existente]
        P3 --> P5[Selecionar módulo<br/>27001 ou 27701]
        P4 --> P5
        P5 --> P6[(Carregar catálogo<br/>de controles do módulo)]
        P6 --> P7[Registrar data<br/>de início da auditoria]
    end

    Fase1 --> Fase2

    subgraph Fase2["Fase 2 — Execução da Auditoria"]
        direction TB
        E1[Apresentar próximo controle<br/>código + descrição] --> E2{Classificação}
        E2 -->|Conforme| E3[Registrar<br/>CONFORME]
        E2 -->|Não se Aplica| E4[Registrar NAO_APLICA<br/>+ justificativa]
        E2 -->|Não Conforme| E5{Há trabalho<br/>em andamento?}
        E5 -->|Sim| E6[Registrar EM_ANDAMENTO<br/>+ observação]
        E5 -->|Não| E7[Registrar NAO_CONFORME<br/>+ observação]
        E3 --> E8{Restam<br/>controles?}
        E4 --> E8
        E6 --> E8
        E7 --> E8
        E8 -->|Sim| E1
        E8 -->|Não| E9[(Persistir auditoria<br/>completa)]
    end

    Fase2 --> Fork(( ))

    subgraph Fase3["Fase 3 — Análise (processamento paralelo)"]
        direction TB
        Fork --> A1[Calcular<br/>% conformidade geral]
        Fork --> A2[Agrupar respostas<br/>por tipo de controle]
        Fork --> A3[Recuperar histórico<br/>de até 3 auditorias]
        A1 --> Join(( ))
        A2 --> Join
        A3 --> Join
        Join --> A4[Compor dashboard<br/>+ gráficos pizza/barra]
        A4 --> A5[Exibir dashboard<br/>ao auditor]
    end

    Fase3 --> Fase4

    subgraph Fase4["Fase 4 — Relatórios"]
        direction TB
        R1{Auditor solicita<br/>relatório?}
        R1 -->|Não| R2[Encerrar sessão]
        R1 -->|Sim| R3{Tipo de relatório}
        R3 -->|Atual / Completo| R4[Gerar Relatório<br/>Completo Atual]
        R3 -->|Atual / Por tipo| R5[Gerar Relatório<br/>por Tipo Atual]
        R3 -->|Comparativo| R6{Há ao menos<br/>1 auditoria anterior?}
        R6 -->|Não| R7[/Exibir aviso:<br/>histórico insuficiente/]
        R6 -->|Sim| R8{Comparativo<br/>completo ou por tipo?}
        R8 -->|Completo| R9[Gerar Relatório<br/>Completo Comparativo]
        R8 -->|Por tipo| R10[Gerar Relatório<br/>por Tipo Comparativo]
        R4 --> R11[Exportar / Exibir]
        R5 --> R11
        R9 --> R11
        R10 --> R11
        R7 --> R1
    end

    Fase4 --> Fim([Fim])
    R2 --> Fim
```

**Pontos de atenção do fluxo:**
- A **Fase 3** modela explicitamente o paralelismo entre cálculo de indicadores, agrupamento de dados e recuperação do histórico, operações independentes que podem ocorrer concorrentemente antes da composição do dashboard.
- A **Fase 4** trata a exceção em que o auditor solicita relatório comparativo sem ter histórico suficiente armazenado, retornando o fluxo para o ponto de decisão em vez de quebrar a operação.
- A persistência ocorre **apenas após o fechamento da auditoria** (E9), atendendo ao RNF02 e ao RF16.

---

## Tecnologias

- **Linguagens BackEnd:** Golang, PocketBase, SQLite.
- **Linguagens FrontEnd:** Next.js, React, Tailwind, Shacnui.
- **Envio de e-mail:** API Resend
- **Integração com IA:** Google Gemini API
- **Visualização (gráficos):** Recharts

---

## Referências

- **ABNT NBR ISO/IEC 27002:2022** - *Segurança da informação, segurança cibernética e proteção da privacidade - Controles de segurança da informação.* Rio de Janeiro: ABNT, 2022.

- **ABNT NBR ISO/IEC 27701:2026** - *Segurança da informação, segurança cibernética e proteção da privacidade - Sistemas de gestão da privacidade da informação - Requisitos e orientações.* 2ª edição. Rio de Janeiro: ABNT, 22 jan. 2026. 90 p. ICS 03.100.70; 35.030. Adoção idêntica da ISO/IEC 27701:2025. Cancela e substitui a ABNT NBR ISO/IEC 27701:2020.

---

*Projeto desenvolvido para fins acadêmicos na disciplina de Projeto de Segurança I (PSI) - apresentações nos dias 25 e 26 de maio.*
