const mongoose = require("mongoose");
const db = require("../models");
const controllers = require("../controllers");
mongoose.Promise = global.Promise;


mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost/GameCollection",
  {
    useMongoClient: true
  }
);

switch (process.argv[2]) {
	case "-all":
		all();
		break;
	case "-platforms":
		platforms();
		break;
	case "-gameList":
		gameList();
		break;
	case "-gameDetails":
		gameDetails();
		break;
	default:
		console.log("Use -all -platforms -gameList or -gameDetails as third argument");
		break;
}

function all() {
	controllers.data.getGamesDB()
		.then(result => {
			// console.log(JSON.stringify(result, null, 2));
			console.log("Result lenghth in seedDB.js", result.length);
			process.exit();
		})
		.catch(err => {
			process.exit();
		});
}

function platforms() {
	controllers.data.getPlatformsGamesDB()
		.then(result => {
			console.log(`Found ${result.length} platforms and added them to the database.`);
			process.exit();
		})
		.catch(err => {
			console.log(err);
			process.exit();
		});
}

const wait = ms => new Promise((resolve) => setTimeout(resolve, ms));

const recusiveGameList = async function(platforms, errorTolerance) {
	console.log(`There are ${platforms.length} left to download`);
	if (!platforms.length) {
		console.log("Got all platforms")
		process.exit();
	} else if (errorTolerance === 0) {
		console.log("Too many errors. Quitting, try again using 'yarn seed-list'.");
		process.exit();
	} else {
		const platform = platforms.pop();
		console.log(`Waiting to download game list for ${platform.name}`)
		await wait(1000);
		console.log(`Looking for ${platform.name} games`);
		controllers.data.getGamesByPlatform(platform)
			.then(res => {
				console.log(`Got ${res.length} games inserted into the database`);
				recusiveGameList(platforms, errorTolerance);
			})
			.catch(err => {
				platforms.push(platform);
				recusiveGameList(platforms, errorTolerance--);
			})
	}
}

function gameList() {
	db.Platform.find({downloaded: false})
		.then(platforms => {
			console.log(`Found ${platforms.length} platforms where the games haven't been downloaded`)
			recusiveGameList(platforms, 20)
		})
		.catch(err => {
			console.log(err);
			process.exit();
		});
}

const recursiveGameDetials = async function(games, errorTolerance) {
	console.log(`There are ${games.length} left to download`);
	if(!games.length) {
		db.Game.find({downloaded: false})
			.then(res => {
				if (res.length) {
					recursiveGameDetials(res, errorTolerance);
				} else {
					console.log("Got all games")
					process.exit();
				}
			})
	} else if (errorTolerance === 0) {
		console.log("Too many erros. Quitting, try again using 'yarn seed-details'.");
		process.exit();
	} else {
		const game = games.pop();
		// console.log(`Waiting to download game list for ${game.title}`);
		// await wait(100);
		console.log(`Looking for ${game.title} details`);
		controllers.data.getGameData(game)
			.then(res => {
				console.log(`Inserted ${res.title} details into database.`);
				recursiveGameDetials(games, errorTolerance);
			})
			.catch(err => {
				games.push(game);
				recursiveGameDetials(games, errorTolerance--);
			})
	}
}

function gameDetails() {
	db.Game.find({downloaded: false})
		.then(games => {
			console.log(`Found ${games.length} games where the details haven't been downloaded`)
			recursiveGameDetials(games, 20);
		})
		.catch(err => {
			console.log(err);
			process.exit();
		});
}


