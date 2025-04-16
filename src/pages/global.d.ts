import 'gun'

interface Window {
  secure: {
    wipe: (buffer: ArrayBuffer) => void
  }
}

declare module 'gun' {
  interface ISEA {
    secret: (salt: string, password: string) => Promise<string>
  }
}


interface HTMLInputElement {
  files: FileList | null
}

interface FileReader {
  readAsText(blob: Blob): void
}

