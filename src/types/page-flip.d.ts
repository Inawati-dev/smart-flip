// Tipe minimal untuk page-flip 2.0.7 (StPageFlip, MIT). Paketnya tidak membawa berkas tipe; hanya bagian yang dipakai
// FlipLengkung.tsx (antrean #374). Diimpor dari berkas modul ESM karena `main` paketnya build UMD.
declare module 'page-flip/dist/js/page-flip.module.js' {
  export interface EventData {
    data: unknown
  }
  export class PageFlip {
    constructor(block: HTMLElement, setting: Record<string, unknown>)
    loadFromHTML(items: HTMLElement[]): void
    on(event: string, callback: (e: EventData) => void): PageFlip
    flipNext(corner?: string): void
    flipPrev(corner?: string): void
    flip(page: number, corner?: string): void
    turnToPage(page: number): void
    getCurrentPageIndex(): number
    getPageCount(): number
    getSettings(): Record<string, unknown>
    update(): void
    destroy(): void
  }
}
