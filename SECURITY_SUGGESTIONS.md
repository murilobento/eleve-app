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

## 9. Achados adicionais para correcao futura

> Revisao adicional em 2026-04-11.
> Objetivo: registrar pontos para backlog de hardening e validacao manual.

### 9.1 Promocao automatica do primeiro usuario para admin

**Severidade:** Alta

**Evidencia:** `src/lib/auth.ts:125`

O hook `databaseHooks.user.create.before` promove automaticamente o primeiro usuario criado para `admin`.

**Impacto:** qualquer fluxo inesperado de bootstrap ou criacao inicial de conta pode resultar em concessao de privilegio maximo.

**Correcao sugerida:** substituir a promocao automatica por bootstrap controlado via seed, script administrativo ou configuracao operacional explicitamente autorizada.

### 9.2 Protecao fraca no middleware de paginas

**Severidade:** Media/Alta

**Evidencia:** `proxy.ts:19`, `proxy.ts:34`

O `proxy` trata a pagina como autenticada apenas pela presenca do cookie `better-auth.session_token`, sem validar sessao nem permissao.

**Impacto:** a camada edge pode permitir acesso inicial a paginas/estados intermediarios que depois dependem da camada cliente ou das APIs para negar acesso.

**Correcao sugerida:** validar sessao real no servidor para rotas protegidas ou deixar explicito que o middleware faz apenas um gate preliminar e nao substitui autorizacao server-side.

### 9.3 CSP pouco efetiva por padrao

**Severidade:** Media

**Evidencia:** `src/lib/security-headers.ts:5`, `src/lib/security-headers.ts:12`, `src/lib/security-headers.ts:23`

Em producao, a politica padrao e `report-only`; em desenvolvimento, `off`. Alem disso, `style-src` permite `'unsafe-inline'`.

**Impacto:** a aplicacao fica menos protegida contra XSS e regressa para um perfil de monitoramento em vez de bloqueio efetivo.

**Correcao sugerida:** revisar dependencias do frontend, reduzir fontes inline quando possivel e planejar migracao gradual para `Content-Security-Policy` em modo `enforce`.

### 9.4 Rate limit em memoria

**Severidade:** Media

**Evidencia:** `src/lib/auth.ts:107`, `src/lib/rate-limit.ts:30`

O rate limit do Better Auth e o helper customizado usam armazenamento em memoria local.

**Impacto:** em multi-instancia, restart ou ambiente serverless, o controle pode ser inconsistente e mais facil de contornar.

**Correcao sugerida:** mover o armazenamento para backend compartilhado, como Redis, quando a topologia deixar de ser `single instance`.

### 9.5 Dados locais expostos a XSS via localStorage

**Severidade:** Media

**Evidencia:** `src/lib/lockscreen.ts:2`, `app/(dashboard)/layout.tsx:79`, `app/(dashboard)/layout.tsx:80`, `app/(dashboard)/layout.tsx:110`

A interface grava email do usuario, timestamps de atividade e estado de lock em `localStorage`.

**Impacto:** qualquer XSS com execucao no browser consegue ler esses dados imediatamente.

**Correcao sugerida:** minimizar dados persistidos no navegador, evitar gravar identificadores desnecessarios e preferir mecanismos menos expostos quando possivel.

### 9.6 Logging de seguranca com metadados sensiveis

**Severidade:** Media

**Evidencia:** `src/lib/security-events.ts:27`

Os eventos de seguranca registram `userId`, IP, `path`, `origin` e `details` arbitrarios.

**Impacto:** melhora auditoria, mas exige controle de retencao, destino, acesso e cuidado para nao vazar contexto operacional em logs.

**Correcao sugerida:** definir politica de retencao e acesso aos logs, revisar os campos permitidos em `details` e garantir mascaramento quando necessario.

### 9.7 Endpoints amplos com potencial de overfetching

**Severidade:** Media

**Evidencia:** `app/api/service-orders/route.ts:29`

O endpoint retorna dados principais e varias listas auxiliares no mesmo payload: `serviceOrders`, `clients`, `equipment`, `serviceTypes`, `operators` e `approvedBudgets`.

**Impacto:** aumenta a superficie de exposicao de dados e dificulta aplicar minimo privilegio por caso de uso.

**Correcao sugerida:** separar consultas por contexto de tela ou reduzir o payload aos dados estritamente necessarios.

## 10. Validacoes manuais recomendadas

1. Confirmar flags reais do cookie de sessao em runtime: `HttpOnly`, `Secure`, `SameSite`, dominio e expiracao.
2. Testar IDOR/BOLA nas rotas `/api/*/[id]`, especialmente em usuarios, budgets, service-orders e requisicoes.
3. Inspecionar headers HTTP reais para verificar CSP, cookies e politicas de seguranca efetivas.
4. Validar o comportamento do `proxy` com cookie invalido, expirado ou forjado.
5. Revisar se os payloads agregados das APIs podem ser reduzidos por endpoint e permissao.
