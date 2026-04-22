import type {
  ManagedPublicCompany,
  ManagedPublicEquipment,
  ManagedPublicService,
  ManagedPublicTestimonial,
  PublicSiteContent,
} from "@/lib/public-site-admin";

type PublicServiceCategory = {
  slug: string;
  title: string;
  description: string;
};

type PublicEquipmentCategory = {
  slug: string;
  title: string;
  description: string;
};

type PublicServiceEntry = ManagedPublicService & {
  categorySlug: string;
  pageContent: string;
};

type PublicEquipmentEntry = ManagedPublicEquipment & {
  categorySlug: string;
  pageContent: string;
};

const STATIC_CREATED_AT = "2026-04-22T00:00:00.000Z";
const STATIC_UPDATED_AT = "2026-04-22T00:00:00.000Z";

const PUBLIC_COMPANY: ManagedPublicCompany = {
  id: "company-eleve",
  name: "Eleve Locações",
  cnpj: "",
  phone: "(11) 4000-1234",
  email: "contato@eleve.com.br",
  address: "Av. Indústrial, 1200 - Bloco A, Sao Paulo - SP",
  facebookUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
  seoTitle: "Eleve Locações | Locação de guindastes, munck e transporte especial",
  seoDescription:
    "Locação de guindastes, munck, empilhadeiras, containers e transporte especial para operações indústriais e civis.",
  legalName: "Eleve Locações",
  streetAddress: "Av. Indústrial, 1200 - Bloco A",
  addressLocality: "Sao Paulo",
  addressRegion: "SP",
  postalCode: null,
  serviceÁreas: ["Sao Paulo", "Grande Sao Paulo", "Interior de SP"],
  createdAt: STATIC_CREATED_AT,
  updatedAt: STATIC_UPDATED_AT,
};

const PUBLIC_SERVICE_CATEGORIES: PublicServiceCategory[] = [
  {
    slug: "locacoes",
    title: "Locações",
    description: "Locação de equipamentos para elevação, movimentação e apoio logístico.",
  },
  {
    slug: "operacoes-especiais",
    title: "Operações Especiais",
    description: "Planejamento e execução de operações de alta complexidade e carga especial.",
  },
];

const PUBLIC_EQUIPMENT_CATEGORIES: PublicEquipmentCategory[] = [
  {
    slug: "guindastes",
    title: "Guindastes",
    description: "Linha de guindastes para operações de elevação em diferentes capacidades.",
  },
  {
    slug: "munck",
    title: "Munck",
    description: "Caminhoes munck para carga, descarga e movimentação com agilidade em campo.",
  },
  {
    slug: "empilhadeiras",
    title: "Empilhadeiras",
    description: "Empilhadeira para operações logísticas e suporte a patios e armazens.",
  },
  {
    slug: "guinchos-e-carretas",
    title: "Guinchos e Carretas",
    description: "Plataformas e carretas para transporte especial e cargas superdimensionadas.",
  },
  {
    slug: "containers",
    title: "Containers",
    description: "Containers para apoio operacional em obras e operações temporárias.",
  },
];

