let Game = require('../models/game')
let Player = require('../models/player')
let Ans = require('../models/ans')
let Quest = require('../models/quest')
let Question = require('../models/question')
const { error400, error403, error401 } = require('../common/constant/error').CODE
let Utility = require('../common/utility')

let QuestController = {
  /**
   * TODO get quests of user
   * @param {String} idUser
   * @returns {Promise<Array>} quests
   */
  getQuestsOfUser: async idUser => {
    try {
      let quests = await Quest.find({ id_author: idUser }).exec()
      return quests
    } catch (error) {
      console.log(error)
      return []
    }
  },
  /**
   * TODO get quests of user
   * @param {String} idUser
   * @param {String} idQuest
   * @returns {Promise<Object>} quest
   */
  getInfo: async (idUser, idQuest) => {
    try {
      let quest = await Quest.findOne({ id_author: idUser, _id: idQuest }).exec()
      return quest
    } catch (error) {
      console.log(error)
      return null
    }
  },
  /**
   * TODO get quests of user
   * @param {
    {
      description: String, 
      img_path: String, 
      title: String, 
      is_public: Boolean}
    } nQuest
   * @returns {Promise<Array>} quests
   */
  createQuest: async (nQuest, user) => {
    let newQuest = new Quest({
      ...nQuest,
      questions: [],
      id_author: user._id,
      deleted: false,
    })
    try {
      let res = await newQuest.save()
      return res
    } catch (error) {
      throw error
    }
  },
  editQuest: (nQuest, user) => {},
  addQuestion: async (nQuestion, idUser) => {
    let quest = await Quest.findById(nQuestion._id)
    if (quest.id_author.toString() != idUser) {
      throw new Error("DON'T HAVE PERMISSION")
    } else {
      try {
        let newQuestion = new Question({
          ...nQuestion,
          _id: quest.questions.length + 1,
          ans: [],
          correct_id: parseInt(nQuestion.correct_id),
          n_correct_answer: 0,
          n_incorrect_answer: 0,
          like: 0,
          deleted: false,
        })
        for (let i = 0; i < nQuestion.ans.length; i++) {
          let newAns = new Ans({
            _id: i + 1,
            content: nQuestion.ans[i],
          })
          newQuestion.ans.push(newAns)
        }
        quest.questions.push(newQuestion)
        let res = await quest.save()
        return res
      } catch (error) {
        throw error
      }
    }
  },
  //start quest/create game
  startQuest: async (token, idQuest) => {
    let user = await Utility.verifyToken(token)
    if (user) {
      let quest = await Quest.findById(idQuest)
      if (quest && !quest.is_public && quest.id_author !== user._id) {
        throw new Error(error403)
      } else {
        try {
          let newGame = new Game({
            id_quest: quest._id,
            id_host: user._id,
            players: [],
          })
          let game = await newGame.save()
          user.game_history.push(game._id)
          await user.save()
          return game._id
        } catch (error) {
          throw error
        }
      }
    } else {
      throw new Error(error401)
    }
  },
  getGameCode: async (idGame, token) => {
    let user = await Utility.verifyToken(token)
    if (user && user._id == idGame) {
      let code = Utility.getCodeGame(idGame)
      if (code) {
        return code
      } else throw new Error('END_GAME')
    } else {
      throw new Error(error403)
    }
  },
  joinQuest: async (idGame, username, token) => {
    username = username.toLowerCase()
    let game = await Game.findOne({ _id: idGame }).exec()
    if (!game) {
      throw new Error('GAME_NOT_EXIST')
    }
    let existUsername = game.players.find(answer => answer.username == username)
    if (existUsername) {
      throw new Error('DUPLICATE_USERNAME')
    } else {
      let newPlayer = new Player({
        username: username,
        ans: [],
        time: 0,
      })
      game.players.push(newPlayer)
      try {
        let game = await game.save()
        if (game && token) {
          let user = await Utility.verifyToken(token)
          if (user && user._id.toString() == game.id_host.toString()) {
            return true
          } else {
            user.game_history.push(game._id)
            await user.save()
            return true
          }
        }
      } catch (error) {
        throw error
      }
    }
  },
  removePlayer: async (_id, username) => {
    let game = await Game.findOne({ _id }).exec()
    let posUser = game.players.findIndex(
      player => player.username.toLowerCase() == username.toLowerCase()
    )
    game.players = game.players.splice(posUser, 1)
    game.save()
  },
  answer: async (_id, username, idAnswer, time) => {
    let game = await Game.findOne({ _id }).exec()
    let posUser = game.players.findIndex(
      player => player.username.toLowerCase() == username.toLowerCase()
    )
    game.players[posUser].ans.push(idAnswer)
    game.players[posUser].time += time
    let { id_quest } = game
    try {
      await game.save()
      return id_quest
    } catch (error) {
      throw error
    }
  },
  getPointOfUserInGame: async (idGame, username) => {
    let game = await Game.findOne({
      _id: idGame,
      players: { $elemMatch: { username } },
    })
    if (game == null) {
      return -1
    } else {
      let gameOfUser = game.players.find()
    }
  },
  getAllQuestionsOfQuest: async idQuest => {
    try {
      let questions = await Quest.findById(idQuest)
        .select('questions')
        .exec()
      return questions
    } catch (error) {
      throw error
    }
  },
  //get info quests
  getPublicInfoQuest: async _id => {
    try {
      let quest = await Quest.findOne({ _id, is_public: true, deleted: false }).exec()
      let retQuest = { ...quest }
      retQuest.questions = Array.from(quest.questions).map(v => v.toJSON())
      return retQuest
    } catch (error) {
      throw error
    }
  },
  //get quest from idGame
  getQuestFromIdGame: async idGame => {
    let game = await Game.findById(idGame)
    let quest = await Quest.findById(game.id_quest)
    return quest
  },
  //get all quests
  getPublicQuests: async (limit, skip) => {
    limit = Number.parseInt(limit)
    skip = Number.parseInt(skip)
    try {
      let quests = await Quest.find({ is_public: true, deleted: false })
        .limit(limit || 25)
        .skip(skip)
        .exec()
      let retQuest = []
      quests.forEach(quest => {
        let nQuest = { ...quest._doc }
        nQuest.questions = Array.from(quest.questions).map(v => v.toJSON())
        retQuest.push(nQuest)
      })
      return retQuest
    } catch (error) {
      throw error
    }
  },
}
module.exports = QuestController
