# Analise SEO Completa — Eleve Locacoes

## Dados do Negocio

| Item | Valor |
|---|---|
| **Empresa** | Eleve Locacoes |
| **CNPJ** | 04.616.748/0001-74 |
| **Segmento** | Locacao de equipamentos pesados (guindastes, munck, empilhadeiras, carretas, containers) |
| **Regiao** | Presidente Prudente, SP — atuacao em todo o estado de SP |
| **Tech Stack** | Vite 7 + vinext (emula Next.js App Router), React 19, TypeScript, Tailwind CSS 4 |
| **URLs publicas** | `/` (landing), `/servicos`, `/servicos/[categoria]`, `/servicos/[categoria]/[slug]`, `/equipamentos`, `/equipamentos/[tipo]`, `/equipamentos/[tipo]/[slug]` |

---

## 1. SEO Tecnico

### Pontos positivos

- **robots.ts** (`app/robots.ts:5-19`) — bem configurado, bloqueia `/api/`, `/auth/`, `/dashboard/` corretamente
- **sitemap.ts** (`app/sitemap.ts:16-67`) — dinamico com todas as paginas publicas, prioridades bem definidas (home=1.0, hubs=0.9, categorias=0.8, detalhes=0.7)
- **JSON-LD estruturado** — excelente cobertura: `Organization`, `LocalBusiness`, `WebSite`, `BreadcrumbList`, `ItemList`, `Service`, `Product` — implementado em TODAS as paginas publicas
- **Canonical URLs** — presentes em todas as paginas com `alternates.canonical`
- **OpenGraph + Twitter Cards** — implementados em todas as paginas
- **Auth pages com noindex** — `app/auth/layout.tsx` bloqueia indexacao de login/signup
- **Revalidacao** — ISR a cada 3600s (1h) — adequado para conteudo estatico

### Problemas criticos

| Problema | Gravidade | Arquivo |
|---|---|---|
| **Imagens externas (Unsplash)** — todas as imagens usam `images.unsplash.com` como CDN. Isso adiciona dependencia de terceiros, aumenta TTFB, nao aproveita cache do proprio dominio, e o Google nao associa as imagens ao dominio da Eleve no Image Search | **ALTA** | `src/lib/public-site-data.ts:111,130,149,168,187,207,226` e todos os componentes |
| **Imagens hero externas** — as 5 imagens do hero carousel vêm de dominios de terceiros (truck1eu.com.br, euroequipamentos.com.br, alicdn.com, briquerural.com.br, carretaextensiva.com.br) — risco de quebra + lentidao + hotlinking | **ALTA** | `app/landing/site-eleve-landing.tsx:168-174` |
| **Sem `<img width/height>`** — nenhuma imagem declara dimensoes, causando CLS (Layout Shift) | **ALTA** | Todos os componentes de imagem |
| **Sem alt text em imagens OG** — a imagem OG compartilhada usa imagens Unsplash genericas, nao a marca da Eleve | **MEDIA** | `app/page.tsx:42` |
| **`og-image.png` generico no `/public`** — nao esta sendo usado como fallback OG image nas metatags | **MEDIA** | `public/og-image.png` |
| **Trailing slash inconsistente** — sitemap gera URLs sem trailing slash mas a navegacao interna pode gerar duplicatas | **BAIXA** | `app/sitemap.ts` |
| **Sem HTTPS redirect garantido** — depende de infraestrutura, mas o `getPublicSiteBaseUrl()` pode retornar `http://localhost:3000` em producao se env nao estiver configurado | **BAIXA** | `src/lib/public-site-seo.ts:22-26` |
| **`lang="pt-BR"` hardcoded via i18n config** — OK para o publico principal, mas as rotas `/en/` nao trocam o `lang` para `en` | **BAIXA** | `app/layout.tsx:39` |

### Velocidade / Core Web Vitals (estimado por analise de codigo)

