import { BlobReader, type FileEntry, ZipReader } from "@zip.js/zip.js"
import type { SplatModule } from "splat-web/splat"
import type { MainModule } from "splat-web/srtm2sdf"
import type { ProgressUpdate, Tile } from "./util"

type SyncDirection = "MEMFS->IDBFS" | "IDBFS->MEMFS"

/**
 * Class which manages the splat and srtm2sdf filesystems
 */
export class FSManager {
  splatMod: SplatModule
  srtm2sdfMod: MainModule
  idbfsMount: SplatModule | MainModule | null
  idbfsMountPoint: string
  srtmgl3sPath: string

  constructor(splatMod: SplatModule, srtm2sdfMod: MainModule) {
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
  async mountAndSync(target: SplatModule | MainModule) {
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
  async syncFS(
    mod: SplatModule | MainModule,
    syncDirection: SyncDirection,
  ): Promise<void> {
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

  /**
   * Check if a file is cached.
   *
   * @param fname - File to check
   * @returns True if the file is cached, otherwise false
   */
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

  /**
   * Get the SDFs associated with the input map tiles.
   *
   * @param tiles - Tiles for which SDFs are to be gotten
   * @param progressCallback - Function to call to report progress back to the UI
   */
  async getSdfs(
    tiles: Tile[],
    progressCallback: ({ value, label }: ProgressUpdate) => void,
  ) {
    await this.mountAndSync(this.splatMod)

    const total = tiles.length

    let done = 0
    progressCallback({
      value: 100 * (++done / total),
      label: "Downloading SRTM tiles...",
    })

    // Use allSettled here to guarantee that the progress callbacks are done being called
    // by the time this resolves or is rejected. Otherwise we can have a failed fetch which
    // still shows the progress bar as pending.
    const fetchResult = await Promise.allSettled(
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
          label: "Downloading SRTM tiles...",
        })
      }),
    )

    // https://stackoverflow.com/questions/73064240/property-reason-does-not-exist-on-type-promisesettledresultnever-even-tho
    const errors = fetchResult
      .filter((res): res is PromiseRejectedResult => {
        return res.status === "rejected"
      })
      .map(({ reason }) => reason)
    if (errors.length > 0) {
      throw new Error(`Failed to fetch tiles. Errors: ${errors}`)
    }

    await this.mountAndSync(this.srtm2sdfMod)

    done = 0
    progressCallback({
      value: 100 * (++done / total),
      label: "Caching SRTM tiles to IDBFS...",
    })

    await Promise.allSettled(
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
        progressCallback({
          value: 100 * (++done / total),
          label: "Caching SRTM tiles to IDBFS...",
        })
      }),
    )

    await this.mountAndSync(this.splatMod)
  }

  /**
   * Sync before writing a file to the filesystem.
   *
   * @param target - Module containing the EMFS to write to
   * @param path - Path to the file to write
   * @param data - Data to write
   * @param opts - Any additional options to use when writing the file
   */
  // biome-ignore lint/suspicious/noExplicitAny: Just matching the emscripten FS types here...
  async writeFile(target: SplatModule, path: string, data: any, opts?: any) {
    await this.mountAndSync(target)
    target.FS.writeFile(path, data, opts)
  }

  /**
   * Sync before reading a file from the filesystem
   * @param target - Module containing the EMFS to read from
   * @param path - Path to the file to read
   * @param opts - Any additional options to use when reading the file
   * @returns The data from the file
   */
  async readFile(
    target: SplatModule,
    path: string,
    // biome-ignore lint/suspicious/noExplicitAny: Just matching the emscripten FS types here...
    opts?: any,
  ): Promise<string | Uint8Array> {
    await this.mountAndSync(target)
    return target.FS.readFile(path, opts)
  }
}
