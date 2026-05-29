// ════════════════════════════════════════════════════════════════════
// Mock data — Casa Mr. Lion (destilaria de whisky premium)
// Insumos líquidos + embalagem → 3 produtos (Honey, Cappuccino, Blended).
// Números de estoque/mínimo/receita são EXEMPLO realista — ajustar com a destilaria.
// ════════════════════════════════════════════════════════════════════

import honeyImg from '@/assets/products/honey/garrafa-norm.webp'
import cappuccinoImg from '@/assets/products/cappuccino/garrafa-norm.webp'
import blendedImg from '@/assets/products/blended/garrafa-norm.webp'
import type { Item, Fornecedor, Receita, OrdemProducao, Movimento } from './types'

// ── Fornecedores ──
export const FORNECEDORES: Fornecedor[] = [
  { id: 'f-apiario',  nome: 'Apiário Vale do Mel',   contato: '(35) 99812-0042', leadTimeDias: 12, itensFornecidos: ['mel'] },
  { id: 'f-aromas',   nome: 'Insumos & Aromas SP',   contato: '(11) 3344-1190',  leadTimeDias: 8,  itensFornecidos: ['aroma_mel','aroma_cap','cmc','corante','citrato'] },
  { id: 'f-laticinio',nome: 'Laticínio Serra Real',  contato: '(35) 3521-7788',  leadTimeDias: 5,  itensFornecidos: ['creme_leite','leite_cond','acucar'] },
  { id: 'f-vidraria', nome: 'Vidraria União',        contato: '(11) 4002-8922',  leadTimeDias: 35, itensFornecidos: ['garrafa_hb','garrafa_cap','rolha'] },
  { id: 'f-grafica',  nome: 'Gráfica Premium BH',    contato: '(31) 3232-4455',  leadTimeDias: 7,  itensFornecidos: ['rotulo_honey','rotulo_cap','rotulo_blend','tubo'] },
  { id: 'f-metais',   nome: 'Pingentes & Metais MG', contato: '(31) 98777-1234', leadTimeDias: 20, itensFornecidos: ['ping_honey','ping_cap','ping_blend','colar'] },
  { id: 'f-embalagem',nome: 'Embalagens BH',         contato: '(31) 3399-0010',  leadTimeDias: 6,  itensFornecidos: ['caixa6','caixa23','caixa1'] },
]