| Metrica | Diagnostico |
|---|---|
| **LCP** | Provavelmente **ruim** — hero section carrega 5 imagens externas + 3D crane wireframe (Three.js) + GrainOverlay + animacoes Framer Motion |
| **CLS** | **Ruim** — imagens sem `width/height`, fontes web sem `font-display: swap` (usa `next/font` que ajuda, mas o layout shift dos carouseis e significativo) |
| **FID/INP** | **Moderado** — muito JS no client: Three.js, Framer Motion, AnimatePresence, scroll listeners |
| **Bundle size** | **Pesado** — `@react-three/fiber` + `three` + `framer-motion` para a landing page |

---

## 2. SEO On-Page

### Titles e Meta Descriptions

| Pagina | Title Atual | Problema | Sugestao |
|---|---|---|---|
| Home | `Eleve Locacoes \| Locacao de guindastes, munck e transporte especial` | **Bom** — mas poderia incluir localidade | `Eleve Locacoes \| Locacao de Guindastes em Presidente Prudente e SP` |
| /servicos | `Servicos \| Eleve Locacoes` | **Generico** — nao tem palavra-chave | `Servicos de Locacao de Equipamentos Pesados \| Eleve Locacoes` |
| /equipamentos | `Equipamentos \| Eleve Locacoes` | **Generico** — nao tem palavra-chave | `Equipamentos para Locacao — Guindastes, Munck, Empilhadeiras \| Eleve` |
| /servicos/locacoes | `Locacoes \| Servicos \| Eleve Locacoes` | **OK** — mas nao indica o que e locacao | `Locacao de Equipamentos Pesados \| Eleve Locacoes` |
| /servicos/locacoes/guindastes | `Locacoes de Guindastes \| Eleve Locacoes` | **Bom** | Manter + adicionar "Presidente Prudente" |
| /equipamentos/guindastes/md-250-25-ton | `Guindaste MD 250 25 ton \| Eleve Locacoes` | **Bom** | `Locacao de Guindaste MD 250 (25 ton) — Presidente Prudente \| Eleve` |

### Meta Description — Problemas

A meta description da home em `public-site-data.ts:45-46`:
> "Locacao de guindastes, munck, empilhadeiras, containers e transporte especial para operacoes industriais e civis."

**Problema:** 136 caracteres — pode ser mais rica. Faltam: cidade, CTA, diferencial.

**Sugestao otimizada (155 chars):**
> "Eleve Locacoes: locacao de guindastes (25 a 130 ton), munck, empilhadeiras e transporte especial em Presidente Prudente e todo SP. Solicite um orcamento."

### Headings (H1, H2, H3)

**Home (`site-eleve-landing.tsx`):**
- H1: "Elevacao e movimentacao de precisao." — **ruim para SEO**. Nao contem nenhuma palavra-chave principal como "locacao de guindastes" ou "equipamentos pesados"
  - **Sugestao:** "Locacao de Guindastes e Equipamentos Pesados em Presidente Prudente"
- H2: "Nossos servicos", "Equipamentos em destaque", "Sobre a Eleve Locacoes", "O que dizem nossos clientes" — **bons**, mas poderia incluir palavras-chave como "Locacao de Equipamentos", "Frota de Guindastes e Munck"
- **Sem H3** — os feature cards da secao "Sobre" usam H3 adequadamente

**Paginas de detalhe (servicos/equipamentos):**
- H1 usa o nome do servico/equipamento — **bom**
- H2: "Sobre este servico", "Informacoes tecnicas" — **generico**, poderia ser "Locacao de Guindastes: Sobre o Servico"
- Falta H3 para quebrar o conteudo em subtopicos

### Conteudo

| Problema | Detalhe |
|---|---|
| **Conteudo raso** | Cada servico/equipamento tem ~150-200 palavras. Para rankear em termos competitivos como "locacao de guindastes", o Google espera 800-1500 palavras com profundidade tecnica |
| **Sem formatacao rica** | O conteudo e renderizado como paragrafos genericos (`renderParagraphs` divide por `\n\n`). Faltam: listas, tabelas de especificacao, FAQ, casos de uso |
| **Sem acentuacao consistente** | Textos com erros: "cenario" em vez de "cenario", "operacao" em vez de "operacao", "dimensoes" em vez de "dimensoes" — `public-site-data.ts:109,128,147,166,185,205,224` |
| **Sem blog/artigos** | Nenhuma pagina de conteudo informacional — enorme oportunidade perdida |
| **Depoimentos genericos** | Sem empresa/cidade/projeto real nos depoimentos — parecem fabricados |

