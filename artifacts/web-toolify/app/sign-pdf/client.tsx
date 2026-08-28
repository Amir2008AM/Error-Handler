'use client'

import { useRef, useState } from 'react'
import { Download, FileSignature, FileUp, PenLine, RotateCcw, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MAX_FILE_SIZE = 25 * 1024 * 1024

type Signature = { dataUrl: string; name: string }

export function SignPdfClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [signature, setSignature] = useState<Signature | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [signed, setSigned] = useState(false)
  const [drawing, setDrawing] = useState(false)

  const chooseFile = async (selected?: File) => {
    const next = selected ?? inputRef.current?.files?.[0]
    if (!next) return
    if (next.type !== 'application/pdf') return setError('Please choose a PDF file.')
    if (next.size > MAX_FILE_SIZE) return setError('Files must be smaller than 25 MB.')
    try { await PDFDocument.load(await next.arrayBuffer()) } catch { return setError('This PDF could not be opened.') }
    setError(''); setFile(next); setSigned(false)
  }

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.setPointerCapture(event.pointerId); const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.beginPath(); ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top); setDrawing(true)
  }
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return; const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect(); const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top); ctx.stroke()
  }
  const finishDrawing = () => setDrawing(false)
  const clearDrawing = () => { const canvas = canvasRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height) }
  const saveSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return
    setSignature({ dataUrl: canvas.toDataURL('image/png'), name: name || 'My signature' })
  }
  const downloadSigned = async () => {
    if (!file || !signature) return
    const pdf = await PDFDocument.load(await file.arrayBuffer()); const page = pdf.getPages()[0]
    const image = await pdf.embedPng(signature.dataUrl); const width = 150; const height = width * image.height / image.width
    page.drawImage(image, { x: 50, y: 60, width, height })
    const blob = new Blob([await pdf.save()], { type: 'application/pdf' }); const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = file.name.replace(/\.pdf$/i, '') + '-signed.pdf'; link.click(); URL.revokeObjectURL(url); setSigned(true)
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FileSignature className="size-5" /></div><div><p className="font-semibold">Sign PDF</p><p className="text-xs text-muted-foreground">Private browser-based signing</p></div></div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Files never leave your device</div>
    </div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="mb-8 max-w-2xl"><p className="mb-2 text-sm font-medium text-primary">TOOLIFY PDF WORKSPACE</p><h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Sign a PDF in seconds</h1><p className="mt-3 leading-6 text-muted-foreground">Upload a document, create your signature, and download a signed copy. Everything happens locally in your browser.</p></div>
      {!file ? <Card className="border-dashed"><CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center"><div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileUp className="size-8" /></div><div><h2 className="text-lg font-semibold">Drop your PDF here</h2><p className="mt-1 text-sm text-muted-foreground">PDF files up to 25 MB</p></div><Button onClick={() => inputRef.current?.click()}><Upload data-icon="inline-start" /> Choose PDF</Button><input ref={inputRef} type="file" accept="application/pdf" className="sr-only" onChange={(e) => chooseFile()} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card className="min-h-[520px] bg-muted/40"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">{file.name}</CardTitle><CardDescription>{(file.size / 1024 / 1024).toFixed(2)} MB · First page preview</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove PDF"><X /></Button></CardHeader><CardContent className="flex min-h-96 items-center justify-center"><div className="flex aspect-[8.5/11] w-full max-w-md flex-col items-center justify-center border bg-card shadow-sm"><FileSignature className="mb-3 size-10 text-primary/50" /><p className="font-medium">PDF ready for signing</p><p className="mt-1 text-sm text-muted-foreground">Your signature will be placed on page 1</p>{signature && <img src={signature.dataUrl} alt="Signature preview" className="mt-8 max-h-20 max-w-48" />}</div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PenLine className="size-5 text-primary" /> Create signature</CardTitle><CardDescription>Draw or type your signature below.</CardDescription></CardHeader><CardContent><Tabs defaultValue="draw"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="draw">Draw</TabsTrigger><TabsTrigger value="type">Type</TabsTrigger></TabsList><TabsContent value="draw" className="flex flex-col gap-3"><canvas ref={canvasRef} width={620} height={220} className="h-44 w-full touch-none rounded-md border bg-card" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={finishDrawing} onPointerLeave={finishDrawing} /><div className="flex justify-between"><Button variant="ghost" size="sm" onClick={clearDrawing}><RotateCcw data-icon="inline-start" /> Clear</Button><Button size="sm" onClick={saveSignature}>Use signature</Button></div></TabsContent><TabsContent value="type" className="flex flex-col gap-3"><Label htmlFor="signer-name">Your name</Label><Input id="signer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your name" /><div className="rounded-md border p-5 text-center font-serif text-2xl italic">{name || 'Your signature'}</div><Button onClick={() => { const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.font = 'italic 52px Georgia'; ctx.fillText(name || 'Your signature', 24, 120); saveSignature() }}>Use typed signature</Button></TabsContent></Tabs>{signature && <div className="mt-5 flex items-center justify-between rounded-md bg-muted p-3 text-sm"><span className="truncate">{signature.name} added</span><Button variant="ghost" size="icon-sm" onClick={() => setSignature(null)} aria-label="Delete signature"><Trash2 /></Button></div>}{signature && <Button className="mt-4 w-full" onClick={downloadSigned}><Download data-icon="inline-start" /> Download signed PDF</Button>}{signed && <p className="mt-3 text-center text-sm text-primary">Signed PDF downloaded.</p>}</CardContent></Card></div>}
    </div></main>
}