// ── Itens (matéria-prima, embalagem, produto acabado) ──
// estoque/min de exemplo; o cenário tem alguns gargalos propositais (garrafa_cap, rotulo_honey, ping_blend).
export const ITENS: Item[] = [
  // ── matéria-prima ──
  { id:'mel',        sku:'MP-001', nome:'Mel silvestre',       tipo:'materia_prima', categoria:'liquido', uom:'kg', estoque:34,  min:12,  custoMedio:21.50, fornecedorId:'f-apiario',  leadTimeDias:12, usoMedioDiario:2.1, perecivel:true,  classeAbc:'A', ativo:true },
  { id:'acucar',     sku:'MP-002', nome:'Açúcar',              tipo:'materia_prima', categoria:'po',      uom:'kg', estoque:62,  min:20,  custoMedio:4.20,  fornecedorId:'f-laticinio',leadTimeDias:5,  usoMedioDiario:3.0, classeAbc:'B', compartilhado:true, ativo:true },
  { id:'aroma_mel',  sku:'MP-003', nome:'Aroma de mel',        tipo:'materia_prima', categoria:'aditivo', uom:'L',  estoque:2.4, min:1.0, custoMedio:96.00, fornecedorId:'f-aromas',   leadTimeDias:8,  usoMedioDiario:0.18,classeAbc:'A', ativo:true },
  { id:'creme_leite',sku:'MP-004', nome:'Creme de leite',      tipo:'materia_prima', categoria:'liquido', uom:'kg', estoque:9.5, min:5,   custoMedio:12.80, fornecedorId:'f-laticinio',leadTimeDias:5,  usoMedioDiario:0.9, perecivel:true,  classeAbc:'B', ativo:true },
  { id:'leite_cond', sku:'MP-005', nome:'Leite condensado',    tipo:'materia_prima', categoria:'liquido', uom:'kg', estoque:11,  min:6,   custoMedio:11.40, fornecedorId:'f-laticinio',leadTimeDias:5,  usoMedioDiario:1.0, perecivel:true,  classeAbc:'B', ativo:true },
  { id:'aroma_cap',  sku:'MP-006', nome:'Aroma de cappuccino', tipo:'materia_prima', categoria:'aditivo', uom:'L',  estoque:1.6, min:0.8, custoMedio:104.00,fornecedorId:'f-aromas',   leadTimeDias:8,  usoMedioDiario:0.12,classeAbc:'A', ativo:true },
  { id:'cmc',        sku:'MP-007', nome:'CMC (espessante)',    tipo:'materia_prima', categoria:'po',      uom:'kg', estoque:0.6, min:0.3, custoMedio:62.00, fornecedorId:'f-aromas',   leadTimeDias:8,  usoMedioDiario:0.03,classeAbc:'C', ativo:true },
  { id:'corante',    sku:'MP-008', nome:'Corante caramelo',    tipo:'materia_prima', categoria:'aditivo', uom:'L',  estoque:0.9, min:0.4, custoMedio:48.00, fornecedorId:'f-aromas',   leadTimeDias:8,  usoMedioDiario:0.05,classeAbc:'C', ativo:true },
  { id:'citrato',    sku:'MP-009', nome:'Citrato de sódio',    tipo:'materia_prima', categoria:'po',      uom:'kg', estoque:0.5, min:0.2, custoMedio:38.00, fornecedorId:'f-aromas',   leadTimeDias:8,  usoMedioDiario:0.02,classeAbc:'C', ativo:true },

  // ── embalagem (componentes da garrafa) ──
  { id:'garrafa_hb', sku:'EM-001', nome:'Garrafa Honey/Blended', tipo:'embalagem', categoria:'garrafa',    uom:'un', estoque:128, min:120, custoMedio:6.40, fornecedorId:'f-vidraria', leadTimeDias:35, usoMedioDiario:34, classeAbc:'A', compartilhado:true, ativo:true },
  { id:'garrafa_cap',sku:'EM-002', nome:'Garrafa Cappuccino',    tipo:'embalagem', categoria:'garrafa',    uom:'un', estoque:58,  min:80,  custoMedio:6.40, fornecedorId:'f-vidraria', leadTimeDias:35, usoMedioDiario:12, classeAbc:'A', ativo:true },
  { id:'rolha',      sku:'EM-003', nome:'Rolha',                 tipo:'embalagem', categoria:'fechamento', uom:'un', estoque:340, min:160, custoMedio:0.85, fornecedorId:'f-vidraria', leadTimeDias:30, usoMedioDiario:46, classeAbc:'B', compartilhado:true, ativo:true },
  { id:'tubo',       sku:'EM-004', nome:'Tubo (sem rótulo)',     tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:210, min:150, custoMedio:2.10, fornecedorId:'f-grafica',  leadTimeDias:7,  usoMedioDiario:46, classeAbc:'B', compartilhado:true, ativo:true },
  { id:'rotulo_honey',sku:'EM-005',nome:'Rótulo Honey',          tipo:'embalagem', categoria:'rotulo',     uom:'un', estoque:92,  min:120, custoMedio:0.55, fornecedorId:'f-grafica',  leadTimeDias:7,  usoMedioDiario:22, classeAbc:'B', ativo:true },
  { id:'rotulo_cap', sku:'EM-006', nome:'Rótulo Cappuccino',     tipo:'embalagem', categoria:'rotulo',     uom:'un', estoque:150, min:80,  custoMedio:0.55, fornecedorId:'f-grafica',  leadTimeDias:7,  usoMedioDiario:12, classeAbc:'C', ativo:true },
  { id:'rotulo_blend',sku:'EM-007',nome:'Rótulo Blended',        tipo:'embalagem', categoria:'rotulo',     uom:'un', estoque:44,  min:50,  custoMedio:0.55, fornecedorId:'f-grafica',  leadTimeDias:7,  usoMedioDiario:9,  classeAbc:'C', ativo:true },
  { id:'ping_honey', sku:'EM-008', nome:'Pingente Honey',        tipo:'embalagem', categoria:'pingente',   uom:'un', estoque:115, min:80,  custoMedio:3.90, fornecedorId:'f-metais',   leadTimeDias:20, usoMedioDiario:22, classeAbc:'A', ativo:true },
  { id:'ping_cap',   sku:'EM-009', nome:'Pingente Cappuccino',   tipo:'embalagem', categoria:'pingente',   uom:'un', estoque:72,  min:60,  custoMedio:3.90, fornecedorId:'f-metais',   leadTimeDias:20, usoMedioDiario:12, classeAbc:'A', ativo:true },
  { id:'ping_blend', sku:'EM-010', nome:'Pingente Blended',      tipo:'embalagem', categoria:'pingente',   uom:'un', estoque:26,  min:40,  custoMedio:3.90, fornecedorId:'f-metais',   leadTimeDias:20, usoMedioDiario:9,  classeAbc:'A', ativo:true },
  { id:'colar',      sku:'EM-011', nome:'Colar / correntinha',   tipo:'embalagem', categoria:'fechamento', uom:'un', estoque:180, min:150, custoMedio:1.30, fornecedorId:'f-metais',   leadTimeDias:20, usoMedioDiario:46, classeAbc:'B', compartilhado:true, ativo:true },
  { id:'caixa6',     sku:'EM-012', nome:'Caixa 6 unidades',      tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:30,  min:20,  custoMedio:4.50, fornecedorId:'f-embalagem',leadTimeDias:6,  usoMedioDiario:3,  classeAbc:'C', ativo:true },
  { id:'caixa23',    sku:'EM-013', nome:'Caixa 2–3 unidades',    tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:15,  min:20,  custoMedio:3.10, fornecedorId:'f-embalagem',leadTimeDias:6,  usoMedioDiario:4,  classeAbc:'C', ativo:true },
  { id:'caixa1',     sku:'EM-014', nome:'Caixa 1 unidade',       tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:84,  min:50,  custoMedio:1.90, fornecedorId:'f-embalagem',leadTimeDias:6,  usoMedioDiario:9,  classeAbc:'C', ativo:true },

  // ── produto acabado ──
  { id:'pa_honey',     sku:'PA-001', nome:'Mr. Lion Honey 750ml',      tipo:'produto_acabado', categoria:'honey',      uom:'un', estoque:96,  min:60, custoMedio:42.00, fotoUrl:honeyImg,      usoMedioDiario:14, classeAbc:'A', ativo:true },
  { id:'pa_cappuccino',sku:'PA-002', nome:'Mr. Lion Cappuccino 750ml', tipo:'produto_acabado', categoria:'cappuccino', uom:'un', estoque:48,  min:40, custoMedio:46.00, fotoUrl:cappuccinoImg, usoMedioDiario:8,  classeAbc:'A', ativo:true },
  { id:'pa_blended',   sku:'PA-003', nome:'Mr. Lion Blended 750ml',    tipo:'produto_acabado', categoria:'blended',    uom:'un', estoque:120, min:50, custoMedio:33.00, fotoUrl:blendedImg,    usoMedioDiario:11, classeAbc:'B', ativo:true },
]