### Links Internos

| Achado | Diagnostico |
|---|---|
| Links entre servicos relacionados | **Presente** — "Outros servicos" na pagina de detalhe |
| Links entre equipamentos relacionados | **Presente** — "Outros equipamentos" + "Servicos" na pagina de equipamento |
| Links contextuais no conteudo | **Ausente** — nenhum link inline no body text |
| Breadcrumbs visuais | **Ausente** — so existe no JSON-LD, nao no HTML visivel |
| Footer com links para secoes | **Presente** — "Acesso rapido" no footer |

---

## 3. SEO Off-Page

| Fator | Status |
|---|---|
| **Autoridade do dominio** | Provavelmente **baixa** — site novo, sem backlinks, sem presenca digital estabelecida |
| **Redes sociais** | `facebookUrl`, `instagramUrl`, `linkedinUrl` — **todos `null`** em `public-site-data.ts:41-43`. Nenhum perfil social configurado |
| **Google Business Profile** | **Ausente** — nao ha mencao a verificacao de perfil no Google Meu Negocio |
| **Backlinks** | **Zero** — nao ha estrategia de link building visivel no codigo |

---

## 4. SEO Local

### Diagnostico: CRITICO

| Item | Status | Acao |
|---|---|---|
| **Cidade nas metatags** | **AUSENTE** — title e description da home nao mencionam "Presidente Prudente" | Adicionar em todos os titles |
| **Cidade no H1** | **AUSENTE** — H1 da home e "Elevacao e movimentacao de precisao" | Trocar para incluir localidade |
| **Google Business Profile** | **NAO VERIFICADO** | Criar/verificar perfil com CNPJ 04.616.748/0001-74 |
| **NAP inconsistente** | Endereco completo no footer, mas city/state separados no JSON-LD (`addressLocality: "Presidente Prudente"`, `addressRegion: "SP"`) — **bom**, mas faltam `geo.coordinates` | Adicionar latitude/longitude |
| **`areaServed` no JSON-LD** | **Presente** — `public-site-data.ts:52` com `["Sao Paulo", "Grande Sao Paulo", "Interior de SP"]` | **Problema:** faltam acentos ("Sao Paulo") e a cidade-base "Presidente Prudente" |
| **Paginas por cidade** | **Ausente** — enorme oportunidade para criar `/locacao-guindastes-presidente-prudente`, `/locacao-guindastes-sao-paulo`, etc. | Criar landing pages por cidade |
| **Schema `LocalBusiness`** | Presente, mas sem `geo`, sem `openingHours`, sem `priceRange` | Completar o schema |

---

## 5. SEO para Conversao

### Proposta de Valor

| Elemento | Avaliacao |
|---|---|
| **Headline do hero** | "Elevacao e movimentacao de precisao" — **generica**, nao comunica diferencial claro. Nao menciona o que a empresa FAZ (locacao) |
| **Sub-headline** | "Solucoes premium em locacao de guindastes, empilhadeiras e transporte pesado" — **boa**, mas "premium" e subjetivo |
| **Stats** | 10+ anos, 2000+ operacoes, 130t capacidade — **excelente** para confianca, mas sem fonte/comprovacao |

### CTAs

| CTA | Localizacao | Avaliacao |
|---|---|---|
| "Solicitar orcamento" (WhatsApp) | Hero, navbar, footer, paginas de detalhe | **Bom** — direto e acionavel |
| "Ver categoria" / "Ver pagina" | Cards de servico/equipamento | **Generico** — "Ver detalhes e valores" converteria mais |
| **Sem formulario de contato** | — | **Falta grave** — nem todos querem WhatsApp imediato |
| **Sem telefone clicavel** | Footer tem link para WhatsApp mas nao `tel:` | Adicionar `tel:+5518997766064` |

