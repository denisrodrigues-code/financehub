export const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

export function formatBrl(value: number) {
  return brl.format(value)
}
