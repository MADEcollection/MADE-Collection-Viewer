const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GameSchema = new Schema({
	theGamesDBId: {
		type: Number,
		unique: true,
		sparse: true
	},
	title: {
		type: String,
		default: ''
	},
	platformId: {
		type: Number,
		ref: "Platform"
	},
	platform: {
		type: String,
		default: ''
	},
	release: {
		type: Date,
	},
	overview: {
		type: String,
	},
	esrb: {
		type: String,
	},
	players: {
		type: String,
	},
	coop: {
		type: Boolean,
		default: false
	},
	publisher: {
		type: String,
		default: ''
	},
	developer: {
		type: String,
	},
	genres: [
		{
			type: String
		}
	],
	boxartFront: {
		type: String,
	},
	boxartBack: {
		type: String,
	},
	similar: [
		{
			type: Number,
			ref: "Game"
		}
	],
	copies: {
		type: Number,
		default: 0
	},
	collected: {
		type: Boolean,
		default: false
	},
	popularity: {
		type: Number,
		default: 0
	},
	downloaded: {
		type: Boolean,
		default: false
	}
}, { timestamps: true });

const Game = mongoose.model("Game", GameSchema);

// Export the Game model
module.exports = Game;