### Prova Social / Confianca

| Elemento | Status |
|---|---|
| **Depoimentos** | Presentes, mas sem foto, sem empresa, sem projeto especifico — **fraco** |
| **CNPJ no footer** | Presente — **bom** para confianca |
| **Certificacoes** | **Ausente** — ISO, NR-11, NR-35 nao mencionadas (essenciais no segmento) |
| **Portfolio/cases** | **Ausente** — enorme oportunidade |
| **Selos/garantias** | **Ausente** |

---

## 6. Palavras-Chave

### Principais (transacional)

| Palavra-chave | Volume estimado | Dificuldade | Pagina alvo |
|---|---|---|---|
| locacao de guindastes | Alto | Alta | Home + `/servicos/locacoes/guindastes` |
| locacao de munck | Alto | Media | `/servicos/locacoes/munck` |
| locacao de empilhadeiras | Medio | Media | `/servicos/locacoes/empilhadeiras` |
| aluguel de guindaste | Medio | Alta | Home |
| transporte de carga superdimensionada | Baixo | Baixa | `/servicos/operacoes-especiais/transporte-de-cargas-especiais-e-superdimensionadas-com-escolta` |

### Secundarias (comercial)

| Palavra-chave | Pagina alvo |
|---|---|
| guindaste 25 toneladas locacao | `/equipamentos/guindastes/md-250-25-ton` |
| guindaste 75 toneladas | `/equipamentos/guindastes/br750-75-ton` |
| guindaste 130 toneladas | `/equipamentos/guindastes/qy130k-130-ton` |
| locacao de container 6 metros | `/equipamentos/containers/container-6-metros` |
| carreta extensiva locacao | `/equipamentos/guinchos-e-carretas/carreta-extensiva` |
| plano rigging | `/servicos/operacoes-especiais/plano-rigging` |
| locacao de carreta prancha | `/equipamentos/guinchos-e-carretas/caminhao-prancha` |

### Long-tail (informacional — para blog)

| Palavra-chave | Intentao |
|---|---|
| como escolher guindaste para obra | Informacional |
| diferenca entre guindaste e munck | Informacional |
| o que e plano rigging | Informacional |
| transporte de carga superdimensionada legislacao | Informacional |
| quanto custa locacao de guindaste | Comercial |
| empilhadeira para obra civil qual escolher | Informacional |
| nr-11 operacao de guindaste requisitos | Informacional |
| locacao de guindaste presidente prudente | Transacional/local |

### Cauda longa por intencao

**Informacional (blog):**
- "como funciona locacao de guindastes"
- "quando usar munck vs guindaste"
- "o que e e para que serve um plano de rigging"
- "tipos de carreta para transporte especial"
- "empilhadeira triplex o que e"

**Comercial (paginas de servico):**
- "locacao de guindaste 25 ton sp"
- "munck mercedes locacao interior paulista"
- "carreta extensiva aluguel sao paulo"

**Transacional (landing pages):**
- "solicitar orcamento guindaste presidente prudente"
- "aluguel empilhadeira pronto entrega sp"
- "locacao container obra"

---

## 7. Plano de Acao

### PRIORIDADE ALTA (impacto imediato)

