import { link } from '@jacobbubu/scuttlebutt-pull'
import { CappedJobList } from '../src'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const main = async () => {
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
  console.log(a.toJSON(), b.toJSON(), c.toJSON())

  console.log("\n--- So far we haven't reached the threshold for cleanup. ---\n")

  const b2c = b.createStream({ name: 'b-c' })
  const c2b = c.createStream({ name: 'c-b' })
  link(b2c, c2b)

  await delay(10)
  console.log(a.toJSON(), b.toJSON(), c.toJSON())

  console.log(`A knows ${job1.id} has done on ${a.getNotifiedCount(job1.id)} peers`)
  console.log(`B knows ${job1.id} has done on ${b.getNotifiedCount(job1.id)} peers`)
}

// tslint:disable-next-line no-floating-promises
main()
