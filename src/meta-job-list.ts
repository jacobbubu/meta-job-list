import {
  Scuttlebutt,
  ScuttlebuttOptions,
  UpdateItems,
  Update,
  Sources,
  createId,
} from '@jacobbubu/scuttlebutt-pull'
import {
  JobId,
  Job,
  JobList,
  JobListOptions,
  JobOptions,
  CreateListener,
  ProgressListener,
  DoneListener,
  SortIdListener,
  ExtraListener,
} from '@jacobbubu/job-list'
import { MergedModel } from '@jacobbubu/merged-model'
import { Debug } from '@jacobbubu/debug'
import { EventEmitter } from 'events'

export * from '@jacobbubu/job-list'

export enum ValueItems {
  Name = 0,
  OriginalValue,
}

function setId(obj: Scuttlebutt, id: string) {
  obj.setId(id)
  return obj
}

function runToJSON(obj: any) {
  return 'function' === typeof obj.toJSON ? obj.toJSON() : undefined
}

export const JobListName = 'JobList'
export const MetaName = 'Meta'

const JobListEventNames = [
  'created',
  'createdByPeer',
  'progress',
  'progressByPeer',
  'extra',
  'extraByPeer',
  'sortId',
  'sortIdByPeer',
  'done',
  'doneByPeer',
]

type JobListEventTypes =
  | 'created'
  | 'createdByPeer'
  | 'progress'
  | 'progressByPeer'
  | 'extra'
  | 'extraByPeer'
  | 'sortId'
  | 'sortIdByPeer'
  | 'done'
  | 'doneByPeer'

type JobListEventListenerTypes =
  | CreateListener
  | ProgressListener
  | ExtraListener
  | SortIdListener
  | DoneListener

const defaultLogger = Debug.create('mjl')

const getDefaultLogger = (opts: JobListOptions = {}) => {
  opts.id = opts.id ?? createId()
  opts.logger = opts.logger ?? defaultLogger.ns(opts.id!)
  return opts
}

export class MetaJobList extends Scuttlebutt {
  private _disabledEmitter = ''
  private _parts: Record<string, Scuttlebutt> = {}
  private _jobList: JobList
  private _meta: MergedModel
  private _jobListEventEmitter = new EventEmitter()

  constructor(opts: JobListOptions = {}) {
    super((opts = getDefaultLogger(opts)))
    this._jobList = new JobList({ ...opts, logger: this.logger.ns('jl') })
    this._parts[JobListName] = this._jobList
    this.add(JobListName, this._jobList)

    this._meta = new MergedModel({ logger: this.logger.ns('meta') } as ScuttlebuttOptions)
    this._parts[MetaName] = this._meta
    this.add(MetaName, this._meta)

    this._jobList.on('created', this.onJobListEvent.bind(this, 'created'))
    this._jobList.on('createdByPeer', this.onJobListEvent.bind(this, 'createdByPeer'))

    this._jobList.on('progress', this.onJobListEvent.bind(this, 'progress'))
    this._jobList.on('progressByPeer', this.onJobListEvent.bind(this, 'progressByPeer'))

    this._jobList.on('extra', this.onJobListEvent.bind(this, 'extra'))
    this._jobList.on('extraByPeer', this.onJobListEvent.bind(this, 'extraByPeer'))

    this._jobList.on('sortId', this.onJobListEvent.bind(this, 'sortId'))
    this._jobList.on('sortIdByPeer', this.onJobListEvent.bind(this, 'sortIdByPeer'))

    this._jobList.on('done', this.onJobListEvent.bind(this, 'done'))
    this._jobList.on('doneByPeer', this.onJobListEvent.bind(this, 'doneByPeer'))
  }

  get jobList() {
    return this._jobList
  }

  get meta() {
    return this._meta
  }