const PUBLIC_SERVICES: PublicServiceEntry[] = [
  {
    id: "service-locações-guindastes",
    slug: "locacoes/guindastes",
    tag: "Locações",
    title: "Locações de Guindastes",
    description: "Locação de guindastes para operações de elevação com segurança e produtividade.",
    seoTitle: "Locações de Guindastes | Eleve Locações",
    seoDescription:
      "Locações de guindastes para obras civis e indústriais com equipe técnica e planejamento operacional.",
    pageContent:
      "Executamos locações de guindastes para operações de montagem indústrial, apoio a obras civis e movimentação de cargas de grande porte. Cada atendimento considera estudo de acesso, dimensionamento da capacidade e estratégia de posicionamento para reduzir risco operacional.\n\nNossa equipe oferece suporte desde o planejamento ate a execução, com foco em segurança, prazo e estabilidade da operação. Trabalhamos com frota preparada para cenarios de curta, media e longa duracao, com solucoes adequadas ao perfil de cada obra.",
    imageAlt: "Locação de guindaste em operação de elevação de carga",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 10,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "locacoes",
  },
  {
    id: "service-locações-munck",
    slug: "locacoes/munck",
    tag: "Locações",
    title: "Locações de Munck",
    description: "Locação de munck para carga e descarga com rapidez em campo.",
    seoTitle: "Locações de Munck | Eleve Locações",
    seoDescription:
      "Locações de munck para movimentação de equipamentos, estruturas e cargas em ambientes indústriais e urbanos.",
    pageContent:
      "As locações de munck atendem demandas de carga e descarga, movimentação de equipamentos e apoio a montagens em áreas com necessidade de resposta rápida. Nossa operação combina experiência de campo com orientacao técnica para posicionamento e amarracao de carga.\n\nCom frota adequada para diferentes cenarios, entregamos produtividade em operações urbanas e indústriais, com controle de risco e execução dentro do cronograma previsto.",
    imageAlt: "Caminhão munck realizando movimentação de carga",
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 20,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "locacoes",
  },
  {
    id: "service-locações-guinchos-carretas",
    slug: "locacoes/guinchos-e-carretas",
    tag: "Locações",
    title: "Locações de Guinchos e Carretas",
    description: "Locação de guinchos e carretas para transporte técnico e suporte logístico pesado.",
    seoTitle: "Locações de Guinchos e Carretas | Eleve Locações",
    seoDescription:
      "Locações de guinchos e carretas para movimentação de cargas especiais, equipamentos e estruturas de grande porte.",
    pageContent:
      "Oferecemos locações de guinchos e carretas para operações que exigem controle logístico, escolha correta de implemento e execução segura do transporte. Atendemos movimentação de máquinas, estruturas metalicas e componentes indústriais com planejamento de rota e apoio técnico.\n\nA selecao de equipamento e feita conforme peso, dimensoes e condições de acesso, garantindo eficiencia operacional e conformidade com requisitos de cada projeto.",
    imageAlt: "Carreta prancha transportando carga especial",
    imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 30,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "locacoes",
  },
  {
    id: "service-locações-empilhadeiras",
    slug: "locacoes/empilhadeiras",
    tag: "Locações",
    title: "Locações de Empilhadeiras",
    description: "Locação de empilhadeiras para patios, armazens e operações internas de movimentação.",
    seoTitle: "Locações de Empilhadeiras | Eleve Locações",
    seoDescription:
      "Locações de empilhadeiras para suporte logístico em operações indústriais, armazenagem e distribuicao.",
    pageContent:
      "As locações de empilhadeiras da Eleve apoiam processos de armazenagem, movimentação interna e expedicao de cargas. Trabalhamos com equipamentos preparados para operação continua, com foco em disponibilidade e produtividade no dia a dia logístico.\n\nNosso suporte operacional ajuda no dimensionamento da solução para cada ambiente, considerando fluxo de carga, tipo de material e metas de performance.",
    imageAlt: "Empilhadeira em operação de movimentação de pallets",
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 40,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "locacoes",
  },
  {
    id: "service-locações-containers",
    slug: "locacoes/containers",
    tag: "Locações",
    title: "Locações de Containers",
    description: "Locação de containers para apoio de obras, armazenagem e bases operacionais temporárias.",
    seoTitle: "Locações de Containers | Eleve Locações",
    seoDescription:
      "Locações de containers para obras e operações temporárias com praticidade, agilidade e suporte técnico.",
    pageContent:
      "Realizamos locações de containers para apoio de canteiros, armazenagem de materiais e estruturacao de pontos operacionais temporarios. A solução e indicada para empresas que precisam de flexibilidade na implantação e baixo tempo de mobilizacao.\n\nTrabalhamos com planejamento logístico de entrega e retirada, garantindo previsibilidade para manter a operação em andamento sem interrupcoes.",
    imageAlt: "Container utilizado para apoio operacional",
    imageUrl: "https://images.unsplash.com/photo-1565623190098-4f8f07f7784c?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 50,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "locacoes",
  },
  {
    id: "service-transporte-cargas-especiais",
    slug: "operacoes-especiais/transporte-de-cargas-especiais-e-superdimensionadas-com-escolta",
    tag: "Operações Especiais",
    title: "Transporte de cargas especiais e superdimensionadas com escolta",
    description:
      "Transporte técnico de cargas especiais com escolta e planejamento de rota para alta complexidade.",
    seoTitle: "Transporte de cargas especiais e superdimensionadas com escolta | Eleve Locações",
    seoDescription:
      "Execução de transporte de cargas especiais e superdimensionadas com escolta, análise de rota e controle operacional.",
    pageContent:
      "Atuamos no transporte de cargas especiais e superdimensionadas com escolta, integrando planejamento técnico, avaliacao de rota e controle operacional ponta a ponta. A operação considera limitacoes viarias, pontos criticos e requisitos de segurança para cada etapa do deslocamento.\n\nNosso modelo de execução reduz risco de atraso e amplia a previsibilidade do projeto, com comunicacao clara entre equipe de campo, cliente e parceiros de apoio.",
    imageAlt: "Transporte especial de carga superdimensionada com escolta",
    imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 60,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "operacoes-especiais",
  },
  {
    id: "service-plano-rigging",
    slug: "operacoes-especiais/plano-rigging",
    tag: "Operações Especiais",
    title: "Plano Rigging",
    description: "Elaboracao de plano rigging para operações de elevação com engenharia aplicada.",
    seoTitle: "Plano Rigging | Eleve Locações",
    seoDescription:
      "Plano rigging para operações de elevação com memória técnica, análise de risco e estratégia de execução.",
    pageContent:
      "Desenvolvemos plano rigging para operações que exigem alto nivel de controle técnico, com definicao de estratégia de elevação, memória de calculo e orientacoes de segurança. O processo considera caracteristicas da carga, geometria do local e condições reais de execução.\n\nCom o plano rigging, a operação ganha previsibilidade, reduz exposicao a falhas e melhora a tomada de decisao antes da mobilizacao em campo.",
    imageAlt: "Planejamento técnico de rigging para operação de elevação",
    imageUrl: "https://images.unsplash.com/photo-1581093196277-9f608bb3f45c?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 70,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "operacoes-especiais",
  },
];