// ── Receitas / BOM (quantidades por 1 garrafa — EXEMPLO) ──
export const RECEITAS: Receita[] = [
  {
    id:'rec-honey', produtoId:'pa_honey', nome:'Honey 750ml', rendimento:1,
    componentes:[
      { itemId:'mel', quantidade:0.18, uom:'kg' },
      { itemId:'acucar', quantidade:0.12, uom:'kg' },
      { itemId:'aroma_mel', quantidade:0.015, uom:'L' },
      { itemId:'garrafa_hb', quantidade:1, uom:'un' },
      { itemId:'rolha', quantidade:1, uom:'un' },
      { itemId:'rotulo_honey', quantidade:1, uom:'un' },
      { itemId:'tubo', quantidade:1, uom:'un' },
      { itemId:'ping_honey', quantidade:1, uom:'un' },
      { itemId:'colar', quantidade:1, uom:'un' },
    ],
  },
  {
    id:'rec-cappuccino', produtoId:'pa_cappuccino', nome:'Cappuccino 750ml', rendimento:1,
    componentes:[
      { itemId:'creme_leite', quantidade:0.10, uom:'kg' },
      { itemId:'acucar', quantidade:0.10, uom:'kg' },
      { itemId:'leite_cond', quantidade:0.12, uom:'kg' },
      { itemId:'aroma_cap', quantidade:0.012, uom:'L' },
      { itemId:'cmc', quantidade:0.003, uom:'kg' },
      { itemId:'corante', quantidade:0.005, uom:'L' },
      { itemId:'citrato', quantidade:0.002, uom:'kg' },
      { itemId:'garrafa_cap', quantidade:1, uom:'un' },
      { itemId:'rolha', quantidade:1, uom:'un' },
      { itemId:'rotulo_cap', quantidade:1, uom:'un' },
      { itemId:'tubo', quantidade:1, uom:'un' },
      { itemId:'ping_cap', quantidade:1, uom:'un' },
      { itemId:'colar', quantidade:1, uom:'un' },
    ],
  },
  {
    id:'rec-blended', produtoId:'pa_blended', nome:'Blended 750ml', rendimento:1, incompleta:true,
    componentes:[
      { itemId:'garrafa_hb', quantidade:1, uom:'un' },
      { itemId:'rolha', quantidade:1, uom:'un' },
      { itemId:'rotulo_blend', quantidade:1, uom:'un' },
      { itemId:'tubo', quantidade:1, uom:'un' },
      { itemId:'ping_blend', quantidade:1, uom:'un' },
      { itemId:'colar', quantidade:1, uom:'un' },
    ],
  },
]

