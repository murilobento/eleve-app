# Sugestoes de Seguranca — Eleve App

> Documento revisado em 2026-04-06.
> Referencias: OWASP Top 10:2025 RC1, Better Auth 1.5.6.

## Resumo

As recomendacoes abaixo refletem o estado atual do codigo e o que foi implementado nesta rodada.
O foco desta entrega foi endurecer autenticacao, reduzir abuso em endpoints de lookup, padronizar headers basicos e registrar eventos de seguranca com baixo risco de regressao.

## 1. Auth, segredos e origens confiaveis

**Status:** Implementado

A aplicacao agora:

- exige `BETTER_AUTH_SECRET` em producao
- exige `DATABASE_URL` em producao
- resolve `baseURL` a partir de `BETTER_AUTH_URL` ou `NEXT_PUBLIC_APP_URL`
- calcula `trustedOrigins` com base no dominio principal e na variavel `BETTER_AUTH_TRUSTED_ORIGINS`
- explicita a configuracao de rate limit do Better Auth
- explicita os headers usados para descoberta de IP no Better Auth

### Variaveis relevantes

```env
BETTER_AUTH_URL=https://app.exemplo.com
NEXT_PUBLIC_APP_URL=https://app.exemplo.com
BETTER_AUTH_TRUSTED_ORIGINS=https://staging.exemplo.com
```

## 2. Headers de seguranca e CSP

**Status:** Parcialmente implementado

O `proxy.ts` agora aplica headers base em todas as respostas que passam por ele:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

A CSP foi introduzida com rollout controlado por ambiente:

- `SECURITY_CSP_MODE=off`
- `SECURITY_CSP_MODE=report-only`
- `SECURITY_CSP_MODE=enforce`

### Decisao de rollout

A policy nao entra direto em bloqueio porque o frontend atual usa:

- Google Fonts
- imagens remotas via `https:`
- chamadas para `viacep.com.br`
- chamadas para `brasilapi.com.br`
- estilos inline necessarios para partes do UI atual

Por isso, o modo recomendado para producao inicial e `report-only`.

## 3. Rate limiting

**Status:** Implementado de forma direcionada

### Better Auth

O Better Auth ja possui rate limiting nativo para rotas de autenticacao. A aplicacao agora deixa essa configuracao explicita, com regra customizada para `sign-in/email`.

### Endpoints customizados

Foi adicionado rate limiting em memoria para endpoints que acionam servicos externos:

- CEP: 20 requisicoes por minuto por usuario
- CNPJ/documento: 10 requisicoes por minuto por usuario

Endpoints cobertos:

- `/api/budgets/postal-code`
- `/api/clients/postal-code`
- `/api/company/postal-code`
- `/api/suppliers/postal-code`
- `/api/clients/document`
- `/api/company/cnpj`
- `/api/suppliers/document`

### Observacao operacional

A implementacao atual usa store em memoria e assume deploy `single instance`. Para topologia serverless ou multi-instance, a proxima etapa e mover esse controle para armazenamento compartilhado.

## 4. CSRF e origin checks

**Status:** Mantido via Better Auth

Nenhuma camada manual de CSRF foi adicionada.

A estrategia atual e manter as protecoes do Better Auth habilitadas por padrao:

- `disableCSRFCheck` nao foi habilitado
- `disableOriginCheck` nao foi habilitado
- `trustedOrigins` foi endurecido

Isso evita duplicar protecao com outra implementacao concorrente.

## 5. SQL parametrizado

**Status:** Implementado

A funcao `listSupplierOptions` deixou de interpolar SQL dinamico e agora usa queries explicitas parametrizadas.

O risco anterior era baixo porque o valor vinha de booleano interno, mas a mudanca melhora consistencia e reduz chance de regressao futura.

## 6. Logging e monitoramento

**Status:** Implementado

Foi adicionado logging estruturado de eventos de seguranca em JSON, sem registrar segredos nem payloads sensiveis.

Eventos cobertos nesta entrega:

- login bem-sucedido
- login falho
- login bloqueado por inatividade
- tentativa de signup publico bloqueada
- rate limit excedido em login
- acesso sem sessao
- acesso negado por inatividade
- acesso negado por permissao
- criacao, edicao, reset de senha e remocao de usuarios
- criacao, edicao e remocao de roles
- rate limit excedido em endpoints de lookup

## 7. Dependencias

**Status:** Pendente de normalizacao operacional

O repositorio possui multiplos lockfiles versionados:

- `package-lock.json`
- `pnpm-lock.yaml`
- `bun.lock`

Nesta rodada nao houve consolidacao do gerenciador oficial do projeto. Para auditoria automatica, a recomendacao imediata e usar o lockfile canonicamente adotado pela equipe e padronizar isso antes de adicionar verificacoes obrigatorias no CI.

## 8. Proximas etapas recomendadas

1. Rodar CSP em `report-only` em producao e revisar violacoes antes de migrar para `enforce`.
2. Consolidar o gerenciador de pacotes oficial do repositorio.
3. Se o deploy deixar de ser `single instance`, mover rate limiting para Redis ou camada equivalente.
4. Avaliar HSTS apenas depois de confirmar dominio unico em HTTPS e politica de subdominios.
