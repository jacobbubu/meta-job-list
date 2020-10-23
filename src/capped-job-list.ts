import { createId, Update, ScuttlebuttOptions, UpdateItems } from '@jacobbubu/scuttlebutt-pull'
import { Debug } from '@jacobbubu/debug'
import { JobList, JobId, DoneError, DoneResult } from '@jacobbubu/job-list'
import { MetaJobList, ValueItems, JobListName } from './meta-job-list'

const defaultLogger = Debug.create('cjl')

const getDefaultLogger = (opts: CappedJobListOptions = {}) => {
  opts.id = opts.id ?? createId()
  opts.logger = opts.logger ?? defaultLogger.ns(opts.id!)
  return opts
}

export interface CappedJobListOptions extends ScuttlebuttOptions {
  threshold?: number
  metaCleanInterval?: number
}

export class CappedJobList extends MetaJobList {
  private _opts: CappedJobListOptions

  constructor(opts: CappedJobListOptions = {}) {
    super((opts = getDefaultLogger(opts)))
    opts.threshold = opts.threshold ?? 1
    opts.metaCleanInterval = opts.metaCleanInterval ?? 5e3
    this._opts = opts
    this.jobList.on('done', this.onJobDone.bind(this))
    this.meta.on('changed', this.onMetaChangedByPeer.bind(this))
    this.cleanMeta()
  }

  get options() {
    return this._opts
  }

  getNotifiedCount(jobId: JobId) {
    const notifiedPeers = this.meta.get(jobId)
    return notifiedPeers ? Object.keys(notifiedPeers).length : 0
  }

  applyUpdate(update: Update) {
    const newUpdate = [...update] as Update

    const value = newUpdate[UpdateItems.Data].slice()
    if (value.length !== 2) {
      this.logger.error('INVALID', update)
      return false
    }
    const name = value[ValueItems.Name]
    if (name === JobListName) {
      const rawValue = value[ValueItems.OriginalValue]
      const jobId = rawValue[0]
      if (this.getNotifiedCount(jobId) >= this.options.threshold!) {
        // ignore all updates to this job, but keep updates to the sources timestamp
        return true
      }
    }

    return super.applyUpdate(update)
  }

  private onJobDone(
    jobId: JobId,
    err: DoneError,
    res: DoneResult,
    jobList: JobList,
    update: Update
  ) {
    setImmediate(() => {
      this.meta.set(jobId, { [this.id]: update })
    })
  }

  private onMetaChangedByPeer(jobId: JobId) {
    if (this.getNotifiedCount(jobId) >= this.options.threshold!) {
      setImmediate(() => {
        this.jobList.delete(jobId)
      })
    }
  }

  private cleanMeta() {
    const cleanup = () => {
      const all = this.meta.toJSON()
      Object.keys(all).forEach((jobId) => {
        const jobSynced = all[jobId]
        const syncedKeys = Object.keys(jobSynced)
        if (syncedKeys.length >= this.options.threshold!) {
          let maxTs = 0
          for (let i = 0; i < syncedKeys.length; i++) {
            const ts = jobSynced[syncedKeys[i]][1]
            if (maxTs < ts) {
              maxTs = ts
            }
          }
          if (Date.now() - maxTs > 2e3) {
            this.meta.set(jobId, null)
          }
        }
      })
      setTimeout(() => {
        cleanup()
      }, this._opts.metaCleanInterval!)
    }
    setTimeout(() => {
      cleanup()
    }, this._opts.metaCleanInterval!)
  }
}
