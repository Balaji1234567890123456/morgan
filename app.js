const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const path = require('path')
const jwt = require('jsonwebtoken')

const datapath = path.join(__dirname, 'twitterClone.db')
let db = null

app.use(express.json())

const initialization = async () => {
  try {
    db = await open({filename: datapath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('success')
    })
  } catch (e) {
    console.log(`${e.message}`)
    process.exit(1)
  }
}

initialization()

const balu = (request, response, next) => {
  let jwt_token = ''
  const authHeader = request.headers['authorization']
  if (authHeader === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    const p = authHeader.split(' ')
    jwt_token = p[1]
    if (jwt_token === undefined) {
      response.status(401)
      response.send('Invalid JWT Token')
    } else {
      jwt.verify(jwt_token, 'balu', async (error, payload) => {
        if (error) {
          response.status(401)
          response.send('Invalid JWT Token')
        } else {
          request.payload = payload

          next()
        }
      })
    }
  }
}
const kabir = async (request, response, next) => {
  const {payload} = request

  const {user_id, username} = payload
  const {tweetId} = request.params
  const {tweet} = request
  const y = `SELECT tweet
           FROM tweet INNER JOIN  follower ON tweet.user_id=follower.following_user_id
           WHERE   tweet.tweet_id=${tweetId} AND follower_user_id=${user_id};`
  const u = await db.get(y)
  if (u === undefined) {
    response.status(401)
    response.send('Invalid Request')
  } else {
    console.log(tweetId)
    console.log(user_id)
    next()
  }
}

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const c = `SELECT *
             FROM user
             WHERE username="${username}";`
  const y = await db.get(c)
  if (y !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const k = await bcrypt.hash(password, 10)
      const d = `INSERT INTO user
                     (username,password,name,gender)
                     VALUES ("${username}","${k}","${name}","${gender}")`
      const e = await db.run(d)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const d = `SELECT *
          FROM user
          WHERE username="${username}";`
  const y = await db.get(d)
  if (y === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const x = await bcrypt.compare(password, y.password)
    if (x === false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = y

      const jwtToken = jwt.sign(payload, 'balu')
      response.send({jwtToken})
    }
  }
})

app.get('/user/tweets/feed', balu, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = payload
  console.log(name)
  const u = `SELECT username, tweet, date_time AS dateTime
             FROM follower
             INNER JOIN tweet ON follower.following_user_id = tweet.user_id
             INNER JOIN user ON user.user_id = follower.following_user_id
             WHERE follower.follower_user_id = ${user_id}
             ORDER BY date_time DESC
             LIMIT 4;`
  const c = await db.all(u)
  response.send(c)
})

app.get('/user/following', balu, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = payload
  console.log(user_id)
  const t = `SELECT user.name
             FROM user
             INNER JOIN follower ON user.user_id = follower.following_user_id
             WHERE follower.follower_user_id = ${user_id};`
  const h = await db.all(t)
  response.send(h)
})
app.get('/user/followers/', balu, async (request, response) => {
  const {payload} = request
  const {username, user_id, name, gender} = payload
  const i = `SELECT user.name
          FROM user INNER JOIN follower ON user.user_id=follower.follower_user_id
          WHERE follower.following_user_id=${user_id}; `
  const k = await db.all(i)
  response.send(k)
})
app.get('/tweets/:tweetId/', balu, kabir, async (request, response) => {
  const {payload} = request
  const {user_id, username} = payload
  const {tweetId} = request.params
  const h = `SELECT tweet,count(distinct like_id) as likes ,count( distinct reply_id) as replies,date_time as dateTime
             FROM user inner join follower on user.user_id =follower.following_user_id inner join tweet  on tweet.user_id=follower.following_user_id inner join like on tweet.tweet_id=like.tweet_id inner join reply on  tweet.tweet_id=reply.tweet_id
             where tweet.tweet_id=${tweetId} AND follower.follower_user_id=${user_id}; 
             ;
           `
  const z = await db.get(h)
  console.log(z)

  response.send(z)
})

app.get('/tweets/:tweetId/likes/', balu, kabir, async (request, response) => {
  const {tweetId} = request.params
  const {payload} = request
  const {username, user_id} = payload
  const f = `SELECT username

            FROM user INNER JOIN like ON user.user_id=like.user_id
            WHERE tweet_id=${tweetId} `

  const k = await db.all(f)
  console.log(k)
  const z = k.map(eachItem => eachItem.username)
  response.send({likes: z})
})
app.get('/tweets/:tweetId/replies/', balu, kabir, async (request, response) => {
  const {tweetId} = request.params
  const {payload} = request
  const {username, user_id} = payload
  const a = `SELECT name,reply
           FROM user INNER JOIN reply ON user.user_id=reply.user_id
           WHERE tweet_id=${tweetId};`
  const d = await db.all(a)

  response.send({replies: d})
})
app.get('/user/tweets/', balu, async (request, response) => {
  const {payload} = request
  const {user_id, username} = payload

  const o = `SELECT tweet,COUNT(distinct like_id)  AS likes ,COUNT(distinct reply_id)   AS replies,date_time AS dateTime
             FROM tweet INNER JOIN like ON tweet.tweet_id=like.tweet_id INNER JOIN reply ON tweet.tweet_id=reply.tweet_id
             WHERE tweet.user_id=${user_id}
             GROUP BY tweet.tweet_id;`
  const i = await db.all(o)
  response.send(i)
})
app.post('/user/tweets/', balu, async (request, response) => {
  const {tweet} = request.body
  const {tweetId} = request
  const {payload} = request

  const {user_id} = payload
  const c = `INSERT INTO tweet(tweet,user_id)
  VALUES ("${tweet}",${user_id});`
  await db.run(c)
  response.send('Created a Tweet')
})
app.delete('/tweets/:tweetId/', balu, async (request, response) => {
  const {tweetId} = request.params
  const {payload} = request
  const {user_id} = payload
  const h = `SELECT *
          FROM tweet
          WHERE user_id=${user_id} AND tweet_id=${tweetId};`
  const j = await db.get(h)
  if (j !== undefined) {
    const v = `DELETE FROM tweet
             WHERE tweet_id=${tweetId}`
    await db.run(v)
    response.send('Tweet Removed')
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

module.exports=app;
