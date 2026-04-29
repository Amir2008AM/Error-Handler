/**
 * PDF Security Processor
 * Handles PDF encryption, password protection, and digital signatures.
 *
 * Encryption/decryption is performed by the qpdf binary (system dependency).
 * Visible signatures are still drawn with pdf-lib.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export class WrongPasswordError extends Error {
  constructor(message = 'Incorrect password') {
    super(message)
    this.name = 'WrongPasswordError'
  }
}

interface QpdfResult {
  code: number
  stderr: string
}

function runQpdf(args: string[]): Promise<QpdfResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('qpdf', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      resolve({ code: code ?? -1, stderr })
    })
  })
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'qpdf-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export interface PDFPermissions {
  printing?: 'none' | 'lowResolution' | 'highResolution'
  modifying?: boolean
  copying?: boolean
  annotating?: boolean
  fillingForms?: boolean
  contentAccessibility?: boolean
  documentAssembly?: boolean
}

export interface ProtectOptions {
  userPassword?: string // Password to open document
  ownerPassword: string // Password for full access
  permissions?: PDFPermissions
}

export interface UnlockOptions {
  password: string
}

export interface SignatureOptions {
  signerName: string
  reason?: string
  location?: string
  contactInfo?: string
  signatureImage?: Buffer // Optional signature image
  position?: {
    page: number // 0-indexed
    x: number
    y: number
    width: number
    height: number
  }
}

export class PDFSecurityProcessor {
  /**
   * Protect a PDF with real AES-256 password encryption via qpdf.
   * Both userPassword (open) and ownerPassword (full access) are required.
   */
  async protect(
    pdfBuffer: Buffer,
    options: ProtectOptions
  ): Promise<Buffer> {
    if (!options.userPassword || options.userPassword.length < 1) {
      throw new Error('User password is required')
    }
    if (!options.ownerPassword || options.ownerPassword.length < 1) {
      throw new Error('Owner password is required')
    }

    // Validate that the input really is a PDF that qpdf can read.
    // Throws early on truncated/corrupt files instead of producing a
    // confusing encryption error later.
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('File is not a valid PDF')
    }

    return withTempDir(async (dir) => {
      const inPath = join(dir, 'in.pdf')
      const outPath = join(dir, 'out.pdf')
      const argsPath = join(dir, 'args.txt')

      await writeFile(inPath, pdfBuffer)

      const perms = options.permissions ?? {}
      const printArg =
        perms.printing === 'none'
          ? '--print=none'
          : perms.printing === 'lowResolution'
          ? '--print=low'
          : '--print=full'

      // qpdf permission model: --modify controls a hierarchy of edit rights.
      // 'all' allows everything; 'annotate' allows annotations + form fill;
      // 'form' allows form fill only; 'assembly' allows page assembly only;
      // 'none' disallows all modification.
      let modifyArg = '--modify=all'
      if (perms.modifying === false) {
        if (perms.annotating === true) modifyArg = '--modify=annotate'
        else if (perms.fillingForms === true) modifyArg = '--modify=form'
        else if (perms.documentAssembly === true) modifyArg = '--modify=assembly'
        else modifyArg = '--modify=none'
      }

      const extractArg = perms.copying === false ? '--extract=n' : '--extract=y'

      // qpdf reads each line of an @argfile as one separate argument. This keeps
      // the user/owner passwords out of the process command line (where they
      // would otherwise be visible to `ps`) while still letting us pass the
      // positional encrypt args.
      const argFileLines = [
        '--encrypt',
        options.userPassword!,
        options.ownerPassword,
        '256', // AES-256
        printArg,
        modifyArg,
        extractArg,
        '--',
        inPath,
        outPath,
      ]
      await writeFile(argsPath, argFileLines.join('\n'), { mode: 0o600 })

      const { code, stderr } = await runQpdf([`@${argsPath}`])
      // qpdf exit codes: 0 = success, 3 = warnings (still produced output), 2 = error
      if (code !== 0 && code !== 3) {
        throw new Error(`PDF encryption failed: ${stderr.trim() || `qpdf exited with code ${code}`}`)
      }

      return await readFile(outPath)
    })
  }

  /**
   * Remove password protection from a PDF using qpdf.
   * Throws WrongPasswordError if the supplied password is incorrect.
   */
  async unlock(
    pdfBuffer: Buffer,
    options: UnlockOptions
  ): Promise<Buffer> {
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('File is not a valid PDF')
    }

    return withTempDir(async (dir) => {
      const inPath = join(dir, 'in.pdf')
      const outPath = join(dir, 'out.pdf')
      const pwFile = join(dir, 'p.pw')

      // Password file: no trailing newline. qpdf 11.x reads the entire file
      // content as the password and does NOT strip whitespace, so we must not
      // append one ourselves.
      await Promise.all([
        writeFile(inPath, pdfBuffer),
        writeFile(pwFile, options.password ?? '', { mode: 0o600 }),
      ])

      const args = [
        `--password-file=${pwFile}`,
        '--decrypt',
        inPath,
        outPath,
      ]

      const { code, stderr } = await runQpdf(args)

      if (code === 0 || code === 3) {
        return await readFile(outPath)
      }

      // qpdf reports password problems on stderr with phrases like
      // "invalid password" or "encrypted file requires a password".
      const lower = stderr.toLowerCase()
      if (
        lower.includes('invalid password') ||
        lower.includes('incorrect password') ||
        lower.includes('requires a password') ||
        lower.includes('password required')
      ) {
        throw new WrongPasswordError(
          options.password
            ? 'Incorrect password. Please try again.'
            : 'This PDF is password-protected. Please enter the password.'
        )
      }

      throw new Error(`PDF decryption failed: ${stderr.trim() || `qpdf exited with code ${code}`}`)
    })
  }

  /**
   * Add a digital signature to a PDF
   * This creates a visual signature stamp - for cryptographic signatures,
   * you'd need a certificate-based signing library
   */
  async addSignature(
    pdfBuffer: Buffer,
    options: SignatureOptions
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()
    
    // Default to last page if not specified
    const pageIndex = options.position?.page ?? pages.length - 1
    const page = pages[Math.min(pageIndex, pages.length - 1)]
    
    const { width: pageWidth, height: pageHeight } = page.getSize()
    
    // Default position (bottom right)
    const position = options.position || {
      page: pageIndex,
      x: pageWidth - 220,
      y: 50,
      width: 200,
      height: 80,
    }

    // Load a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Draw signature box
    page.drawRectangle({
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
    })

    // Add signature image if provided
    if (options.signatureImage) {
      try {
        // Try to embed as PNG first, then JPEG
        let signatureImageEmbed
        try {
          signatureImageEmbed = await pdfDoc.embedPng(options.signatureImage)
        } catch {
          signatureImageEmbed = await pdfDoc.embedJpg(options.signatureImage)
        }

        // Scale to fit in the box
        const imgDims = signatureImageEmbed.scale(1)
        const scale = Math.min(
          (position.width - 20) / imgDims.width,
          (position.height - 40) / imgDims.height
        )

        page.drawImage(signatureImageEmbed, {
          x: position.x + 10,
          y: position.y + 35,
          width: imgDims.width * scale,
          height: imgDims.height * scale,
        })
      } catch (error) {
        console.error('Failed to embed signature image:', error)
        // Continue without image
      }
    }

    // Add signature text
    const signatureDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Signer name
    page.drawText(`Signed by: ${options.signerName}`, {
      x: position.x + 5,
      y: position.y + position.height - 15,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    // Date
    page.drawText(`Date: ${signatureDate}`, {
      x: position.x + 5,
      y: position.y + position.height - 28,
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Reason if provided
    if (options.reason) {
      page.drawText(`Reason: ${options.reason.substring(0, 30)}`, {
        x: position.x + 5,
        y: position.y + 18,
        size: 7,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      })
    }

    // Location if provided
    if (options.location) {
      page.drawText(`Location: ${options.location.substring(0, 30)}`, {
        x: position.x + 5,
        y: position.y + 8,
        size: 7,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      })
    }

    // Add document metadata
    pdfDoc.setProducer('Toolify PDF Security')
    pdfDoc.setModificationDate(new Date())

    const signedPdf = await pdfDoc.save()
    return Buffer.from(signedPdf)
  }

  /**
   * Add an invisible digital signature (certificate-based)
   * This is a placeholder - real implementation requires certificate handling
   */
  async addCertificateSignature(
    pdfBuffer: Buffer,
    certificatePem: string,
    privateKeyPem: string,
    options: Omit<SignatureOptions, 'signatureImage'>
  ): Promise<Buffer> {
    // Certificate-based signing requires specialized libraries like:
    // - node-signpdf
    // - pdf-signer
    // - signer.digital
    
    // For now, we'll add a visible signature as a fallback
    return this.addSignature(pdfBuffer, options)
  }

  /**
   * Verify if a PDF has a signature
   */
  async hasSignature(pdfBuffer: Buffer): Promise<boolean> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
      })
      
      // Check for signature form fields
      const form = pdfDoc.getForm()
      const fields = form.getFields()
      
      for (const field of fields) {
        const type = field.constructor.name
        if (type === 'PDFSignature') {
          return true
        }
      }
      
      return false
    } catch {
      return false
    }
  }

  /**
   * Get PDF security info. Uses `qpdf --is-encrypted` for an authoritative
   * answer, then loads with pdf-lib (ignoreEncryption) to read metadata.
   */
  async getSecurityInfo(pdfBuffer: Buffer): Promise<{
    isEncrypted: boolean
    hasSignature: boolean
    permissions: string[]
    metadata: Record<string, string | undefined>
  }> {
    const isEncrypted = await withTempDir(async (dir) => {
      const inPath = join(dir, 'in.pdf')
      await writeFile(inPath, pdfBuffer)
      const { code } = await runQpdf(['--is-encrypted', inPath])
      // qpdf --is-encrypted: 0 = encrypted, 2 = not encrypted
      return code === 0
    })

    let pdfDoc: PDFDocument | null = null
    try {
      pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
    } catch {
      // Encrypted with strong cipher pdf-lib can't even parse — that's fine,
      // we still know it's encrypted from qpdf above.
    }

    const hasSignature = await this.hasSignature(pdfBuffer)

    return {
      isEncrypted,
      hasSignature,
      permissions: [],
      metadata: {
        title: pdfDoc?.getTitle(),
        author: pdfDoc?.getAuthor(),
        subject: pdfDoc?.getSubject(),
        producer: pdfDoc?.getProducer(),
        creator: pdfDoc?.getCreator(),
      },
    }
  }
}

// Export singleton instance
export const pdfSecurityProcessor = new PDFSecurityProcessor()
