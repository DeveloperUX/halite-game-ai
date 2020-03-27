const constants = require('../hlt/Constants');
const Geometry = require('../hlt/Geometry');
const Log = require('../hlt/Log');

const ATTACK = 0;
const DEFEND = 1;
const HARVEST = 2;

class ShipAdapter {
  ship;
}

const attackDockedEnemyShips = ({ ship, enemyPlanets}) => {
  const planets = enemyPlanets
    .filter(p => byDistance(ship, p)(100))
    .sort((a, b) => byNearest(a, b)(ship));
  if (planets.length > 0) {
    Log.log('Attack docked enemy planets');
    return {
      ship,
      command: ATTACK,
      target: planets[0].dockedShips[0]
    }
  }
};

const attackEnemyShips = ({ ship, enemyShips}) => {
  const planets = enemyShips
    .filter(p => byDistance(ship, p)(60))
    .sort((a, b) => byNearest(a, b)(ship));
  if (planets.length > 0) {
    Log.log('Attack enemy planets');
    return {
      ship,
      command: ATTACK,
      target: planets[0]
    }
  }
};

const dockMyPlanet = ({ ship, myFreePlanets}) => {
  const planets = myFreePlanets.filter(p => byDistance(ship, p)(100));
  if (planets.length > 0) {
    Log.log('Dock existing planets');
    return {
      ship,
      command: HARVEST,
      target: planets[0]
    }
  }
};

const dockEmptyPlanet = ({ship, emptyPlanets}) => {
  const planets = emptyPlanets
    .filter(p => byDistance(ship, p)(200))
    .sort((a, b) => byNearest(a, b)(ship));
  if (planets.length > 0) {
    Log.log('Dock new planets');
    return {
      ship,
      command: HARVEST,
      target: planets[0]
    }
  }
};

const defendMyPlanet = ({ship, myDockedPlanets, myFreePlanets, enemyShips}) => {
  const myPlanets = [...myDockedPlanets, ...myFreePlanets];
  // which planets have an enemy nearby heading towards it?
  if (myPlanets.length > 0) {
    Log.log('Defend docked planets');
    const closestDockedPlanet = myPlanets[0];
    const attackingShips = enemyShips
      .filter(e => Geometry.distance(closestDockedPlanet, e) < 80 && e.isUndocked() && !e.isDocking())
      .sort((a, b) => Geometry.distance(ship, a) - Geometry.distance(ship, b));
    if (attackingShips.length > 0) {
      // attack this ship
      return {
        ship,
        command: ATTACK,
        target: attackingShips[0]
      }
    }
  }
};


const aggressive = ({ ship, enemyShips, myDockedPlanets, myFreePlanets, enemyPlanets, emptyPlanets}) => {
  return {
    ...dockMyPlanet({ship, myFreePlanets}),
    ...dockEmptyPlanet({ship, emptyPlanets}),
    ...defendMyPlanet({ship, myDockedPlanets, myFreePlanets, enemyShips}),
    ...attackDockedEnemyShips({ship, enemyPlanets}),
    ...attackEnemyShips({ship, enemyShips}),
  }
};

const byNearest = (a, b) => point => Geometry.distance(point, a) - Geometry.distance(point, b);
const byDistance = (a, b) => distance => Geometry.distance(a, b) < distance;

class Commander {

  map;
  turn;
  goal;
  curShip;
  plot;

  constructor(map) {
    this.map = map;
    this.turn = 0;
    this.goal = {};
    this.plot = aggressive;
  }

  getMyPlanets(planets) {
    return planets
      .filter(p => p.isOwnedByMe())
      // .sort((a, b) => Geometry.distance(this.curShip, a) - Geometry.distance(this.curShip, b));
  }

  getDockedPlanets(planets) {
    return planets
      .filter(p => !p.hasDockingSpot())
      // .sort((a, b) => Geometry.distance(this.curShip, a) - Geometry.distance(this.curShip, b));
  }

  getFreePlanets(planets) {
    return planets
      .filter(p => p.hasDockingSpot())
      // .sort((a, b) => Geometry.distance(this.curShip, a) - Geometry.distance(this.curShip, b));
  }

  getEmptyPlanets(planets) {
    return planets
      .filter(p => p.isFree())
      // .sort((a, b) => Geometry.distance(this.curShip, a) - Geometry.distance(this.curShip, b));
  }

  getEnemyPlanets(planets) {
    return planets
      .filter(p => p.isOwnedByEnemy())
      // .sort((a, b) => Geometry.distance(this.curShip, a) - Geometry.distance(this.curShip, b));
  }

  strategize(gameMap, ship) {
    this.curShip = ship;
    // Get the nearest docked planet
    const { planets, enemyShips } = gameMap;
    const myPlanets = this.getMyPlanets(planets);
    const myDockedPlanets = this.getDockedPlanets(myPlanets);
    const myFreePlanets = this.getFreePlanets(myPlanets);
    const enemyPlanets = this.getEnemyPlanets(planets);
    const emptyPlanets = this.getEmptyPlanets(planets);

    // Commands in order of priority
    // 1. Defend Docked planets
    // 2. Dock new planets
    // 3. Dock existing planets
    // 4. Attack enemy planets

    const goal = this.plot({
      ship,
      enemyShips,
      myDockedPlanets,
      myFreePlanets,
      enemyPlanets,
      emptyPlanets,
    });

    if (Object.keys(goal).length !== 0) {
      this.setShipGoal({
        ...goal
      });
    }

  }

  setShipGoal({ship, command, target}) {
    this.goal[ship.id] = { id: ship.id, command, target }
  }

  getNextMoves(ships) {
    let defaults = {
      keepDistanceToTarget: 0,
      speed: constants.MAX_SPEED,
      avoidObstacles: true,
      ignoreShips: false
    };
    let details = {};
    return ships.map(ship => {

      const goal = this.goal[ship.id];

      if (goal) {

        if (goal.command === ATTACK) {
          details = {
            keepDistanceToTarget: constants.WEAPON_RADIUS + constants.SHIP_RADIUS
          };
        }
        else if (goal.command === DEFEND) {
          details = {
            keepDistanceToTarget: constants.WEAPON_RADIUS + constants.SHIP_RADIUS
          };
        }
        else if (goal.command === HARVEST) {
          details = {
            keepDistanceToTarget: goal.target.radius + 3
          };
          if (ship.canDock(goal.target)) {
            return ship.dock(goal.target);
          }
        }

        return ship.navigate({
          target: goal.target,
          ...defaults,
          ...details
        })
      }
      else {
        return null
      }
    })
  }
}

module.exports = {
  Commander
};