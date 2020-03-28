const {Commander} = require('../ai/commander');
const Game = require('../hlt/Game');
const Log = require('../hlt/Log');

// start a game with a bot named 'JsBot'
// and a strategy defaultStrategy defined in strategies.js
// it is defined a separate file so you can unit test it in strategies.test.js
let turn = 0;
let commander;

Game.start({
  botName: 'SmartBot',
  preProcessing: map => {
    commander = new Commander(map);
    Log.log('creating commander start: ' + JSON.stringify(commander.goal));
  },
  strategy: (gameMap) => {
    // console.log('turn: ', turn);
    Log.log('turn: ' + turn);
    turn++;
    const freeShips = gameMap.myShips;//.filter(s => s.isUndocked());
    for (let ship of freeShips) {
      Log.log('--------------------- START ---------------------------');
      Log.log('Ship Plotting: ' + ship.id);
      commander.strategize(gameMap, ship);
      // Log.log('Ship Command: ' + commander.goal[ship.id]);
      Log.log('---------------------- END --------------------------');
    }
    return commander.getNextMoves(freeShips);
  }
});
