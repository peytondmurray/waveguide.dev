import { BlobReader, type FileEntry, ZipReader } from "@zip.js/zip.js"
import type { MainModule } from "splat-web/splat"
import type { Tile } from "./tile"
import type { ProgressUpdate } from "./util"

type SyncDirection = "MEMFS->IDBFS" | "IDBFS->MEMFS"

/**
 * Class which manages the splat and srtm2sdf filesystems
 */
export class FSManager {
  splatMod: MainModule
  srtm2sdfMod: MainModule
  idbfsMount: MainModule | null
  idbfsMountPoint: string
  srtmgl3sPath: string

  constructor(splatMod: MainModule, srtm2sdfMod: MainModule) {
    this.idbfsMount = null
    this.idbfsMountPoint = "/idbfs/"
    this.srtmgl3sPath = "/idbfs/srtmgl3s"
    this.srtm2sdfMod = srtm2sdfMod
    this.splatMod = splatMod
  }

  /**
   * Mount the IDBFS (persistent browser storage) to the emscripten filesystem of the target module.
   *
   * This function does nothing if the IDBFS is already pointed at the target filesystem. If it
   * is attached to any other filesystem, it first syncs from the MEMFS->IDBFS, then unmounts
   * and remounts on the target.
   *
   * @param target - Target module whose filesystem we should mount the IDBFS to
   */
  async mountAndSync(target: MainModule) {
    // If we're already attached to the target module's filesystem, do nothing
    if (this.idbfsMount === target) {
      return
    }

    // First check if the IDBFS is mounted. If it is, sync it with the FS it is currently mounted
    // to, then unmount it
    if (this.idbfsMount !== null) {
      await this.syncFS(this.idbfsMount, "MEMFS->IDBFS")
      this.idbfsMount.FS.unmount(this.idbfsMountPoint)
      this.idbfsMount = null
    }

    // Create mount point in splat filesystem
    if (!target.FS.analyzePath(this.idbfsMountPoint, true).exists) {
      target.FS.mkdir(this.idbfsMountPoint)
    }
    target.FS.mount(target.IDBFS, {}, this.idbfsMountPoint)
    this.idbfsMount = target

    // Sync the IDBFS to MEMFS
    await this.syncFS(target, "IDBFS->MEMFS")
    if (!target.FS.analyzePath(this.srtmgl3sPath, true).exists) {
      target.FS.mkdir(this.srtmgl3sPath)
    }
  }

