'use client'

declare global {
  interface Window {
    gapi: {
      load: (module: string, callback: () => void) => void
    }
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token?: string
              error?: string
              error_description?: string
            }) => void
          }) => { requestAccessToken: (options?: { prompt: string }) => void }
        }
      }
      picker: {
        PickerBuilder: new () => {
          setAppId: (id: string) => ReturnType<typeof _pickerBuilder>
          setOAuthToken: (token: string) => ReturnType<typeof _pickerBuilder>
          setDeveloperKey: (key: string) => ReturnType<typeof _pickerBuilder>
          addView: (view: unknown) => ReturnType<typeof _pickerBuilder>
          setTitle: (title: string) => ReturnType<typeof _pickerBuilder>
          enableFeature: (feature: string) => ReturnType<typeof _pickerBuilder>
          setCallback: (cb: (data: PickerCallbackData) => void) => ReturnType<typeof _pickerBuilder>
          build: () => { setVisible: (v: boolean) => void }
        }
        DocsView: new () => {
          setMimeTypes: (types: string) => unknown
          setIncludeFolders: (v: boolean) => unknown
        }
        Action: { CANCEL: string; PICKED: string }
        Feature: { MULTISELECT_ENABLED: string }
      }
    }
  }
}

type _pickerBuilder = Window['google']['picker']['PickerBuilder']

interface PickerDoc {
  id: string
  name: string
  mimeType: string
}

interface PickerCallbackData {
  action: string
  docs?: PickerDoc[]
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? ''

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.id = id
    el.src = src
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(el)
  })
}

let gapiPickerReady: Promise<void> | null = null
let gisReady: Promise<void> | null = null

function ensureGapiPicker(): Promise<void> {
  if (!gapiPickerReady) {
    gapiPickerReady = loadScript('https://apis.google.com/js/api.js', '__gapi_script').then(
      () => new Promise<void>((resolve) => window.gapi.load('picker', resolve)),
    )
  }
  return gapiPickerReady
}

function ensureGis(): Promise<void> {
  if (!gisReady) {
    gisReady = loadScript('https://accounts.google.com/gsi/client', '__gis_script')
  }
  return gisReady
}

function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(response.error_description ?? response.error ?? 'Google auth failed'))
        } else {
          resolve(response.access_token)
        }
      },
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

function acceptToMimeTypes(accept?: string): string {
  if (!accept) return ''
  return accept
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('/'))
    .join(',')
}

async function downloadDriveFiles(docs: PickerDoc[], token: string): Promise<File[]> {
  const files: File[] = []
  for (const doc of docs) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) {
      throw new Error(`Failed to download "${doc.name}" from Google Drive (${res.status})`)
    }
    const blob = await res.blob()
    files.push(new File([blob], doc.name, { type: doc.mimeType || blob.type }))
  }
  return files
}

export interface GoogleDrivePickerOptions {
  accept?: string
  multiple?: boolean
}

export async function pickFromGoogleDrive(options: GoogleDrivePickerOptions = {}): Promise<File[]> {
  if (!API_KEY || !CLIENT_ID) {
    throw new Error('GOOGLE_DRIVE_NOT_CONFIGURED')
  }

  await Promise.all([ensureGapiPicker(), ensureGis()])
  const token = await getAccessToken()

  return new Promise((resolve, reject) => {
    const mimeTypes = acceptToMimeTypes(options.accept)
    const view = new window.google.picker.DocsView()
    if (mimeTypes) view.setMimeTypes(mimeTypes)
    view.setIncludeFolders(false)

    const builder = new window.google.picker.PickerBuilder()
      .setAppId(APP_ID)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .addView(view)
      .setTitle('Select from Google Drive')
      .setCallback(async (data: PickerCallbackData) => {
        if (data.action === window.google.picker.Action.CANCEL) {
          resolve([])
          return
        }
        if (data.action === window.google.picker.Action.PICKED && data.docs) {
          try {
            resolve(await downloadDriveFiles(data.docs, token))
          } catch (err) {
            reject(err)
          }
        }
      })

    if (options.multiple) {
      builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
    }

    builder.build().setVisible(true)
  })
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(API_KEY && CLIENT_ID)
}
