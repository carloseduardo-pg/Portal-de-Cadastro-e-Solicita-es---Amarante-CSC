/**
 * Catálogo PDM Amarante — hierarquia Grupo (1 díg.) → Subgrupo (3 díg.) → Família (6 díg.).
 * Espelha classificação fiscal/estoque usada no RM (TOTVS).
 */
export const PDM_GROUPS = [
  { code: '1', name: 'ALIMENTOS' },
  { code: '2', name: 'BEBIDAS' },
  { code: '3', name: 'UNIFORMES E ENXOVAIS' },
  { code: '4', name: 'LIMPEZA E HIGIENE' },
  { code: '5', name: 'UTENSILIOS E LOUÇAS' },
  { code: '6', name: 'MATERIAL DE CONSUMO HOTELAR' },
] as const;

export const PDM_SUBGROUPS = [
  { code: '101', groupCode: '1', name: 'CARNES E PRODUTOS AVICOLAS' },
  { code: '102', groupCode: '1', name: 'PEIXES E FRUTOS DO MAR' },
  { code: '103', groupCode: '1', name: 'LATICINIOS E OVOS' },
  { code: '108', groupCode: '1', name: 'PROD PADARIA CONFEITARIA' },
  { code: '111', groupCode: '1', name: 'ACUCARES ADOCANTES DOCES' },
  { code: '112', groupCode: '1', name: 'CEREAIS GRAOS E FARINACEOS' },
  { code: '113', groupCode: '1', name: 'HORTIFRUTI E LEGUMES' },
  { code: '114', groupCode: '1', name: 'CONSERVAS E ENLATADOS' },
  { code: '201', groupCode: '2', name: 'BEBIDAS ALCOOLICAS' },
  { code: '202', groupCode: '2', name: 'BEBIDAS NAO ALCOOLICAS' },
  { code: '203', groupCode: '2', name: 'CAFE CHA E SOLUVEIS' },
  { code: '301', groupCode: '3', name: 'UNIFORMES' },
  { code: '302', groupCode: '3', name: 'ENXOVAIS ROUPA DE CAMA' },
  { code: '401', groupCode: '4', name: 'PRODUTOS DE LIMPEZA' },
  { code: '402', groupCode: '4', name: 'HIGIENE PESSOAL AMENITIES' },
  { code: '501', groupCode: '5', name: 'LOUÇAS E PORCELANAS' },
  { code: '502', groupCode: '5', name: 'UTENSILIOS COZINHA' },
  { code: '601', groupCode: '6', name: 'DESCARTAVEIS E EMBALAGENS' },
  { code: '602', groupCode: '6', name: 'MATERIAL ESCRITORIO HOTEL' },
] as const;

export const PDM_FAMILIES = [
  { code: '101001', sg: '101', name: 'CARNES BOVINAS' },
  { code: '101002', sg: '101', name: 'AVES' },
  { code: '101003', sg: '101', name: 'SUINOS E EMBUTIDOS' },
  { code: '102001', sg: '102', name: 'PEIXES FRESCOS' },
  { code: '102002', sg: '102', name: 'FRUTOS DO MAR' },
  { code: '103001', sg: '103', name: 'LEITE E DERIVADOS' },
  { code: '103002', sg: '103', name: 'OVOS' },
  { code: '108001', sg: '108', name: 'BOLACHAS E BISCOITOS' },
  { code: '108002', sg: '108', name: 'BOLOS E MISTURAS PRONTAS' },
  { code: '111001', sg: '111', name: 'ACUCARES E ADOCANTES' },
  { code: '112001', sg: '112', name: 'CEREAIS E GRAOS' },
  { code: '112002', sg: '112', name: 'CEREAIS MATINAIS' },
  { code: '113001', sg: '113', name: 'FRUTAS FRESCAS' },
  { code: '113002', sg: '113', name: 'LEGUMES E VERDURAS' },
  { code: '114001', sg: '114', name: 'CONSERVAS VEGETAIS' },
  { code: '201001', sg: '201', name: 'DESTILADOS' },
  { code: '201002', sg: '201', name: 'VINHOS' },
  { code: '201003', sg: '201', name: 'CERVEJA E CHOPP' },
  { code: '202001', sg: '202', name: 'AGUAS' },
  { code: '202002', sg: '202', name: 'AGUA DE COCO E COCO' },
  { code: '202003', sg: '202', name: 'REFRIGERANTES E SUCOS' },
  { code: '203001', sg: '203', name: 'CAFE' },
  { code: '203002', sg: '203', name: 'CHA E SOLUVEIS' },
  { code: '301001', sg: '301', name: 'CAMISAS E POLOS' },
  { code: '301002', sg: '301', name: 'CALCAS E BERMUDAS' },
  { code: '302001', sg: '302', name: 'LENÇOIS E FRONHAS' },
  { code: '302002', sg: '302', name: 'TOALHAS' },
  { code: '401001', sg: '401', name: 'DETERGENTES E DESINFETANTES' },
  { code: '401002', sg: '401', name: 'LIMPA VIDROS E MULTIUSO' },
  { code: '402001', sg: '402', name: 'AMENITIES QUARTO' },
  { code: '402002', sg: '402', name: 'PAPEL HIGIENICO E GUARDANAPOS' },
  { code: '501001', sg: '501', name: 'PRATOS E TIGELAS' },
  { code: '501002', sg: '501', name: 'COPOS E TAÇAS' },
  { code: '502001', sg: '502', name: 'FACAS E TALHERES' },
  { code: '502002', sg: '502', name: 'PANELAS E FORMAS' },
  { code: '601001', sg: '601', name: 'COPOS DESCARTAVEIS' },
  { code: '601002', sg: '601', name: 'EMBALAGENS ALIMENTICIAS' },
  { code: '602001', sg: '602', name: 'PAPELARIA HOTEL' },
] as const;

