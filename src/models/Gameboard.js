export default class Gameboard {
  constructor(size = 10) {
    this.size = size;
    this.grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ ship: null, hit: false }))
    );
    this.ships = [];
    this.placements = [];
  }

  inBounds(x, y) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < this.size &&
      y >= 0 &&
      y < this.size
    );
  }

  placeShip(ship, x, y, isVertical) {
    if (!ship || typeof ship.length !== "number") {
      throw new Error("placeShip requires a Ship instance");
    }

    if (!this.inBounds(x, y)) return false;

    const coords = [];
    for (let i = 0; i < ship.length; i += 1) {
      const cx = isVertical ? x : x + i;
      const cy = isVertical ? y + i : y;
      if (!this.inBounds(cx, cy)) return false;
      coords.push([cx, cy]);
    }

    for (const [cx, cy] of coords) {
      if (this.grid[cy][cx].ship) return false;
    }

    for (const [cx, cy] of coords) {
      this.grid[cy][cx].ship = ship;
    }

    this.ships.push(ship);
    ship.placement = {
      x,
      y,
      isVertical: Boolean(isVertical),
      coords: coords.map(([cx, cy]) => ({ x: cx, y: cy })),
    };
    this.placements.push({ ship, ...ship.placement });
    return true;
  }

  receiveAttack(x, y) {
    if (!this.inBounds(x, y)) {
      return { ok: false, reason: "out_of_bounds" };
    }

    const cell = this.grid[y][x];

    if (cell.hit) {
      return { ok: false, reason: "already_attacked" };
    }

    cell.hit = true;

    if (!cell.ship) {
      return { ok: true, result: "miss" };
    }

    cell.ship.hit();

    if (cell.ship.sunk) {
      return {
        ok: true,
        result: "sunk",
        ship: cell.ship,
        coords: cell.ship.placement?.coords || null,
      };
    }

    return {
      ok: true,
      result: "hit",
      ship: cell.ship,
    };
  }

  allShipsSunk() {
    return this.ships.length > 0 && this.ships.every((s) => s.sunk);
  }

  render({ revealShips = false } = {}) {
    const header = "   " + Array.from({ length: this.size }, (_, i) => String(i).padStart(2, " ")).join(" ");

    const lines = [header];

    for (let y = 0; y < this.size; y += 1) {
      const row = [];
      for (let x = 0; x < this.size; x += 1) {
        const cell = this.grid[y][x];
        if (!cell.hit) {
          if (revealShips && cell.ship) row.push(" S");
          else row.push(" .");
        } else if (!cell.ship) {
          row.push(" o");
        } else {
          row.push(" X");
        }
      }
      lines.push(String(y).padStart(2, " ") + " " + row.join(""));
    }

    return lines.join("\n");
  }
}