  applyUpdate(update: Update) {
    const newUpdate = [...update] as Update

    const value = newUpdate[UpdateItems.Data].slice()
    if (value.length !== 2) {
      this.logger.error('INVALID', update)
      return false
    }
    const name = value[ValueItems.Name]
    newUpdate[UpdateItems.Data] = value[ValueItems.OriginalValue]

    // wrap in try-finally so to prevent corruption when an event listener throws.
    this._disabledEmitter = name
    try {
      this._parts[name]._update(JSON.parse(JSON.stringify(newUpdate)))
    } finally {
      this._disabledEmitter = ''
    }
    return true
  }

  history(sources: Sources) {
    const h: Update[] = []
    const self = this
    for (let name in this._parts) {
      this._parts[name].history(sources).forEach(function (update: Update) {
        h.push(self.wrap(name, update))
      })
    }
    return h.sort(function (a, b) {
      return (
        a[UpdateItems.Timestamp] - b[UpdateItems.Timestamp] ||
        (a[UpdateItems.SourceId] === b[UpdateItems.SourceId]
          ? 0
          : a[UpdateItems.SourceId] < b[UpdateItems.SourceId]
          ? -1
          : 1)
      )
    })
  }

  toJSON() {
    const j: Record<string, any> = {}
    for (let key in this._parts) {
      j[key] = runToJSON(this._parts[key])
    }
    return j
  }

  create(opts: Partial<JobOptions> = {}) {
    return this._jobList.create(opts)
  }

  createBefore(before: Job, opts: Partial<JobOptions> = {}) {
    return this._jobList.createBefore(before, opts)
  }

  createAfter(after: Job, opts: Partial<JobOptions> = {}) {
    return this._jobList.createBefore(after, opts)
  }

  getLength() {
    return this._jobList.getLength()
  }

  at(index: number) {
    return this._jobList.at(index)
  }

  getJob(jobId: JobId, loadIfNotExist = true) {
    return this._jobList.getJob(jobId, loadIfNotExist)
  }

  delete(jobId: JobId | JobId[]): JobId[] {
    return this._jobList.delete(jobId)
  }

  on(eventName: JobListEventTypes, listener: JobListEventListenerTypes) {
    if (JobListEventNames.includes(eventName)) {
      this._jobListEventEmitter.on(eventName, listener)
    } else {
      super.on(eventName, listener)
    }
    return this
  }

  once(eventName: JobListEventTypes, listener: JobListEventListenerTypes) {
    if (JobListEventNames.includes(eventName)) {
      this._jobListEventEmitter.once(eventName, listener)
    } else {
      super.once(eventName, listener)
    }
    return this
  }

  off(eventName: JobListEventTypes, listener: JobListEventListenerTypes) {
    if (JobListEventNames.includes(eventName)) {
      this._jobListEventEmitter.off(eventName, listener)
    } else {
      super.off(eventName, listener)
    }
    return this
  }

  addListener(eventName: JobListEventTypes, listener: JobListEventListenerTypes) {
    if (JobListEventNames.includes(eventName)) {
      this._jobListEventEmitter.addListener(eventName, listener)
    } else {
      super.addListener(eventName, listener)
    }
    return this
  }

  removeListener(eventName: JobListEventTypes, listener: JobListEventListenerTypes) {
    if (JobListEventNames.includes(eventName)) {
      this._jobListEventEmitter.removeListener(eventName, listener)
    } else {
      super.removeListener(eventName, listener)
    }
    return this
  }

  private add(name: string, obj: Scuttlebutt) {
    const self = this

    obj.on('_update', function (update: Update) {
      if (self._disabledEmitter === name) {
        return
      }

      self.emit('_update', self.wrap(name, update))
    })

    obj.on('_remove', function (update) {
      const rm = self.wrap(name, update)
      self.emit('_remove', rm)
    })

    // all sub components are from the same machine and will share the same timestamps.
    // that is, the timestamps should be strictly monotonically increasing.
    setId(obj, this.id)
    return this
  }

  private wrap(name: string, update: Update) {
    const value = update[UpdateItems.Data]
    const newUpdate: Update = [...update] as Update
    newUpdate[UpdateItems.Data] = [name, value]
    return newUpdate
  }

  private onJobListEvent(eventName: string, ...argv: any[]) {
    this._jobListEventEmitter.emit(eventName, ...argv)
  }
}