/**
 * Atributos PDM de **protótipo** por família (chaves técnicas + exemplos).
 * Lógica: em PDM real, cada família analítica tem características que montam a descrição
 * padronizada (tipo, medida, conservação, embalagem etc.). Substituir pela base Amarante
 * quando disponível — isto só habilita o fluxo de teste.
 */
export type PdmAttributeDef = {
  name: string;
  required: boolean;
  examples: string[];
};

const ATTR = {
  marca: {
    name: 'MARCA',
    required: false,
    examples: ['SEARA', 'SADIA', 'NESTLE', 'UNILEVER'],
  },
  conservacao: {
    name: 'CONSERVACAO',
    required: true,
    examples: ['CONGELADO', 'RESFRIADO', 'FRESCO', 'AMBIENTE'],
  },
  embalagem: {
    name: 'EMBALAGEM',
    required: true,
    examples: ['PCT', 'CX', 'BDJ', 'GALAO', 'FARDO'],
  },
  pesoVol: {
    name: 'PESO / VOLUME',
    required: true,
    examples: ['500 G', '1 KG', '5 KG', '500 ML', '1 L'],
  },
  origem: {
    name: 'ORIGEM / PROCEDENCIA',
    required: false,
    examples: ['NACIONAL', 'IMPORTADO', 'REGIONAL'],
  },
} as const satisfies Record<string, PdmAttributeDef>;