| # | Acao | Arquivo | Impacto |
|---|---|---|---|
| 1 | **Trocar H1 da home** de "Elevacao e movimentacao de precisao" para "Locacao de Guindastes e Equipamentos Pesados em Presidente Prudente — SP" | `app/landing/site-eleve-landing.tsx:296-305` | SEO + CTR |
| 2 | **Adicionar "Presidente Prudente — SP" nos titles e descriptions** de TODAS as paginas | `src/lib/public-site-data.ts` + todos os `page.tsx` | SEO local |
| 3 | **Hospedar imagens localmente** — baixar todas do Unsplash para `/public/images/` e atualizar referencias | `src/lib/public-site-data.ts` + `site-eleve-landing.tsx:168-174` | Velocidade + Image SEO |
| 4 | **Adicionar `width` e `height`** em todas as tags `<img>` | Todos os componentes | CLS |
| 5 | **Corrigir erros de acentuacao** nos textos — "cenario", "operacao", "dimensoes", etc. | `src/lib/public-site-data.ts:109,128,147,166,185,205,224` e todos os `pageContent` | Qualidade |
| 6 | **Completar JSON-LD LocalBusiness** com `geo`, `openingHours`, `priceRange` | `src/lib/public-site-seo.ts:75-105` | SEO local |
| 7 | **Configurar redes sociais** — preencher `facebookUrl`, `instagramUrl`, `linkedinUrl` em `PUBLIC_COMPANY` | `src/lib/public-site-data.ts:41-43` | Off-page + confianca |

### PRIORIDADE MEDIA

| # | Acao | Detalhe |
|---|---|---|
| 8 | **Criar breadcrumbs visuais** em HTML (nao so JSON-LD) nas paginas de categoria e detalhe | Auxilia navegacao + SEO |
| 9 | **Adicionar formulario de contato** — nem todos querem WhatsApp | Aumentar conversao |
| 10 | **Profundizar conteudo** das paginas de servico/equipamento para 800-1500 palavras com tabelas de specs, casos de uso, FAQ | Ranking em head terms |
| 11 | **Lazy load do Three.js** — ja e lazy (`React.lazy`), mas considerar remover o wireframe 3D do hero em mobile | Core Web Vitals |
| 12 | **Adicionar `<link rel="preconnect">` para fontes Google** | Reduz FCP |
| 13 | **Otimizar title tags** — incluir termo "locacao" + cidade em todas as paginas | CTR + ranking |
| 14 | **Adicionar `loading="eager"` + `fetchpriority="high"` na primeira imagem do hero** | LCP |
| 15 | **Adicionar pagina `/sobre`** separada com historia da empresa, certificacoes, equipe | E-E-A-T |

### PRIORIDADE BAIXA

| # | Acao | Detalhe |
|---|---|---|
| 16 | **Criar blog** com artigos sobre o segmento | Trafego informacional de cauda longa |
| 17 | **Landing pages por cidade** — `/locacao-guindastes-presidente-prudente`, etc. | SEO local escalavel |
| 18 | **Adicionar FAQ com schema** nas paginas de servico | Rich snippets |
| 19 | **Implementar `<link rel="alternate" hreflang>`** se for manter rotas `/en/` | SEO internacional |
| 20 | **Adicionar videos** das operacoes (YouTube embed com schema `VideoObject`) | Rich snippets + engajamento |

---

## 8. Oportunidades

### Conteudos para Criar

| Pagina/Tipo | Palavra-chave alvo | Prioridade |
|---|---|---|
| **Blog: "Como escolher o guindaste ideal para sua obra"** | como escolher guindaste | Alta |
| **Blog: "Guindaste vs Munck: quando usar cada um"** | diferenca guindaste munck | Alta |
| **Blog: "O que e Plano Rigging e quando e obrigatorio"** | plano rigging o que e | Alta |
| **Blog: "Transporte de carga superdimensionada: guia completo"** | transporte carga superdimensionada | Media |
| **Pagina: /sobre-a-eleve** | eleve locacoes | Media |
| **Pagina: /locacao-guindastes-presidente-prudente** | locacao guindaste presidente prudente | Alta |
| **Pagina: /locacao-guindastes-sao-paulo** | locacao guindaste sao paulo | Alta |
| **Pagina: /cases** | Cases de sucesso com guindastes | Media |
| **FAQ por servico** | Perguntas sobre locacao de cada equipamento | Media |
| **Pagina: /nr-11-nr-35-seguranca** | nr11 guindaste requisitos | Baixa |

### Estrategias para Trafego Rapido

