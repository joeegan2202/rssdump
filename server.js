import 'express'
import 'path'
import 'crypto'
import { MongoClient } from 'mongodb'

let db = null
let startup = true

const app = express()

MongoClient.connect(`mongodb://${process.env.RSS_MONGO_ADDRESS}:27017/`, (err, res) => {
  if (err) throw err

  db = res.db(process.env.RSS_DATABASE_NAME)

  db.collection('startup').countDocuments((err, res) => {
    if (err) console.log(err)

    startup = !res
  })
})

app.get('/', (req, res) => {
  if (startup) {
    res.sendFile(path.join(__dirname, 'startup.html'))
  } else {
    express.static('client/build')(req, res)
  }
})

app.get('/api/startup', (req, res) => {
  if (!startup) return

  console.log(req.query)

  db.collection('users').insertOne({
    name: req.query.name,
    password: crypto.createHash('sha256').update(req.query.pass).digest('hex')
  }, (err, id) => {
    if (err) {
      res.send({err: true, msg: `Error inserting user ${req.query.user}`})
      return
    }

    db.collection('startup').insertOne({started: true}, (err, id) => {
      if (err) {
        res.send({err: true, msg: `Could not update startup flag!`})
        return
      }

      startup = false

      res.send({err: false})
    })
  })
})

app.get('/api/auth', (req, res) => {
  let password = crypto.createHash('sha256').update(req.query.pass).digest('hex')

  let status = -1
  db.collection('users').find({
    name: req.query.user,
  }).forEach((user) => {
    status = 0
    if (user.password === password) {
      res.send({err: false})
      status = 1
    }
  })

  switch(status) {
    case -1:
      res.send({err: true, msg: 'Username does not exist!'})
      break
    case 0:
      res.send({err: true, msg: 'Password does not match!'})
      break
    case 1:
      db.collection('sessions').deleteMany({
        timestamp: { $lt: Date.now() - 24 * 3600 * 1000 }
      }, (err, id) => {
        if (err) {
          res.send({err: true, msg: 'Error trying to clear old sessions!'})
          return
        }

        let sessionId = crypto.createHash('sha256').write(crypto.randomBytes(2048)).digest('hex')

        db.collection('sessions').insertOne({
          _id: sessionId,
          name: req.query.user,
          timestamp: Date.now()
        }, (err, id) => {
          if (err) {
            res.send({err: true, msg: 'Failed to insert session!'})
            return
          }

          res.cookie('session', sessionId, {
            secure: true,
            httpOnly: true,
            maxAge: 24 * 3600 * 1000
          })
          res.send({err: false, msg: 'Successful authentication'})
        })
      })
  }
})

app.listen(8080, () => {
  console.log('Listening on port 8080')
})