/** Atributos específicos por código de família (6 dígitos). */
const PDM_ATTRS_BY_FAMILY: Record<string, PdmAttributeDef[]> = {
  '101001': [
    { name: 'TIPO CORTE', required: true, examples: ['BABY BEEF', 'ALCATRA', 'PICANHA', 'MAMINHA'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '101002': [
    { name: 'TIPO CORTE', required: true, examples: ['INTEIRO', 'PEITO', 'COXA', 'SOBRECOXA'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '101003': [
    { name: 'TIPO', required: true, examples: ['COSTELA', 'LINGUICA', 'PRESUNTO', 'BACON'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '102001': [
    { name: 'ESPECIE', required: true, examples: ['SALMAO', 'TILAPIA', 'BACALHAU', 'ATUM'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '102002': [
    { name: 'TIPO', required: true, examples: ['CAMARAO', 'LAGOSTA', 'POLVO', 'LULA'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '103001': [
    { name: 'TIPO', required: true, examples: ['LEITE UHT', 'QUEIJO', 'MANTEIGA', 'IOGURTE'] },
    { name: 'TEOR GORDURA', required: false, examples: ['INTEGRAL', 'SEMIDESNATADO', 'DESNATADO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '103002': [
    { name: 'TIPO', required: true, examples: ['BRANCO', 'CAIPIRA', 'CODORNA'] },
    { name: 'CLASSIFICACAO', required: false, examples: ['EXTRA', 'GRANDE', 'MEDIO'] },
    ATTR.embalagem,
  ],
  '108001': [
    { name: 'TIPO', required: true, examples: ['AGUA E SAL', 'RECHEADA', 'WAFER', 'CREME'] },
    ATTR.marca,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '108002': [
    { name: 'TIPO', required: true, examples: ['BOLO PRONTO', 'MISTURA', 'MASSA FOLHADA'] },
    ATTR.marca,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '111001': [
    { name: 'TIPO', required: true, examples: ['CRISTAL', 'REFINADO', 'DEMERARA', 'ASPARTAME'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '112001': [
    { name: 'TIPO', required: true, examples: ['ARROZ', 'FEIJAO', 'FARINHA', 'FUBA'] },
    { name: 'TIPO GRAO', required: false, examples: ['TIPO 1', 'AGULHINHA', 'CARIOCA', 'PRETO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '112002': [
    { name: 'TIPO', required: true, examples: ['FLOCOS', 'GRANOLA', 'AVEIA', 'MUESLI'] },
    ATTR.marca,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '113001': [
    { name: 'TIPO FRUTA', required: true, examples: ['BANANA', 'MACA', 'LARANJA', 'MAMAO'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '113002': [
    { name: 'TIPO', required: true, examples: ['TOMATE', 'ALFACE', 'BATATA', 'CEBOLA'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '114001': [
    { name: 'TIPO', required: true, examples: ['MILHO', 'ERVILHA', 'AZEITONA', 'SELETA'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '201001': [
    { name: 'TIPO', required: true, examples: ['VODKA', 'WHISKY', 'GIN', 'CACHACA'] },
    { name: 'TEOR ALCOOLICO', required: false, examples: ['37,5%', '40%', '43%'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '201002': [
    { name: 'TIPO', required: true, examples: ['TINTO', 'BRANCO', 'ROSE', 'ESPUMANTE'] },
    { name: 'SAFRA / REGIAO', required: false, examples: ['CHILE', 'ARGENTINA', 'RS', 'NACIONAL'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '201003': [
    { name: 'TIPO', required: true, examples: ['PILSEN', 'IPA', 'LAGER', 'CHOPP'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '202001': [
    { name: 'TIPO', required: true, examples: ['COM GAS', 'SEM GAS', 'NATURAL'] },
    { name: 'VOLUME', required: true, examples: ['300 ML', '500 ML', '1,5 L', '20 L'] },
    ATTR.embalagem,
  ],
  '202002': [
    { name: 'TIPO', required: true, examples: ['AGUA DE COCO', 'COCO RALADO', 'LEITE DE COCO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '202003': [
    { name: 'TIPO', required: true, examples: ['COLA', 'GUARANA', 'SUCO', 'ISOTONICO'] },
    { name: 'VOLUME', required: true, examples: ['200 ML', '350 ML', '2 L'] },
    ATTR.embalagem,
  ],
  '203001': [
    { name: 'TIPO', required: true, examples: ['PO', 'GRAOS', 'CAPSULA', 'SOLUVEL'] },
    { name: 'TORRA', required: false, examples: ['TRADICIONAL', 'EXTRA FORTE', 'GOURMET'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '203002': [
    { name: 'TIPO', required: true, examples: ['CHA PRETO', 'CHA VERDE', 'CHA MATE', 'ACHICOLATADO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '301001': [
    { name: 'GENERO', required: true, examples: ['MASCULINO', 'FEMININO', 'UNISSEX'] },
    { name: 'TAMANHO', required: true, examples: ['P', 'M', 'G', 'GG', 'EXG'] },
    { name: 'COR', required: true, examples: ['AZUL', 'PRETO', 'BRANCO', 'VERDE'] },
    { name: 'MODELO', required: false, examples: ['POLO', 'SOCIAL', 'PIQUET'] },
  ],
  '301002': [
    { name: 'GENERO', required: true, examples: ['MASCULINO', 'FEMININO', 'UNISSEX'] },
    { name: 'TAMANHO', required: true, examples: ['38', '40', '42', '44', '46'] },
    { name: 'COR', required: true, examples: ['PRETO', 'BEGE', 'AZUL MARINHO'] },
    { name: 'MODELO', required: false, examples: ['CALCA', 'BERMUDA', 'SOCIAL'] },
  ],
  '302001': [
    { name: 'TIPO', required: true, examples: ['LENCOL', 'FRONHA', 'PROTETOR'] },
    { name: 'TAMANHO', required: true, examples: ['SOLTEIRO', 'CASAL', 'QUEEN', 'KING'] },
    { name: 'COR / PADRAO', required: false, examples: ['BRANCO', 'BEGE', 'LISTRADO'] },
  ],
  '302002': [
    { name: 'TIPO', required: true, examples: ['BANHO', 'ROSTO', 'PISO', 'PISCINA'] },
    { name: 'TAMANHO', required: true, examples: ['30X50', '70X140', '100X150'] },
    { name: 'COR', required: false, examples: ['BRANCO', 'BEGE', 'CINZA'] },
  ],
  '401001': [
    { name: 'TIPO', required: true, examples: ['DETERGENTE', 'DESINFETANTE', 'ALVEJANTE'] },
    { name: 'CONCENTRACAO', required: false, examples: ['PRONTO USO', 'CONCENTRADO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '401002': [
    { name: 'TIPO', required: true, examples: ['LIMPA VIDROS', 'MULTIUSO', 'DESENGORDURANTE'] },
    ATTR.embalagem,
    ATTR.pesoVol,
  ],
  '402001': [
    { name: 'TIPO', required: true, examples: ['SABONETE', 'SHAMPOO', 'CONDICIONADOR', 'LOCAO'] },
    { name: 'VOLUME', required: true, examples: ['30 ML', '40 ML', '50 ML'] },
    ATTR.embalagem,
  ],
  '402002': [
    { name: 'TIPO', required: true, examples: ['PAPEL HIGIENICO', 'GUARDANAPO', 'TOALHA PAPEL'] },
    { name: 'FOLHAS / METRAGEM', required: false, examples: ['30 M', '2 DOBRAS', 'FOLHA DUPLA'] },
    ATTR.embalagem,
  ],
  '501001': [
    { name: 'TIPO', required: true, examples: ['PRATO RASO', 'PRATO FUNDO', 'TIGELA', 'SOBREMESA'] },
    { name: 'MATERIAL', required: true, examples: ['PORCELANA', 'CERAMICA', 'VIDRO', 'MELAMINA'] },
    { name: 'COR / LINHA', required: false, examples: ['BRANCO', 'DECORADO', 'HOTELARIA'] },
  ],
  '501002': [
    { name: 'TIPO', required: true, examples: ['COPO', 'TACA VINHO', 'TACA CHAMPANHE', 'CANECA'] },
    { name: 'MATERIAL', required: true, examples: ['VIDRO', 'CRISTAL', 'ACRILICO'] },
    { name: 'CAPACIDADE', required: false, examples: ['200 ML', '300 ML', '450 ML'] },
  ],
  '502001': [
    { name: 'TIPO', required: true, examples: ['FACA', 'GARFO', 'COLHER', 'JOGO TALHER'] },
    { name: 'MATERIAL', required: true, examples: ['INOX 18/10', 'INOX 18/8', 'ACO'] },
    { name: 'ACABAMENTO', required: false, examples: ['POLIDO', 'FOSCO', 'DOURADO'] },
  ],
  '502002': [
    { name: 'TIPO', required: true, examples: ['PANELA', 'FORMA', 'ASSADEIRA', 'CALDEIRAO'] },
    { name: 'MATERIAL', required: true, examples: ['ALUMINIO', 'INOX', 'ANTIADERENTE'] },
    { name: 'CAPACIDADE', required: false, examples: ['2 L', '5 L', '10 L'] },
  ],
  '601001': [
    { name: 'TIPO', required: true, examples: ['COPO', 'COPO COM TAMPA', 'COPO TERMICO'] },
    { name: 'CAPACIDADE', required: true, examples: ['180 ML', '200 ML', '300 ML'] },
    { name: 'MATERIAL', required: false, examples: ['PP', 'PET', 'PAPEL'] },
  ],
  '601002': [
    { name: 'TIPO', required: true, examples: ['POTE', 'BANDEJA', 'SACOLA', 'FILME'] },
    { name: 'CAPACIDADE / MEDIDA', required: false, examples: ['250 ML', '500 ML', '30X40 CM'] },
    { name: 'MATERIAL', required: false, examples: ['PP', 'PET', 'ALUMINIO', 'PAPEL'] },
  ],
  '602001': [
    { name: 'TIPO', required: true, examples: ['BLOCO', 'CANETA', 'PASTA', 'ENVELOPE'] },
    { name: 'FORMATO', required: false, examples: ['A4', 'A5', 'OFICIO'] },
    ATTR.marca,
  ],
};

const FALLBACK_ATTRS: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['PADRAO', 'ESPECIAL'] },
  ATTR.embalagem,
  ATTR.pesoVol,
  ATTR.marca,
];

/** Retorna atributos de protótipo para uma família (código 6 dígitos). */
export function pdmAttributesForFamily(familyCode: string): PdmAttributeDef[] {
  return PDM_ATTRS_BY_FAMILY[familyCode] ?? FALLBACK_ATTRS;
}

/** Produtos de exemplo para base unificada. */
export const PDM_SAMPLE_PRODUCTS = [
  {
    unified: '1004871',
    short: 'AGUA MINERAL NAT S/GAS 500ML',
    long: 'AGUA MINERAL NATURAL SEM GAS GARRAFA 500ML',
    family: '202001',
    ncm: '2201.10.00',
    mu: 'LT',
    hotels: ['MCZ', 'MGI'],
  },
  {
    unified: '1004872',
    short: 'AGUA MINERAL NAT C/GAS 300ML',
    long: 'AGUA MINERAL NATURAL COM GAS GARRAFA 300ML',
    family: '202001',
    ncm: '2201.10.00',
    mu: 'LT',
    hotels: ['MGI'],
  },
  {
    unified: '1009233',
    short: 'AGUA MINERAL NATURAL GALAO 20L',
    long: 'AGUA MINERAL NATURAL GALAO 20 LITROS',
    family: '202001',
    ncm: '2201.10.00',
    mu: 'LT',
    hotels: ['JPT', 'SALG'],
  },
  {
    unified: '1010041',
    short: 'CARNE BOV BABY BEEF CONG',
    long: 'CARNE BOVINA BABY BEEF CONGELADO',
    family: '101001',
    ncm: '0201.30.00',
    mu: 'KG',
    hotels: ['MCZ', 'MGI', 'JPT'],
  },
  {
    unified: '1010042',
    short: 'CARNE BOV CHARQUE DIANTEIRA CONG',
    long: 'CARNE BOVINA CHARQUE DIANTEIRA CONGELADA',
    family: '101001',
    ncm: '0210.20.00',
    mu: 'KG',
    hotels: ['MCZ'],
  },
  {
    unified: '1010043',
    short: 'FRANGO INTEIRO RESFRIADO KG',
    long: 'FRANGO INTEIRO RESFRIADO POR KG',
    family: '101002',
    ncm: '0207.14.00',
    mu: 'KG',
    hotels: ['MCZ', 'MGI'],
  },
  {
    unified: '2010031',
    short: 'CERVEJA LATA 350ML',
    long: 'CERVEJA LATA 350ML',
    family: '201003',
    ncm: '2203.00.00',
    mu: 'LT',
    hotels: ['MCZ', 'MGI'],
  },
  {
    unified: '1110011',
    short: 'ACUCAR CRISTAL 1KG',
    long: 'ACUCAR CRISTAL PACOTE 1KG',
    family: '111001',
    ncm: '1701.99.00',
    mu: 'KG',
    hotels: ['MCZ', 'SALG'],
  },
  {
    unified: '2001101',
    short: 'CAMISA MASC ALMO TAM EXG POLO AZ REF 34C',
    long: 'CAMISA MASCULINA ALMO TAM EXG POLO AZUL REF 34C',
    family: '301001',
    mu: 'UN',
    hotels: ['MCZ'],
  },
  {
    unified: '4010011',
    short: 'DETERGENTE NEUTRO 5L',
    long: 'DETERGENTE NEUTRO CONCENTRADO 5 LITROS',
    family: '401001',
    ncm: '3402.20.00',
    mu: 'LT',
    hotels: ['MCZ', 'JPT'],
  },
  {
    unified: '4020011',
    short: 'SABONETE LIQUIDO AMENITY 30ML',
    long: 'SABONETE LIQUIDO AMENITY FRASCO 30ML',
    family: '402001',
    ncm: '3401.30.00',
    mu: 'UN',
    hotels: ['MCZ', 'MGI', 'JPT', 'SALG'],
  },
  {
    unified: '2030011',
    short: 'CAFE EM PO TRADICIONAL 500G',
    long: 'CAFE EM PO TORRADO MOIDO TRADICIONAL 500G',
    family: '203001',
    ncm: '0901.21.00',
    mu: 'KG',
    hotels: ['MCZ', 'MGI'],
  },
] as const;