// ── Ordens de produção (exemplo) ──
export const ORDENS: OrdemProducao[] = [
  { id:'op-0042', codigo:'OP-0042', produtoId:'pa_honey',      receitaId:'rec-honey',      qtdPlanejada:120, status:'em_producao', criadaEm:'2026-05-26T09:00:00Z', prioridade:1 },
  { id:'op-0041', codigo:'OP-0041', produtoId:'pa_cappuccino', receitaId:'rec-cappuccino', qtdPlanejada:80,  status:'planejada',   criadaEm:'2026-05-27T14:00:00Z', prioridade:2 },
  { id:'op-0040', codigo:'OP-0040', produtoId:'pa_blended',    receitaId:'rec-blended',    qtdPlanejada:200, qtdReal:198, status:'concluida', criadaEm:'2026-05-20T08:00:00Z', concluidaEm:'2026-05-22T17:00:00Z', prioridade:1 },
]

export const ITEM_BY_ID = (id: string) => ITENS.find(i => i.id === id)
export const FORNECEDOR_BY_ID = (id?: string) => FORNECEDORES.find(f => f.id === id)
export const RECEITA_BY_PRODUTO = (produtoId: string) => RECEITAS.find(r => r.produtoId === produtoId)

/** Histórico sintético de movimentos por item (para sparkline/drawer). Determinístico. */
export function gerarHistorico(item: Item): Movimento[] {
  const hoje = new Date('2026-05-28T12:00:00Z').getTime()
  const dia = 86400000
  const seed = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const out: Movimento[] = []
  for (let i = 14; i >= 1; i--) {
    const pulso = ((seed * (i + 3)) % 7)
    if (pulso < 4) continue
    const ent = pulso % 2 === 0
    const mag = item.uom === 'un'
      ? Math.max(1, Math.round((item.usoMedioDiario ?? 5) * (0.6 + (pulso % 3) * 0.5)))
      : +(((item.usoMedioDiario ?? 1) * (0.5 + (pulso % 3) * 0.4))).toFixed(2)
    out.push({
      id: `${item.id}-h${i}`,
      itemId: item.id,
      delta: ent ? mag : -mag,
      tipo: ent ? 'recebimento' : 'consumo_producao',
      criadoEm: new Date(hoje - i * dia).toISOString(),
    })
  }
  return out
}
