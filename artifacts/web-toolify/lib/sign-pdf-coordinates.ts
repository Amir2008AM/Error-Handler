export type PdfPageSize = { width: number; height: number }
export type ViewerRect = { left: number; top: number; width: number; height: number }

export function pdfToViewer(point: { x: number; y: number }, page: PdfPageSize, rect: ViewerRect) {
  return { x: rect.left + point.x * rect.width / page.width, y: rect.top + (page.height - point.y) * rect.height / page.height }
}

export function viewerToPdf(point: { x: number; y: number }, page: PdfPageSize, rect: ViewerRect) {
  return { x: (point.x - rect.left) * page.width / rect.width, y: page.height - (point.y - rect.top) * page.height / rect.height }
}

export function pdfSizeToViewer(size: { width: number; height: number }, page: PdfPageSize, rect: ViewerRect) {
  return { width: size.width * rect.width / page.width, height: size.height * rect.height / page.height }
}

export function viewerSizeToPdf(size: { width: number; height: number }, page: PdfPageSize, rect: ViewerRect) {
  return { width: size.width * page.width / rect.width, height: size.height * page.height / rect.height }
}