1. **Google Business Profile** — criar e verificar imediatamente. Para "locacao de guindastes presidente prudente", o GBP aparece no topo do results
2. **Google Meu Negocio com posts semanais** — fotos de operacoes reais, ofertas de locacao
3. **Paginas de cidade** — criar 5-10 landing pages para as maiores cidades de SP com conteudo unico
4. **Schema FAQ** — adicionar nas paginas de servico. FAQ rich snippets aumentam CTR em 20-30%
5. **Imagens proprias no Google Images** — hospedar fotos reais com alt text otimizado

### Diferenciais Competitivos

| Diferencial | Como explorar |
|---|---|
| **Frota de 25 a 130 ton** | Criar pagina "Catalogo completo de capacidades" com tabela comparativa |
| **10+ anos de mercado** | Pagina "Sobre" com timeline, projetos emblematicos |
| **2000+ operacoes** | Criar secao "Cases" com fotos reais e depoimentos detalhados |
| **Presidente Prudente** (pouca concorrencia local) | Dominar buscas locais — "locacao de guindastes [cidade do interior de SP]" |
| **Plano Rigging** (servico especializado) | Pagina dedicada com depth tecnico — few competitors have this |
| **Transporte com escolta** (niche) | Conteudo depth sobre legislacao, processo, cases reais |

---

## Resumo Executivo

**Score SEO geral estimado: 45/100**

| Dimensao | Score | Diagnostico |
|---|---|---|
| Tecnico | 65/100 | Boa base (sitemap, robots, JSON-LD), mas imagens externas e CWV ruins |
| On-Page | 40/100 | Titles genericos, H1 sem keyword, conteudo raso, erros de ortografia |
| Off-Page | 10/100 | Zero backlinks, sem redes sociais, sem GBP |
| Local | 25/100 | JSON-LD tem dados mas titulos/conteudo nao mencionam cidade |
| Conversao | 50/100 | CTAs presentes, mas sem formulario, sem cases reais, depoimentos fracos |

**Top 3 acoes que vao gerar 80% do impacto:**
1. **Otimizar titles + H1 + descriptions com "locacao de [equipamento] + Presidente Prudente — SP"** — impacto imediato em CTR e ranking local
2. **Criar e verificar Google Business Profile** — aparece no topo de buscas locais sem precisar de conteudo
3. **Hospedar imagens localmente e adicionar dimensoes** — melhora LCP e CLS significativamente

---

## Checklist de Implementacao

### Alta Prioridade
- [ ] Trocar H1 da home para incluir keyword + cidade
- [ ] Adicionar "Presidente Prudente — SP" nos titles de todas as paginas
- [ ] Adicionar cidade nas meta descriptions
- [ ] Baixar imagens do Unsplash e hospedar localmente em `/public/images/`
- [ ] Atualizar referencias de imagens hero externas
- [ ] Adicionar `width` e `height` em todas as tags `<img>`
- [ ] Corrigir erros de acentuacao em `public-site-data.ts`
- [ ] Completar JSON-LD LocalBusiness (geo, openingHours, priceRange)
- [ ] Configurar URLs de redes sociais em `PUBLIC_COMPANY`
- [ ] Adicionar "Presidente Prudente" em `areaServed` no JSON-LD

### Media Prioridade
- [ ] Criar breadcrumbs visuais em HTML nas paginas de categoria e detalhe
- [ ] Adicionar formulario de contato
- [ ] Profundizar conteudo das paginas de servico/equipamento (800-1500 palavras)
- [ ] Adicionar `loading="eager"` + `fetchpriority="high"` na primeira imagem do hero
- [ ] Adicionar `<link rel="preconnect">` para fontes
- [ ] Criar pagina `/sobre` separada
- [ ] Otimizar title tags com termo "locacao" + cidade

### Baixa Prioridade
- [ ] Criar blog com artigos tecnicos
- [ ] Criar landing pages por cidade
- [ ] Adicionar FAQ com schema nas paginas de servico
- [ ] Implementar hreflang para multi-idioma
- [ ] Adicionar videos com schema VideoObject
