export function csvSafe(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export function downloadCsv(fileName: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((columns) => columns.map((value) => csvSafe(value)).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
