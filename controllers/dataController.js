const db = require("../models");
const request = require("request");
const buffer = require('request').defaults({encoding: null});
const parseString = require('xml2js').parseString;
const moment = require('moment');
// Controller for handling the collection 
module.exports = {
  getGiantBombGames: function(offset = 58600) {
    const options = {
      url: `https://www.giantbomb.com/api/games/?api_key=${process.env.GIANTBOMB_KEY}&format=JSON&offset=${offset}`,
      headers: {
        'User-Agent': process.env.USER_AGENT
      }
    };
    return new Promise((resolve, reject) => {
      options.url += '&limit=1';
      request(options, function(err, response, json) {
        if (err) reject(err);
        games = JSON.parse(json);
        console.log(JSON.stringify(games, null, 2));
        resolve('Success');
      });
    });
  },

  getPlatformsGamesDB: function() {
    return new Promise((resolve, reject) => {
      request("http://thegamesdb.net/api/GetPlatformsList.php", function(err, response, xml) {
        if (err) {
          reject(err);
        }

        parseString(xml, function(err, result) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            let platforms = result.Data.Platforms[0].Platform;
            const size = platforms.length;
            let count = size;
            for (let i = 0; i < size; i++) {
              let platform = {
                theGamesDBId: parseInt(platforms[i].id[0]),
                name: platforms[i].name[0],
              }
              if (platforms[i].alias) {
                platform.alias = platforms[i].alias[0];
              } else {
                platform.alias = platforms[i].name[0].toLowerCase().replace(" ", "-");
              }
              platforms[i] = platform;
            }
            return Promise.all(platforms.map(platform => {
                const newPlatform = new db.Platform(platform);
                return newPlatform.save()
                  .catch(err => console.log(err.message));
              }))
              .then(res => resolve(platforms))
              .catch(err => reject(err));
          };

        });
      });
    });
  },

  getGamesByPlatform: function(platform) {
    return new Promise((resolve, reject) => {
      request("http://thegamesdb.net/api/GetPlatformGames.php?platform=" + platform.theGamesDBId, function(err, response, xml) {
        if (err) {
          reject(err);
        }
        parseString(xml, function(err, result) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            if (result.Data.Game) {
              let games = result.Data.Game;
              const size = games.length;
              console.log(`Found ${size} games for ${platform.name}`);
              let count = size;
              for (let i = 0; i < size; i++) {
                let game = {
                  theGamesDBId: parseInt(games[i].id[0]),
                  title: games[i].GameTitle[0].trim(),
                  release: (games[i].ReleaseDate) ? moment.utc(games[i].ReleaseDate[0].trim(), ["MM/DD/YYYY", "YYYY"]) : '',
                  platformId: platform.theGamesDBId,
                  platform: platform.name.trim(),
                }
                games[i] = game;
              }
              return Promise.all(games.map(game => {
                  const newGame = new db.Game(game);
                  return newGame.save()
                    .catch(err => {
                      console.log(err.message, newGame.theGamesDBId, game.theGamesDBId)
                    });
                }))
                .then(res => {
                  return db.Platform.findOneAndUpdate({ theGamesDBId: platform.theGamesDBId }, { downloaded: true }, { new: true })
                    .then(res => resolve(games))
                    .catch(err => console.log(err.message));
                })
                .catch(err => reject(err));
            } else {
              return db.Platform.findOneAndUpdate({ theGamesDBId: platform.theGamesDBId }, { downloaded: true }, { new: true })
                .then(res => resolve([]))
                .catch(err => {
                  console.log(err.message)
                  resolve([])
                });
            }
          }
        });
      });
    });
  },

  getGameData: function(search) {
    return new Promise((resolve, reject) => {
      request("http://thegamesdb.net/api/GetGame.php?id=" + search.id, function(err, response, xml) {
        if (err) {
          console.log(err);
          reject(err);
        }
        parseString(xml, function(err, result) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            const gameRes = result.Data.Game[0];
            let game = {
              theGamesDBId: gameRes.id[0],
              title: gameRes.GameTitle[0].trim(),
              platformId: gameRes.PlatformId[0],
              platform: gameRes.Platform[0].trim(),
              release: (gameRes.ReleaseDate) ? moment.utc(gameRes.ReleaseDate[0].trim(), ["MM/DD/YYYY", "YYYY"]) : '',
              esrb: (gameRes.ESRB) ? gameRes.ESRB[0].trim() : '',
              overview: (gameRes.Overview) ? gameRes.Overview[0].trim() : '',
              publisher: (gameRes.Publisher) ? gameRes.Publisher[0].trim() : '',
              developer: (gameRes.Developer) ? gameRes.Developer[0].trim() : '',
              players: (gameRes.Players) ? gameRes.Players[0].trim() : '',
              downloaded: true
            }

            if (gameRes.Images) {
              if (Array.isArray(gameRes.Images[0].boxart)) {
                gameRes.Images[0].boxart.map((image, i) => {
                  if (image.$.side === 'back') {
                    game.boxartBack = "http://thegamesdb.net/banners/" + gameRes.Images[0].boxart[i]._;
                  }
                  if (image.$.side === 'front') {
                    game.boxartFront = "http://thegamesdb.net/banners/" + gameRes.Images[0].boxart[i]._;
                  }
                });
              } else if (gameRes.Images[0].boxart) {
                if (image.$.side === 'back') {
                  game.boxartBack = "http://thegamesdb.net/banners/" + gameRes.Images[0].boxart[i][0];
                }
                if (image.$.side === 'front') {
                  game.boxartFront = "http://thegamesdb.net/banners/" + gameRes.Images[0].boxart[i][0];
                }
              }
            };

            if (gameRes.Genres) {
              if (Array.isArray(gameRes.Genres)) {
                game.genres = gameRes.Genres.map(genre => genre.genre[0]);
              } else {
                game.genres = [gameRes.Genres[0].genre[0]];
              }
            }

            if (gameRes.Similar) {
              if (Array.isArray(gameRes.Similar[0].Game)) {
                game.similar = gameRes.Similar[0].Game.map(similar => similar.id[0])
              } else {
                game.similar = [gameRes.Similar[0].Game.id[0]]
              }
            }
            db.Game.findOne({ theGamesDBId: game.theGamesDBId })
              .then(res => {
                if (!res) {
                  const newGame = new db.Game(game);
                  return newGame.save();
                } else {
                  return db.Game.findOneAndUpdate({_id: res._id}, game, {new: true})
                } 
              })
              .then(res => {
                this.imgLinksToBase64(res);
                resolve(res);
              })
              .catch(err => console.log(err));
          }
        });
      });
    });
  },

  imgLinksToBase64: function(game) {
    let images = [];
    if (game.boxartFront) images.push(game.boxartFront);
    if (game.boxartBack) images.push(game.boxartBack);
  },

  toDataURL: function(link) {
    return new Promise( (resolve, reject) => {
      buffer.get(link, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
          resolve(data);
        } else {
          reject(error);
        }
      });
    });
  },

  getGamesDB: function() {
    return new Promise((resolve, reject) => {
      this.getPlatformsGamesDB()
        .then(platforms => {
          console.log("Getting games by platform");
          return Promise.all(platforms.map((platform, i) => {
            return this.getGamesByPlatform(platform);
          }));
        })
        .then(res => resolve(res))
        .catch(err => {
          reject(err);
        });
    });
  },

  updateList: async function(list, cb, errors = 20, games = []) {
    if (list.length) {
      const item = { id: list.pop() }
      console.log('Updating', item);
      this.getGameData(item)
        .then(res => {
          games.push(res);
          console.log(res);
          errors = 20;
          this.updateList(list, cb, errors, games)
        })
        .catch(err => {
          console.log(err);
          errors--;
          list.push(item.id);
          this.updateList(list, cb, errors, games)
        });
    } else if (errors === 0) {
      console.log('Too many errors');
      cb(games);
    } else {
      cb(games);
    }
  },

  updateGamesDB: function(time = 2592000) {
    return new Promise((resolve, reject) => {
      request('http://thegamesdb.net/api/Updates.php?time='+time, function(err, response, xml) {
        if (err) {
          console.log(err);
          reject(err);
        }
        parseString(xml, function(err, result) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            console.log(result);
            resolve(result.Items.Game);
          }
        });
      })
    })
  }
}