const PUBLIC_EQUIPMENT: PublicEquipmentEntry[] = [
  {
    id: "equipment-md-250-25-ton",
    slug: "guindastes/md-250-25-ton",
    name: "MD 250 (25 ton)",
    model: "MD 250",
    capacity: "25 ton",
    technicalInfo: "Guindaste para elevacoes de médio porte com foco em produtividade e segurança operacional.",
    seoTitle: "Guindaste MD 250 25 ton | Eleve Locações",
    seoDescription: "Locação de guindaste MD 250 com capacidade de 25 ton para operações indústriais e civis.",
    pageContent:
      "O guindaste MD 250 (25 ton) atende operações de elevação com necessidade de estabilidade, rapidez de montagem e boa performance em canteiros de médio porte. E uma opção indicada para movimentação de estruturas, equipamentos e componentes de obra.\n\nCom planejamento técnico adequado, o equipamento entrega produtividade com controle de risco, atendendo projetos com prazos exigentes e alto padrao operacional.",
    imageAlt: "Guindaste MD 250 em operação",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 10,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guindastes",
  },
  {
    id: "equipment-md-30-30-ton",
    slug: "guindastes/md-30-30-ton",
    name: "MD 30 (30 ton)",
    model: "MD 30",
    capacity: "30 ton",
    technicalInfo: "Guindaste de 30 ton para elevação de cargas em ambientes indústriais e de construção.",
    seoTitle: "Guindaste MD 30 30 ton | Eleve Locações",
    seoDescription: "Locação de guindaste MD 30 com capacidade de 30 ton para projetos de elevação técnica.",
    pageContent:
      "O MD 30 (30 ton) e indicado para operações que demandam maior capacidade de elevação mantendo agilidade de mobilizacao. Atua com eficiencia em montagens indústriais, apoio a obras civis e movimentação de componentes estruturais.\n\nSua aplicacao combina robustez e controle operacional, com suporte técnico para dimensionamento de cada operação.",
    imageAlt: "Guindaste MD 30 em obra",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 20,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guindastes",
  },
  {
    id: "equipment-md-300-30-ton",
    slug: "guindastes/md-300-30-ton",
    name: "MD 300 (30 ton)",
    model: "MD 300",
    capacity: "30 ton",
    technicalInfo: "Guindaste versatil para elevação com foco em alcance e estabilidade de operação.",
    seoTitle: "Guindaste MD 300 30 ton | Eleve Locações",
    seoDescription: "Locação de guindaste MD 300 com capacidade de 30 ton para elevacoes planejadas.",
    pageContent:
      "O MD 300 (30 ton) atende demandas de elevação com exigencia de precisao e repetibilidade operacional. E aplicado em cenarios de obra e indústria nos quais o controle de posicionamento da carga e essencial.\n\nCom estratégia de execução adequada, oferece desempenho consistente para manutencoes, montagens e movimentacoes de médio porte.",
    imageAlt: "Guindaste MD 300 realizando elevação",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1605792657660-596af9009e82?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 30,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guindastes",
  },
  {
    id: "equipment-br750-75-ton",
    slug: "guindastes/br750-75-ton",
    name: "BR750 (75 ton)",
    model: "BR750",
    capacity: "75 ton",
    technicalInfo: "Guindaste de alta capacidade para cargas pesadas em operações de maior porte.",
    seoTitle: "Guindaste BR750 75 ton | Eleve Locações",
    seoDescription: "Locação de guindaste BR750 com capacidade de 75 ton para cargas de grande porte.",
    pageContent:
      "O BR750 (75 ton) e uma solução para operações de elevação pesada que exigem maior capacidade e segurança técnica. E indicado para cenarios indústriais e de infraestrutura com componentes de grande massa e geometrias complexas.\n\nA aplicacao do equipamento e conduzida com planejamento detalhado para garantir eficiencia e previsibilidade durante toda a operação.",
    imageAlt: "Guindaste BR750 em elevação pesada",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 40,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guindastes",
  },
  {
    id: "equipment-qy130k-130-ton",
    slug: "guindastes/qy130k-130-ton",
    name: "QY130k (130 ton)",
    model: "QY130k",
    capacity: "130 ton",
    technicalInfo: "Guindaste de 130 ton para operações criticas e elevação de componentes superdimensionados.",
    seoTitle: "Guindaste QY130k 130 ton | Eleve Locações",
    seoDescription: "Locação de guindaste QY130k com capacidade de 130 ton para operações de alta complexidade.",
    pageContent:
      "O QY130k (130 ton) foi selecionado para operações de alta complexidade que exigem grande capacidade de elevação e controle técnico rigoroso. E aplicado em projetos de grande porte com alto impacto em cronograma e segurança.\n\nCom suporte de engenharia e execução orientada por plano operacional, o equipamento oferece desempenho para demandas criticas de movimentação.",
    imageAlt: "Guindaste QY130k em operação especial",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 50,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guindastes",
  },
  {
    id: "equipment-mercedes-md40507",
    slug: "munck/mercedes-md40507",
    name: "Mercedes MD40507",
    model: "Mercedes MD40507",
    capacity: "Munck",
    technicalInfo: "Caminhão munck para carga e descarga com agilidade em ambientes urbanos e indústriais.",
    seoTitle: "Munck Mercedes MD40507 | Eleve Locações",
    seoDescription: "Locação de munck Mercedes MD40507 para operações de carga e descarga com suporte técnico.",
    pageContent:
      "O Mercedes MD40507 e um munck orientado para operações de movimentação com alta frequencia e necessidade de rapidez. Atua em obras, manutencoes e suporte logístico com bom equilibrio entre capacidade e mobilidade.\n\nSeu uso e recomendado para cenarios com janelas curtas de operação e demanda de produtividade em campo.",
    imageAlt: "Munck Mercedes MD40507 operando em campo",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 60,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "munck",
  },
  {
    id: "equipment-scania-md30500",
    slug: "munck/scania-md30500",
    name: "Scania MD30500",
    model: "Scania MD30500",
    capacity: "Munck",
    technicalInfo: "Munck para movimentação de equipamentos e estruturas em operações técnicas.",
    seoTitle: "Munck Scania MD30500 | Eleve Locações",
    seoDescription: "Locação de munck Scania MD30500 para carga, descarga e apoio a montagens.",
    pageContent:
      "O Scania MD30500 atende operações de carga e descarga com foco em robustez e ritmo operacional. E indicado para movimentacoes recorrentes em ambientes indústriais e canteiros com necessidade de estabilidade de execução.\n\nCom planejamento correto, contribui para reduzir tempo de parada e aumentar previsibilidade em operações logísticas.",
    imageAlt: "Munck Scania MD30500 em movimentação",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 70,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "munck",
  },
  {
    id: "equipment-volks",
    slug: "munck/volks",
    name: "Volks",
    model: "Volks",
    capacity: "Munck",
    technicalInfo: "Munck para demandas de apoio operacional, carga e descarga em diferentes frentes.",
    seoTitle: "Munck Volks | Eleve Locações",
    seoDescription: "Locação de munck Volks para movimentação técnica com agilidade em operações de campo.",
    pageContent:
      "O munck Volks complementa operações de movimentação que exigem versatilidade e resposta rápida. E aplicado em atividades de apoio a montagem, manutenção e logística em diferentes tipos de projeto.\n\nSua configuracao permite atender frentes de trabalho com demandas variáveis, mantendo produtividade e segurança operacional.",
    imageAlt: "Munck Volks em operação",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1635865165118-917ed9e20936?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 80,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "munck",
  },
  {
    id: "equipment-longking-lg30dt-triplex",
    slug: "empilhadeiras/longking-lg30dt-triplex",
    name: "Longking LG30DT Triplex",
    model: "Longking LG30DT Triplex",
    capacity: "Empilhadeira",
    technicalInfo: "Empilhadeira para movimentação de carga paletizada e suporte logístico interno.",
    seoTitle: "Empilhadeira Longking LG30DT Triplex | Eleve Locações",
    seoDescription: "Locação de empilhadeira Longking LG30DT Triplex para operações de patio e armazenagem.",
    pageContent:
      "A Longking LG30DT Triplex e indicada para movimentação de pallets e cargas em patios, armazens e áreas operacionais. O equipamento atende rotinas de abastecimento interno e expedicao com foco em continuidade de fluxo.\n\nCom suporte técnico adequado, contribui para aumentar eficiencia logístico-operacional e reduzir gargalos em movimentação interna.",
    imageAlt: "Empilhadeira Longking LG30DT Triplex em operação",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 90,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "empilhadeiras",
  },
  {
    id: "equipment-caminhão-prancha",
    slug: "guinchos-e-carretas/caminhao-prancha",
    name: "Caminhão Prancha",
    model: "Caminhão Prancha",
    capacity: "Guinchos e Carretas",
    technicalInfo: "Plataforma para transporte de máquinas e cargas de grande porte.",
    seoTitle: "Caminhão Prancha | Eleve Locações",
    seoDescription: "Locação de caminhão prancha para transporte de máquinas e cargas especiais.",
    pageContent:
      "O caminhão prancha e uma solução de transporte para máquinas, equipamentos e estruturas que exigem base estável e amarracao técnica. E aplicado em operações de transferencia entre canteiros, plantas e centros logísticos.\n\nA operação e planejada com foco em segurança de carga, tempo de ciclo e previsibilidade de entrega.",
    imageAlt: "Caminhão prancha transportando maquina",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 100,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guinchos-e-carretas",
  },
  {
    id: "equipment-carreta-prancha-3-eixos-rebaixada",
    slug: "guinchos-e-carretas/carreta-prancha-3-eixos-rebaixada",
    name: "Carreta Prancha 3 eixos Rebaixada",
    model: "Carreta Prancha 3 eixos Rebaixada",
    capacity: "Guinchos e Carretas",
    technicalInfo: "Carreta rebaixada para transporte de cargas com limite de altura e geometria especial.",
    seoTitle: "Carreta Prancha 3 eixos Rebaixada | Eleve Locações",
    seoDescription:
      "Locação de carreta prancha 3 eixos rebaixada para transporte técnico de cargas especiais.",
    pageContent:
      "A carreta prancha 3 eixos rebaixada e indicada para cargas com restricao de altura e necessidade de melhor distribuicao do centro de gravidade. E utilizada em transportes técnicos com exigencia de planejamento de rota e controle operacional.\n\nSua configuracao favorece segurança no deslocamento e eficiencia em operações de media e alta complexidade.",
    imageAlt: "Carreta prancha rebaixada de 3 eixos",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 110,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guinchos-e-carretas",
  },
  {
    id: "equipment-carreta-4-eixos",
    slug: "guinchos-e-carretas/carreta-4-eixos",
    name: "Carreta 4 Eixos",
    model: "Carreta 4 Eixos",
    capacity: "Guinchos e Carretas",
    technicalInfo: "Carreta para transporte de cargas de alto volume com melhor distribuicao de peso.",
    seoTitle: "Carreta 4 Eixos | Eleve Locações",
    seoDescription: "Locação de carreta 4 eixos para transporte de cargas pesadas e operações logísticas especiais.",
    pageContent:
      "A carreta 4 eixos atende transportes que demandam maior capacidade de distribuicao de carga e estabilidade durante o trajeto. E uma opção para operações de maior volume com foco em segurança e desempenho logístico.\n\nCom planejamento de amarracao e rota, o equipamento sustenta operações com melhor previsibilidade de prazo e menor risco operacional.",
    imageAlt: "Carreta 4 eixos em transporte de carga",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 120,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guinchos-e-carretas",
  },
  {
    id: "equipment-carreta-lagartixa-4-eixos",
    slug: "guinchos-e-carretas/carreta-lagartixa-4-eixos",
    name: "Carreta Lagartixa 4 Eixos",
    model: "Carreta Lagartixa 4 Eixos",
    capacity: "Guinchos e Carretas",
    technicalInfo: "Composicao lagartixa para operações de transporte pesado com flexibilidade de configuracao.",
    seoTitle: "Carreta Lagartixa 4 Eixos | Eleve Locações",
    seoDescription: "Locação de carreta lagartixa 4 eixos para transporte especializado de cargas técnicas.",
    pageContent:
      "A carreta lagartixa 4 eixos e empregada em operações que exigem configuracao flexivel para acomodar cargas especiais. Sua aplicacao e comum em deslocamentos técnicos de equipamentos indústriais e componentes de obra.\n\nA escolha desse conjunto e feita conforme perfil da carga, acessos e requisitos de segurança da operação.",
    imageAlt: "Carreta lagartixa 4 eixos para carga especial",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1619517823200-5f3621e40744?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 130,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guinchos-e-carretas",
  },
  {
    id: "equipment-carreta-extensiva",
    slug: "guinchos-e-carretas/carreta-extensiva",
    name: "Carreta Extensiva",
    model: "Carreta Extensiva",
    capacity: "Guinchos e Carretas",
    technicalInfo: "Carreta extensiva para cargas longas e superdimensionadas com necessidade de escolta.",
    seoTitle: "Carreta Extensiva | Eleve Locações",
    seoDescription: "Locação de carreta extensiva para transporte de cargas longas e superdimensionadas.",
    pageContent:
      "A carreta extensiva atende cargas com comprimento elevado e geometria fora do padrao. E uma solução para operações especiais em que o planejamento de rota e o suporte de escolta sao decisivos para segurança e conformidade.\n\nCom análise técnica prévia, a operação e estruturada para reduzir interferências e manter o cronograma de entrega.",
    imageAlt: "Carreta extensiva transportando carga longa",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 140,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guinchos-e-carretas",
  },
  {
    id: "equipment-carreta-carga-seca",
    slug: "guinchos-e-carretas/carreta-carga-seca",
    name: "Carreta Carga Seca",
    model: "Carreta Carga Seca",
    capacity: "Guinchos e Carretas",
    technicalInfo: "Carreta para transporte geral de cargas secas em operações logísticas de apoio.",
    seoTitle: "Carreta Carga Seca | Eleve Locações",
    seoDescription: "Locação de carreta carga seca para transporte de materiais e suporte logístico técnico.",
    pageContent:
      "A carreta carga seca e usada em operações de transporte de materiais, componentes e cargas nao pereciveis com necessidade de eficiencia no ciclo logístico. E indicada para apoio a obras e operações indústriais em diferentes frentes.\n\nCom planejamento de carregamento e rota, contribui para manter abastecimento e fluxo operacional estável.",
    imageAlt: "Carreta carga seca em operação logística",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1494412685616-a5d310fbb07d?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 150,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "guinchos-e-carretas",
  },
  {
    id: "equipment-container-6-metros",
    slug: "containers/container-6-metros",
    name: "Container 6 metros",
    model: "Container 6 metros",
    capacity: "Container",
    technicalInfo: "Container para apoio operacional, armazenagem e instalacao temporária em campo.",
    seoTitle: "Container 6 metros | Eleve Locações",
    seoDescription: "Locação de container 6 metros para apoio de obra, armazenagem e base operacional temporária.",
    pageContent:
      "O container de 6 metros atende demandas de apoio a obra, armazenagem de materiais e implantação de estrutura temporária em campo. E uma alternativa prática para operações que precisam de mobilizacao rápida e custo operacional previsível.\n\nA solução pode ser integrada ao planejamento logístico do projeto, com entrega e retirada coordenadas conforme cronograma.",
    imageAlt: "Container 6 metros para apoio operacional",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1586528116493-28c9f67f2e20?auto=format&fit=crop&q=80&w=1400",
    displayOrder: 160,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
    categorySlug: "containers",
  },
];

