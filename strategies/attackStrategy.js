const constants = require('../hlt/Constants');
const Geometry = require('../hlt/Geometry');
const Logging = require('../hlt/Log');

function attackStrategy(gameMap) {
  // Here we build the set of commands to be sent to the Halite engine at the end of the turn
  // one ship - one command
  // in this particular strategy we only give new commands to ships that are not docked
  const moves = gameMap.myShips
    .filter(s => s.isUndocked())
    .map(ship => {
      // If we have more than 2 planets go on the attack!
      const numOfPlanets = gameMap.planets.filter(p => p.isOwnedByMe() && !p.hasDockingSpot()).length;
      if (numOfPlanets > 0) {
        // attack

        const vulnerableShips = gameMap.enemyShips
          .filter(s => s.isDocking() || s.isDocked())
          .sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
        // const vulnerablePlanets = gameMap.planets.filter(p => p.isOwnedByEnemy()).sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
        return ship.navigate({
          target: vulnerableShips[0],
          keepDistanceToTarget: constants.WEAPON_RADIUS,
          // target: vulnerablePlanets[0],
          speed: constants.MAX_SPEED,
          avoidObstacles: true,
          ignoreShips: true

        })
      }
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
            speed: constants.MAX_SPEED,
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
          speed: constants.MAX_SPEED,
          avoidObstacles: true,
          ignoreShips: false
        });
      }
    });

  return moves; // return moves assigned to our ships for the Halite engine to take
}


module.exports = {attackStrategy};