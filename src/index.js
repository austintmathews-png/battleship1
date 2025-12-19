import readlineSync from "readline-sync";
import Gameboard from "./models/Gameboard.js";
import Ship from "./models/Ship.js";

function parseCoordinate(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const m1 = raw.match(/^\s*(\d+)\s*,\s*(\d+)\s*$/);
  if (m1) {
    return { x: Number(m1[1]), y: Number(m1[2]) };
  }

  const m2 = raw.match(/^\s*([a-jA-J])\s*(10|[0-9])\s*$/);
  if (m2) {
    const x = m2[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
    const y = Number(m2[2]);
    return { x, y };
  }

  return null;
}

function setupBoard() {
  const board = new Gameboard(10);

  board.placeShip(new Ship(5), 0, 0, false);
  board.placeShip(new Ship(4), 2, 2, true);
  board.placeShip(new Ship(3), 5, 6, false);
  board.placeShip(new Ship(3), 8, 1, true);
  board.placeShip(new Ship(2), 7, 9, false);

  return board;
}

function main() {
  const board = setupBoard();

  console.log("Battleship (terminal)\n");
  console.log("Enter coordinates as 'x,y' (e.g. 3,4) or 'A5'. Type 'q' to quit.\n");

  while (true) {
    console.log(board.render({ revealShips: false }));

    const input = readlineSync.question("\nAttack coordinate: ");
    if (input.trim().toLowerCase() === "q") {
      console.log("Goodbye.");
      break;
    }

    const coord = parseCoordinate(input);
    if (!coord) {
      console.log("Invalid coordinate format. Try 'x,y' or 'A5'.\n");
      continue;
    }

    const result = board.receiveAttack(coord.x, coord.y);
    if (!result.ok) {
      if (result.reason === "out_of_bounds") {
        console.log("Out of bounds. Use 0-9 for x and y (or A-J and 0-9).\n");
      } else if (result.reason === "already_attacked") {
        console.log("You already attacked that coordinate.\n");
      } else {
        console.log("Invalid move.\n");
      }
      continue;
    }

    if (result.result === "miss") console.log("Miss.\n");
    if (result.result === "hit") console.log("Hit!\n");
    if (result.result === "sunk") console.log("You sunk a ship!\n");

    if (board.allShipsSunk()) {
      console.log(board.render({ revealShips: true }));
      console.log("\nYou win! All ships sunk.");
      break;
    }
  }
}

main();
