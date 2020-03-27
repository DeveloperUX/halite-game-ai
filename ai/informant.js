
function getShipsData(gameMap) {
  const myPlayerId = gameMap.myPlayerId;
  const myShipCount = gameMap.myShips.length;
  const enemyShipCount = gameMap.enemyShips.length;
  const emptyPlanets = gameMap.planets.map(planet => {
    if (planet.isOwnedByMe()) {
      myPlanetCount++;
    }
  })
  gameMap.allShips(ship => {
    if (ship.ownerId === myPlayerId) {
      // my ship

    }
  })
}