  /**
   * A version of FS.syncfs that you can await.
   *
   * See https://github.com/emscripten-core/emscripten/issues/18306#issuecomment-1502710013
   *
   * @param mod - Emscripten module whose filesystem is to be synced
   * @param syncDirection - The direction to sync: IDBFS->MEMFS or MEMFS->IDBFS
   * @returns A promise that resolves when syncing is done
   */
  async syncFS(mod: MainModule, syncDirection: SyncDirection): Promise<void> {
    return new Promise((resolve, reject) => {
      mod.FS.syncfs(syncDirection === "IDBFS->MEMFS", (err: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Get an array of the cached tiles.
   *
   * Could be expensive if all 15k tiles (~15GB) are cached.
   *
   * @returns A list of cached tiles
   */
  getCachedTiles(): string[] {
    if (this.idbfsMount === null) {
      throw new Error(
        "Splat filesystem must be mounted before operations on the EMFS!",
      )
    }

    return this.splatMod.FS.readdir(this.srtmgl3sPath).filter(
      (fname: string) => {
        return fname.match(/^[NS]\d{2}[EW]\d{3}\.SRTMGL3S\.hgt\.zip$/)
      },
    )
  }

  isCached(fname: string): boolean {
    if (this.idbfsMount === null) {
      throw new Error(
        "Splat filesystem must be mounted before operations on the EMFS!",
      )
    }
    return this.splatMod.FS.analyzePath(`${this.srtmgl3sPath}/${fname}`, true)
      .exists
  }

  /**
   * Unzip a blob containing a single file into a Uint8Array.
   *
   * See https://github.com/whatwg/compression/blob/main/explainer.md
   *
   * @param blob - A blob containing a zipfile
   * @returns The first file contained in the zipfile as a Uint8Array
   */
  async unzip(blob: Blob): Promise<Uint8Array> {
    // https://github.com/gildas-lormeau/zip.js
    const zipFileReader = new BlobReader(blob)

    const zipReader = new ZipReader(zipFileReader)
    const firstEntry = (await zipReader.getEntries()).shift()
    if (firstEntry === undefined) {
      return new Uint8Array()
    }
    if (firstEntry.directory) {
      throw new Error("Unrecognized format for .hgt.zip file.")
    }
    const buf = await (firstEntry as FileEntry).arrayBuffer()
    await zipReader.close()

    return new Uint8Array(buf)
  }

  async getSdfs(
    tiles: Tile[],
    progressCallback: ({ value, label }: ProgressUpdate) => void,
  ) {
    await this.mountAndSync(this.splatMod)

    const total = tiles.length
    let done = 0

    await Promise.all(
      tiles.map(async (tile) => {
        // Check if it's necessary to acquire the .hgt.zip file
        const zipHgtPath = `${this.srtmgl3sPath}/${tile.ziphgtname}`
        if (!this.splatMod.FS.analyzePath(zipHgtPath, true).exists) {
          const response = await fetch(tile.url)
          if (!response.ok) {
            throw new Error(
              `Tried to fetch ${tile.url}, but failed. Reason: ${await response.text()}`,
            )
          }

          const blob = await response.blob()
          this.splatMod.FS.writeFile(
            zipHgtPath,
            new Uint8Array(await blob.arrayBuffer()),
            { encoding: "binary" },
          )
        }

        // Check if it's necessary to unzip the hgt
        const hgtPath = `${this.srtmgl3sPath}/${tile.hgtname}`
        if (!this.splatMod.FS.analyzePath(hgtPath, true).exists) {
          const contents = this.splatMod.FS.readFile(zipHgtPath, {
            encoding: "binary",
          })
          const buf = await this.unzip(new Blob([contents]))
          this.splatMod.FS.writeFile(
            `${this.srtmgl3sPath}/${tile.hgtname}`,
            buf,
          )
        }
        progressCallback({
          value: 100 * (++done / total),
          label: "Downloading tiles...",
        })
      }),
    )

    await this.mountAndSync(this.srtm2sdfMod)

    await Promise.all(
      tiles.map(async (tile) => {
        const hgtPath = `${this.srtmgl3sPath}/${tile.hgtname}`
        const sdfPath = `${this.idbfsMountPoint}/${tile.sdfName}`

        // Check if it's necessary to convert the hgt to sdf
        if (!this.srtm2sdfMod.FS.analyzePath(sdfPath, true).exists) {
          this.srtm2sdfMod.callMain([hgtPath])

          // Can't just rename between filesystems - need to copy the file contents instead.
          // srtm2sdf writes to `/`, no matter where the input file lived. Read that file in and copy it
          // to the IDBFS.
          const content = this.srtm2sdfMod.FS.readFile(tile.sdfName, {
            encoding: "binary",
          })
          this.srtm2sdfMod.FS.writeFile(sdfPath, content)
        }
      }),
    )

    await this.mountAndSync(this.splatMod)
  }

  // biome-ignore lint/suspicious/noExplicitAny: Just matching the emscripten FS types here...
  async writeFile(target: MainModule, path: string, data: any, opts?: any) {
    await this.mountAndSync(target)
    target.FS.writeFile(path, data, opts)
  }

  async readFile(
    target: MainModule,
    path: string,
    // biome-ignore lint/suspicious/noExplicitAny: Just matching the emscripten FS types here...
    opts?: any,
  ): Promise<string | Uint8Array> {
    await this.mountAndSync(target)
    return target.FS.readFile(path, opts)
  }
}
