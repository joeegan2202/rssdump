import express from 'express'
import path from 'path'
import crypto from 'crypto'
import { default as mongodb} from 'mongodb'
import startup from './startup.js'

let MongoClient = mongodb.MongoClient

global.db = null
global.startup = true

const app = express()

app.use(express.json())

MongoClient.connect(`mongodb://${process.env.RSS_MONGO_USER}:${process.env.RSS_MONGO_PASS}@${process.env.RSS_MONGO_ADDRESS}:27017/`, (err, res) => {
  if (err) throw err

  db = res.db(process.env.RSS_DATABASE_NAME)

  db.collection('startup').countDocuments((err, res) => {
    if (err) console.log(err)

    global.startup = !res
  })
})

app.get('*', (req, res, next) => {
  if (global.startup) {
    res.sendFile(path.resolve('./startup.html'))
  } else {
    express.static('client/build')(req, res, next)
  }
})

app.post('/api/startup', startup)

app.get('/api/auth', (req, res) => {
  let password = crypto.createHash('sha256').update(req.body.pass).digest('hex')

  let status = -1
  db.collection('users').find({
    name: req.body.user,
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
          name: req.body.user,
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