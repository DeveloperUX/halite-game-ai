const constants = require('../hlt/Constants');
const Geometry = require('../hlt/Geometry');
const Logging = require('../hlt/Log');

/**
 * strategy is a function that accepts the current game map and return a list of next steps to take
 * @param {GameMap} gameMap
 * @returns {string[]} moves that needs to be taken. null values are ignored
 */
function fastStrategy(gameMap) {
    // Here we build the set of commands to be sent to the Halite engine at the end of the turn
    // one ship - one command
    // in this particular strategy we only give new commands to ships that are not docked
    const moves = gameMap.myShips
        .filter(s => s.isUndocked())
        .map(ship => {
            // find the planets that are free or occupied by you
            const planetsOfInterest = gameMap.planets.filter(p => p.isFree() ||
                (p.isOwnedByMe() && p.hasDockingSpot() ));

            if (planetsOfInterest.length === 0) {
                return null; // if all the planets are taken we return null - no move for this ship
            }

            // sorting planets based on the distance to the ship
            const sortedPlants = [...planetsOfInterest].sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
            const chosenPlanet = sortedPlants[0];

            if (ship.canDock(chosenPlanet)) {
                return ship.dock(chosenPlanet);
            } else {
                /*
                 If we can't dock, we approach the planet with constant speed.
                 Don't worry about pathfinding for now, as the command will do it for you.
                 We run this navigate command each turn until we arrive to get the latest move.
                 Here we move at half our maximum speed to better control the ships.
                 Navigate command is an example and most likely you will have to design your own.
                 */
                return ship.navigate({
                    target: chosenPlanet,
                    keepDistanceToTarget: chosenPlanet.radius + 3,
                    speed: constants.MAX_SPEED,
                    avoidObstacles: true,
                    ignoreShips: false
                });
            }
        });

    return moves; // return moves assigned to our ships for the Halite engine to take
}

function attackStrategy(gameMap) {
  // Here we build the set of commands to be sent to the Halite engine at the end of the turn
  // one ship - one command
  // in this particular strategy we only give new commands to ships that are not docked
  const moves = gameMap.myShips
    .filter(s => s.isUndocked())
    .map(ship => {
      // find the planets that are free or occupied by you
      const planetsOfInterest = gameMap.planets.filter(p => p.isFree() ||
        (p.isOwnedByMe() && p.hasDockingSpot() ));

      if (planetsOfInterest.length === 0) {
        // Find an enemy ship to attack
        const sortedEnemyShips = [...gameMap.enemyShips].sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
        const closestEnemyShip = sortedEnemyShips[0];
        if (Geometry.distance(closestEnemyShip, ship) <= 5) {
          // enemy within firing range don't move!
          return null
        } else {
          return ship.navigate({
            target: closestEnemyShip,
            speed: constants.MAX_SPEED / 10,
            avoidObstacles: true,
            ignoreShips: false
          });
        }
      }

      // sorting planets based on the distance to the ship
      const sortedPlants = [...planetsOfInterest].sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
      const chosenPlanet = sortedPlants[0];

      if (ship.canDock(chosenPlanet)) {
        return ship.dock(chosenPlanet);
      } else {
        /*
         If we can't dock, we approach the planet with constant speed.
         Don't worry about pathfinding for now, as the command will do it for you.
         We run this navigate command each turn until we arrive to get the latest move.
         Here we move at half our maximum speed to better control the ships.
         Navigate command is an example and most likely you will have to design your own.
         */
        return ship.navigate({
          target: chosenPlanet,
          keepDistanceToTarget: chosenPlanet.radius + 3,
          speed: constants.MAX_SPEED / 2,
          avoidObstacles: true,
          ignoreShips: false
        });
      }
    });

  return moves; // return moves assigned to our ships for the Halite engine to take
}


let initialTargets;
function scatterStrategy(gameMap) {
  let settingUp = true;
  Logging.log('initialTargets: ' + initialTargets);
  // find the planets that are free or occupied by you
  const emptyPlanets = gameMap
    .planets
    .filter(p => p.isFree() );
  const myFreePlanets = gameMap
    .planets
    .filter(p => p.isOwnedByMe() && p.hasDockingSpot() );

  // just starting!
  if (settingUp && gameMap.myShips.length === 3 && !initialTargets) {
    let i = 0;
    gameMap.myShips.map(ship => {
      const target = [...emptyPlanets].sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b))[i];
      Logging.log('ship id : ' + ship.id + ' - target : ' + target.id);
      initialTargets = {
        ...initialTargets,
        [ship.id]: target
      };
      i++;
    });
  }
  else if (settingUp && initialTargets && gameMap.myShips.length === 3) {
    return Object.keys(initialTargets).map(shipId => {
      const ship = gameMap.shipById(shipId);
      const targetPlanet = initialTargets[shipId];
      if (ship.canDock(targetPlanet)) {
        return ship.dock(targetPlanet);
      }
      return ship.navigate({
        target: targetPlanet,
        keepDistanceToTarget: targetPlanet.radius + 3,  // stay within firing distance
        speed: constants.MAX_SPEED,
        avoidObstacles: true,
        ignoreShips: false
      })
    });
  }
  else {
    settingUp = false;
  }

  // Here we build the set of commands to be sent to the Halite engine at the end of the turn
  // one ship - one command
  // in this particular strategy we only give new commands to ships that are not docked
  const moves = gameMap.myShips
    .filter(s => s.isUndocked())
    .map(ship => {
      if (emptyPlanets.length === 0 && myFreePlanets.length === 0) {
        // ATTACK!
        // Find an enemy ship to attack
        const sortedEnemyShips = [...gameMap.enemyShips]
          .filter(enemyShip => enemyShip.isDocked() || enemyShip.isDocking())
          .sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));

        const closestEnemyShip = sortedEnemyShips[0];
        return ship.navigate({
          target: closestEnemyShip,
          keepDistanceToTarget: 5,  // stay within firing distance
          speed: constants.MAX_SPEED,
          avoidObstacles: true,
          ignoreShips: false
        });
      }

      // sorting planets based on the distance to the ship
      const closestEmptyPlanets = [...emptyPlanets].sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
      const closestOpenPlanets = [...myFreePlanets].sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));

      let targetPlanet = closestOpenPlanets[0];

      if (closestEmptyPlanets.length > 0) {
        targetPlanet = closestEmptyPlanets[0];
      }

      if (ship.canDock(targetPlanet)) {
        return ship.dock(targetPlanet);
      } else {
        /*
         If we can't dock, we approach the planet with constant speed.
         Don't worry about pathfinding for now, as the command will do it for you.
         We run this navigate command each turn until we arrive to get the latest move.
         Here we move at half our maximum speed to better control the ships.
         Navigate command is an example and most likely you will have to design your own.
         */
        return ship.navigate({
          target: targetPlanet,
          keepDistanceToTarget: targetPlanet.radius + 3,
          speed: constants.MAX_SPEED,
          avoidObstacles: true,
          ignoreShips: false
        });
      }
    });

  return moves; // return moves assigned to our ships for the Halite engine to take
}

module.exports = {fastStrategy, attackStrategy, scatterStrategy};