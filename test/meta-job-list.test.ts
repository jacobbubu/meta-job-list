import { link } from '@jacobbubu/scuttlebutt-pull'
import { CappedJobList } from '../src'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('basic', () => {
  it('simple', async () => {
    const threshold = 3
    const a = new CappedJobList({ id: 'A', threshold })
    const b = new CappedJobList({ id: 'B', threshold })
    const c = new CappedJobList({ id: 'C', threshold })

    const job1 = a.create({ id: 'job-1', initial: 'META-1' })

    job1.done(null, 'DONE')

    const a2b = a.createStream({ name: 'a-b' })
    const b2a = b.createStream({ name: 'b-a' })
    link(a2b, b2a)

    await delay(10)

    let aToJSON = a.toJSON()
    let bToJSON = b.toJSON()
    let cToJSON = c.toJSON()

    expect(aToJSON['JobList'].length).toBe(1)
    expect(Object.keys(aToJSON['Meta'][job1.id])).toEqual([a.id, b.id])

    expect(bToJSON['JobList'].length).toBe(1)
    expect(Object.keys(bToJSON['Meta'][job1.id])).toEqual([a.id, b.id])

    expect(cToJSON['JobList'].length).toBe(0)
    expect(cToJSON['Meta']).toEqual({})

    const b2c = b.createStream({ name: 'b-c' })
    const c2b = c.createStream({ name: 'c-b' })
    link(b2c, c2b)

    await delay(10)

    aToJSON = a.toJSON()
    bToJSON = b.toJSON()
    cToJSON = c.toJSON()

    expect(aToJSON['JobList'].length).toBe(0)
    expect(Object.keys(aToJSON['Meta'][job1.id])).toEqual([a.id, b.id, c.id])

    expect(bToJSON['JobList'].length).toBe(0)
    expect(Object.keys(bToJSON['Meta'][job1.id])).toEqual([a.id, b.id, c.id])

    expect(cToJSON['JobList'].length).toBe(0)
    expect(Object.keys(cToJSON['Meta'][job1.id])).toEqual([a.id, b.id, c.id])
  })
})