const PUBLIC_TESTIMONIALS: ManagedPublicTestimonial[] = [
  {
    id: "testimonial-1",
    name: "Carlos Oliveira",
    role: "Engenheiro de Producao",
    quote:
      "Atendimento técnico consistente, equipamentos em boas condições e execução alinhada ao cronograma.",
    imageUrl: null,
    displayOrder: 10,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
  },
  {
    id: "testimonial-2",
    name: "Juliana Mendes",
    role: "Gestora de Logística",
    quote:
      "Precisávamos de uma operação rápida para carga especial e a Eleve entregou planejamento e execução com segurança.",
    imageUrl: null,
    displayOrder: 20,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
  },
  {
    id: "testimonial-3",
    name: "Roberto Silva",
    role: "Diretor de Operações",
    quote:
      "A equipe trouxe previsibilidade para uma operação critica de movimentação. Excelente suporte técnico.",
    imageUrl: null,
    displayOrder: 30,
    isPublished: true,
    createdAt: STATIC_CREATED_AT,
    updatedAt: STATIC_UPDATED_AT,
  },
];

function sortByDisplayOrder<T extends { displayOrder: number }>(values: T[]) {
  return [...values].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getPublicCompany() {
  return PUBLIC_COMPANY;
}

export async function listPublicServices(onlyPublished = false) {
  const services = onlyPublished
    ? PUBLIC_SERVICES.filter((service) => service.isPublished)
    : PUBLIC_SERVICES;

  return sortByDisplayOrder(services);
}

export async function getPublicServiceById(id: string) {
  return PUBLIC_SERVICES.find((service) => service.id === id) || null;
}

export async function getPublicServiceBySlug(slug: string, onlyPublished = true) {
  const service = PUBLIC_SERVICES.find((item) => item.slug === slug) || null;

  if (!service) {
    return null;
  }

  if (onlyPublished && !service.isPublished) {
    return null;
  }

  return service;
}

export async function getPublicServiceByPath(categorySlug: string, slug: string, onlyPublished = true) {
  return getPublicServiceBySlug(`${categorySlug}/${slug}`, onlyPublished);
}

export async function getPublicServiceCategories() {
  return PUBLIC_SERVICE_CATEGORIES;
}

export async function getPublicServiceCategoryBySlug(slug: string) {
  return PUBLIC_SERVICE_CATEGORIES.find((category) => category.slug === slug) || null;
}

export async function listServicesByCategory(categorySlug: string) {
  return sortByDisplayOrder(
    PUBLIC_SERVICES.filter((service) => service.categorySlug === categorySlug && service.isPublished),
  );
}

export async function listPublicEquipment(onlyPublished = false) {
  const equipment = onlyPublished
    ? PUBLIC_EQUIPMENT.filter((item) => item.isPublished)
    : PUBLIC_EQUIPMENT;

  return sortByDisplayOrder(equipment);
}

export async function getPublicEquipmentById(id: string) {
  return PUBLIC_EQUIPMENT.find((item) => item.id === id) || null;
}

export async function getPublicEquipmentBySlug(slug: string, onlyPublished = true) {
  const equipment = PUBLIC_EQUIPMENT.find((item) => item.slug === slug) || null;

  if (!equipment) {
    return null;
  }

  if (onlyPublished && !equipment.isPublished) {
    return null;
  }

  return equipment;
}

export async function getPublicEquipmentByPath(categorySlug: string, slug: string, onlyPublished = true) {
  return getPublicEquipmentBySlug(`${categorySlug}/${slug}`, onlyPublished);
}

export async function getPublicEquipmentCategories() {
  return PUBLIC_EQUIPMENT_CATEGORIES;
}

export async function getPublicEquipmentCategoryBySlug(slug: string) {
  return PUBLIC_EQUIPMENT_CATEGORIES.find((category) => category.slug === slug) || null;
}

export async function listEquipmentByCategory(categorySlug: string) {
  return sortByDisplayOrder(
    PUBLIC_EQUIPMENT.filter((item) => item.categorySlug === categorySlug && item.isPublished),
  );
}

export async function listPublicTestimonials(onlyPublished = false) {
  const testimonials = onlyPublished
    ? PUBLIC_TESTIMONIALS.filter((testimonial) => testimonial.isPublished)
    : PUBLIC_TESTIMONIALS;

  return sortByDisplayOrder(testimonials);
}

export async function getPublicTestimonialById(id: string) {
  return PUBLIC_TESTIMONIALS.find((testimonial) => testimonial.id === id) || null;
}

export async function getPublicSiteContent(): Promise<PublicSiteContent> {
  const [company, services, equipment, testimonials] = await Promise.all([
    getPublicCompany(),
    listPublicServices(true),
    listPublicEquipment(true),
    listPublicTestimonials(true),
  ]);

  return {
    company,
    services,
    equipment,
    testimonials,
  };
}
